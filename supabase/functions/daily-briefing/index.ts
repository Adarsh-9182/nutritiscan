// Daily AI Briefing — generates one personalized briefing per user per day.
//
// POST /functions/v1/daily-briefing
// Body: { date: "YYYY-MM-DD" }  (the user's local date)
// Response: { briefing: string, cached: boolean }

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { buildUserContext } from "../_shared/prompts.ts";

const MODEL = "claude-opus-4-8";

const BRIEFING_PROMPT = `You are NutritiScan, an AI health companion. Write the user's daily morning briefing.

Rules:
- Warm, calm, encouraging tone. No shame, no guilt.
- 4 to 7 short lines. Each line is one actionable point or piece of encouragement.
- Cover, when relevant: today's calorie and protein targets, hydration, a concrete meal suggestion matching their food preference, movement or exercise, sleep.
- Personalize using their profile, goals, and memories. If data is missing, keep it general rather than inventing numbers.
- Plain text only. No markdown headings, no emoji spam (one subtle emoji max).
- Do not include any preamble like "Here is your briefing" — output the briefing directly.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { date } = await req.json();
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "date (YYYY-MM-DD) is required" }, 400);
    }

    // Return the cached briefing if one exists for this date
    const { data: existing } = await supabase
      .from("daily_briefings")
      .select("content")
      .eq("user_id", user.id)
      .eq("briefing_date", date)
      .maybeSingle();

    if (existing) {
      return json({ briefing: existing.content, cached: true });
    }

    const [profileRes, memoriesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("memories")
        .select("category, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100),
    ]);

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: BRIEFING_PROMPT,
      messages: [
        {
          role: "user",
          content: `${
            buildUserContext(profileRes.data, memoriesRes.data ?? [])
          }\n\nToday's date: ${date}\n\nWrite today's briefing.`,
        },
      ],
    });

    const briefing = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!briefing) return json({ error: "Empty briefing generated" }, 502);

    // Insert with the service role — users have read-only access to briefings.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("daily_briefings").upsert(
      { user_id: user.id, briefing_date: date, content: briefing },
      { onConflict: "user_id,briefing_date" },
    );

    return json({ briefing, cached: false });
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
