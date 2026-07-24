// AI Engine — conversational chat with streaming + long-term memory.
//
// POST /functions/v1/chat
// Body: { message: string, conversation_id?: string }
// Response: SSE stream of
//   data: {"type":"meta","conversation_id":"..."}
//   data: {"type":"text","text":"..."}         (many)
//   data: {"type":"done"}
//   data: {"type":"error","message":"..."}

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { buildUserContext, PERSONA } from "../_shared/prompts.ts";

const MODEL = "claude-opus-4-8";
const MAX_HISTORY_MESSAGES = 30;
const MAX_MEMORIES = 100;

const SAVE_MEMORY_TOOL: Anthropic.Tool = {
  name: "save_memory",
  description:
    "Save a durable fact about the user to long-term memory so future conversations are personalized. Call this when the user reveals a lasting preference, habit, health detail, goal, or life context. One concise sentence per memory. Do not save transient events or facts already in the profile.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["preference", "habit", "health", "goal", "context"],
        description: "The kind of fact being remembered.",
      },
      content: {
        type: "string",
        description: "The fact, as one concise sentence.",
      },
    },
    required: ["category", "content"],
    additionalProperties: false,
  },
  strict: true,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    // User-scoped client — RLS enforces per-user access on every query below.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { message, conversation_id } = await req.json();
    if (typeof message !== "string" || !message.trim()) {
      return json({ error: "message is required" }, 400);
    }

    // Resolve conversation
    let conversationId: string = conversation_id;
    if (!conversationId) {
      const title = message.trim().slice(0, 60);
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title })
        .select("id")
        .single();
      if (error) throw error;
      conversationId = data.id;
    }

    // Load context in parallel: profile, memories, history
    const [profileRes, memoriesRes, historyRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("memories")
        .select("category, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(MAX_MEMORIES),
      supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(MAX_HISTORY_MESSAGES),
    ]);

    // Persist the user message (after loading history so it isn't duplicated)
    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: message,
    });
    if (insertError) throw insertError;

    const history = (historyRes.data ?? []).reverse();
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m): Anthropic.MessageParam => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    // Stable persona block first (cacheable), volatile per-user context after.
    const system: Anthropic.TextBlockParam[] = [
      {
        type: "text",
        text: PERSONA,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: buildUserContext(profileRes.data, memoriesRes.data ?? []) +
          `\n\nToday's date: ${new Date().toISOString().slice(0, 10)}`,
      },
    ];

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        };

        send({ type: "meta", conversation_id: conversationId });

        let assistantText = "";
        try {
          // Manual agentic loop: stream text out, execute save_memory calls,
          // continue until Claude stops calling tools.
          let loopMessages = messages;
          for (let iteration = 0; iteration < 5; iteration++) {
            const claudeStream = anthropic.messages.stream({
              model: MODEL,
              max_tokens: 8192,
              thinking: { type: "adaptive" },
              system,
              tools: [SAVE_MEMORY_TOOL],
              messages: loopMessages,
            });

            claudeStream.on("text", (delta) => {
              assistantText += delta;
              send({ type: "text", text: delta });
            });

            const response = await claudeStream.finalMessage();

            if (response.stop_reason !== "tool_use") break;

            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of response.content) {
              if (block.type !== "tool_use") continue;
              let result = "Memory saved.";
              if (block.name === "save_memory") {
                const input = block.input as {
                  category: string;
                  content: string;
                };
                const { error } = await supabase.from("memories").insert({
                  user_id: user.id,
                  category: input.category,
                  content: input.content,
                });
                if (error) result = `Failed to save memory: ${error.message}`;
              } else {
                result = `Unknown tool: ${block.name}`;
              }
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: result,
              });
            }

            loopMessages = [
              ...loopMessages,
              { role: "assistant", content: response.content },
              { role: "user", content: toolResults },
            ];
          }

          // Persist the assistant reply
          if (assistantText.trim()) {
            await supabase.from("messages").insert({
              conversation_id: conversationId,
              user_id: user.id,
              role: "assistant",
              content: assistantText,
            });
          }

          send({ type: "done" });
        } catch (err) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Unexpected error",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
