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

// ---------------------------------------------------------------------------
// Medical Report Analysis
// ---------------------------------------------------------------------------

export type BiomarkerStatus = "low" | "normal" | "high" | "critical" | "unknown";

export interface Biomarker {
  name: string;
  category: string | null;
  value: string;
  unit: string | null;
  reference_range: {
    low: number | null;
    high: number | null;
    text: string | null;
  };
  status: BiomarkerStatus;
  explanation: string;
}

export interface ReportAnalysis {
  report_title: string;
  report_date: string | null;
  biomarkers: Biomarker[];
  summary: string;
  flags: string | null;
  confidence: "high" | "medium" | "low";
  clarifying_question: string | null;
}

/** Analyze a photo of a medical report (base64 JPEG). */
export async function analyzeReport(
  imageBase64: string,
): Promise<ReportAnalysis> {
  const headers = await authHeaders();
  const response = await fetch(`${FUNCTIONS_URL}/analyze-report`, {
    method: "POST",
    headers,
    body: JSON.stringify({ image: imageBase64 }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Analysis failed");
  return body as ReportAnalysis;
}

/**
 * Persist an analyzed report into the user's health record: one report row plus
 * a biomarker row per measurement (the longitudinal spine for future phases).
 */
export async function saveReport(analysis: ReportAnalysis): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Not signed in");

  const { data: report, error: reportError } = await supabase
    .from("medical_reports")
    .insert({
      user_id: userId,
      title: analysis.report_title,
      report_date: analysis.report_date,
      summary: analysis.summary,
      flags: analysis.flags,
      confidence: analysis.confidence,
    })
    .select("id")
    .single();
  if (reportError) throw new Error(reportError.message);

  if (analysis.biomarkers.length > 0) {
    const rows = analysis.biomarkers.map((b) => ({
      report_id: report.id,
      user_id: userId,
      name: b.name,
      category: b.category,
      value: b.value,
      unit: b.unit,
      ref_low: b.reference_range.low,
      ref_high: b.reference_range.high,
      ref_text: b.reference_range.text,
      status: b.status,
      explanation: b.explanation,
      measured_at: analysis.report_date,
    }));
    const { error: bioError } = await supabase.from("biomarkers").insert(rows);
    if (bioError) throw new Error(bioError.message);
  }
}

export interface ReportSummary {
  id: string;
  title: string;
  reportDate: string | null;
  createdAt: Date;
  confidence: "high" | "medium" | "low" | null;
  flags: string | null;
}

/** List the user's saved reports, newest first. */
export async function fetchReports(): Promise<ReportSummary[]> {
  const { data, error } = await supabase
    .from("medical_reports")
    .select("id, title, report_date, created_at, confidence, flags")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    reportDate: r.report_date,
    createdAt: new Date(r.created_at),
    confidence: r.confidence,
    flags: r.flags,
  }));
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
