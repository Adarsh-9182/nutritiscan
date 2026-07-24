// Client for the AI edge functions. Zero business logic — transport only.

import { fetch as expoFetch } from "expo/fetch";
import { FUNCTIONS_URL, supabase } from "./supabase";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export interface StreamCallbacks {
  onMeta?: (conversationId: string) => void;
  onText: (delta: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * Send a chat message and stream the assistant reply.
 * Uses expo/fetch, which supports streaming response bodies on native.
 */
export async function streamChat(
  message: string,
  conversationId: string | null,
  callbacks: StreamCallbacks,
): Promise<void> {
  try {
    const headers = await authHeaders();
    const response = await expoFetch(`${FUNCTIONS_URL}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message,
        conversation_id: conversationId ?? undefined,
      }),
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Request failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event.trim();
        if (!line.startsWith("data:")) continue;
        let payload: {
          type: string;
          text?: string;
          conversation_id?: string;
          message?: string;
        };
        try {
          payload = JSON.parse(line.slice(5).trim());
        } catch {
          continue;
        }
        switch (payload.type) {
          case "meta":
            if (payload.conversation_id) {
              callbacks.onMeta?.(payload.conversation_id);
            }
            break;
          case "text":
            if (payload.text) callbacks.onText(payload.text);
            break;
          case "done":
            callbacks.onDone();
            return;
          case "error":
            callbacks.onError(payload.message ?? "Something went wrong");
            return;
        }
      }
    }
    // Stream ended without an explicit done event
    callbacks.onDone();
  } catch (err) {
    callbacks.onError(
      err instanceof Error ? err.message : "Something went wrong",
    );
  }
}

// ---------------------------------------------------------------------------
// Food Recognition
// ---------------------------------------------------------------------------

export interface FoodItem {
  name: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodAnalysis {
  meal_name: string;
  items: FoodItem[];
  total: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  confidence: "high" | "medium" | "low";
  clarifying_question: string | null;
}

/** Analyze a meal photo (base64 JPEG). Optionally pass a user correction. */
export async function analyzeFood(
  imageBase64: string,
  correction?: string,
): Promise<FoodAnalysis> {
  const headers = await authHeaders();
  const response = await fetch(`${FUNCTIONS_URL}/analyze-food`, {
    method: "POST",
    headers,
    body: JSON.stringify({ image: imageBase64, correction }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Analysis failed");
  return body as FoodAnalysis;
}

/** Persist an analyzed meal to the log. */
export async function logMeal(analysis: FoodAnalysis): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Not signed in");

  const { error } = await supabase.from("meals").insert({
    user_id: userId,
    name: analysis.meal_name,
    items: analysis.items,
    calories: Math.round(analysis.total.calories),
    protein_g: analysis.total.protein_g,
    carbs_g: analysis.total.carbs_g,
    fat_g: analysis.total.fat_g,
    confidence: analysis.confidence,
    source: "scan",
  });
  if (error) throw new Error(error.message);
}

export interface TodayIntake {
  calories: number;
  proteinG: number;
  mealCount: number;
}

/** Sum today's logged meals (local midnight onward). */
export async function fetchTodayIntake(): Promise<TodayIntake> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("meals")
    .select("calories, protein_g")
    .gte("logged_at", start.toISOString());
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return {
    calories: rows.reduce((sum, m) => sum + (m.calories ?? 0), 0),
    proteinG: rows.reduce((sum, m) => sum + Number(m.protein_g ?? 0), 0),
    mealCount: rows.length,
  };
}

/** Fetch (or generate) today's AI briefing. */
export async function fetchDailyBriefing(): Promise<string> {
  const headers = await authHeaders();
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const response = await fetch(`${FUNCTIONS_URL}/daily-briefing`, {
    method: "POST",
    headers,
    body: JSON.stringify({ date }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Failed to load briefing");
  return body.briefing as string;
}
