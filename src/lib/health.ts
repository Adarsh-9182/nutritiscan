// Data access for the health logs (water, weight, sleep) and daily
// aggregations that power the dashboard and Progress analytics.

import { computeTargets } from "@/engines/targets";
import { supabase } from "./supabase";
import type { Profile } from "./session";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}

/** Local-midnight Date `daysAgo` days back. */
function startOfDay(daysAgo = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/** 'YYYY-MM-DD' in local time — the grouping key for daily charts. */
function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface DayPoint {
  /** 'YYYY-MM-DD' local */
  date: string;
  /** Short weekday label, e.g. 'Mon' */
  label: string;
  value: number;
}

/** Zero-filled skeleton for the last `days` days, oldest first. */
function emptyDays(days: number): DayPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const d = startOfDay(days - 1 - i);
    return { date: localDateKey(d), label: WEEKDAYS[d.getDay()], value: 0 };
  });
}

function fillDays(
  days: number,
  rows: { at: Date; value: number }[],
): DayPoint[] {
  const points = emptyDays(days);
  const byDate = new Map(points.map((p) => [p.date, p]));
  for (const row of rows) {
    const point = byDate.get(localDateKey(row.at));
    if (point) point.value += row.value;
  }
  return points;
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

export async function logWater(amountMl: number): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("water_logs")
    .insert({ user_id: userId, amount_ml: amountMl });
  if (error) throw new Error(error.message);
}

export async function fetchTodayWaterMl(): Promise<number> {
  const { data, error } = await supabase
    .from("water_logs")
    .select("amount_ml")
    .gte("logged_at", startOfDay().toISOString());
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, r) => sum + (r.amount_ml ?? 0), 0);
}

export async function fetchWaterByDay(days: number): Promise<DayPoint[]> {
  const { data, error } = await supabase
    .from("water_logs")
    .select("amount_ml, logged_at")
    .gte("logged_at", startOfDay(days - 1).toISOString());
  if (error) throw new Error(error.message);
  return fillDays(
    days,
    (data ?? []).map((r) => ({
      at: new Date(r.logged_at),
      value: r.amount_ml ?? 0,
    })),
  );
}

// ---------------------------------------------------------------------------
// Weight
// ---------------------------------------------------------------------------

export interface WeightEntry {
  /** 'YYYY-MM-DD' local */
  date: string;
  weightKg: number;
}

/**
 * Log a weight entry. Also updates the profile's current weight and — when
 * the profile has everything the Nutrition Engine needs — recomputes daily
 * targets, so a changing body keeps honest numbers.
 */
export async function logWeight(
  weightKg: number,
  profile: Profile | null,
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("weight_logs")
    .insert({ user_id: userId, weight_kg: weightKg });
  if (error) throw new Error(error.message);

  const update: Record<string, unknown> = { weight_kg: weightKg };
  if (
    profile?.age &&
    profile.sex &&
    profile.height_cm &&
    profile.activity_level
  ) {
    const direction = profile.goal_direction ?? "maintain";
    const targets = computeTargets({
      age: profile.age,
      sex: profile.sex,
      heightCm: profile.height_cm,
      weightKg,
      activityLevel: profile.activity_level,
      goalDirection: direction,
      weeklyPaceKg: direction === "maintain" ? 0 : profile.weekly_pace_kg ?? 0,
    });
    update.target_calories = targets.calories;
    update.target_protein_g = targets.proteinG;
    update.target_water_ml = targets.waterMl;
  }
  const { error: profileError } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", userId);
  if (profileError) throw new Error(profileError.message);
}

/** Weight entries in the last `days` days, oldest first (one per day, latest wins). */
export async function fetchWeightHistory(days: number): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg, logged_at")
    .gte("logged_at", startOfDay(days - 1).toISOString())
    .order("logged_at", { ascending: true });
  if (error) throw new Error(error.message);

  const byDate = new Map<string, number>();
  for (const row of data ?? []) {
    byDate.set(localDateKey(new Date(row.logged_at)), Number(row.weight_kg));
  }
  return [...byDate.entries()].map(([date, weightKg]) => ({ date, weightKg }));
}

// ---------------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------------

/** Log last night's sleep (the night ending today). Re-logging replaces it. */
export async function logSleep(sleptMin: number): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("sleep_logs").upsert(
    {
      user_id: userId,
      slept_min: sleptMin,
      sleep_date: localDateKey(new Date()),
    },
    { onConflict: "user_id,sleep_date" },
  );
  if (error) throw new Error(error.message);
}

export async function fetchSleepByDay(days: number): Promise<DayPoint[]> {
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("slept_min, sleep_date")
    .gte("sleep_date", localDateKey(startOfDay(days - 1)));
  if (error) throw new Error(error.message);

  const points = emptyDays(days);
  const byDate = new Map(points.map((p) => [p.date, p]));
  for (const row of data ?? []) {
    const point = byDate.get(row.sleep_date);
    if (point) point.value = row.slept_min ?? 0;
  }
  return points;
}

// ---------------------------------------------------------------------------
// Meals — daily history and today's diary
// ---------------------------------------------------------------------------

export interface IntakeDay {
  date: string;
  label: string;
  calories: number;
  proteinG: number;
}

/** Calories and protein per local day for the last `days` days, oldest first. */
export async function fetchIntakeByDay(days: number): Promise<IntakeDay[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("calories, protein_g, logged_at")
    .gte("logged_at", startOfDay(days - 1).toISOString());
  if (error) throw new Error(error.message);

  const skeleton = emptyDays(days);
  const result: IntakeDay[] = skeleton.map((p) => ({
    date: p.date,
    label: p.label,
    calories: 0,
    proteinG: 0,
  }));
  const byDate = new Map(result.map((d) => [d.date, d]));
  for (const row of data ?? []) {
    const day = byDate.get(localDateKey(new Date(row.logged_at)));
    if (day) {
      day.calories += row.calories ?? 0;
      day.proteinG += Number(row.protein_g ?? 0);
    }
  }
  return result;
}

export interface MealEntry {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  loggedAt: Date;
}

export async function fetchTodayMeals(): Promise<MealEntry[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("id, name, calories, protein_g, logged_at")
    .gte("logged_at", startOfDay().toISOString())
    .order("logged_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    calories: r.calories ?? 0,
    proteinG: Number(r.protein_g ?? 0),
    loggedAt: new Date(r.logged_at),
  }));
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
