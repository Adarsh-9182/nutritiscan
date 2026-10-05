export type MealLog = {
  id: string;
  name: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  source?: "manual" | "label";
  barcode?: string;
  note?: string;
  loggedAt: string;
};

export type DaySummary = {
  key: string;
  label: string;
  meals: MealLog[];
  calories: number;
  caloriesCount: number;
  proteinG: number;
  proteinCount: number;
};

export function localDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function isToday(isoDate: string, now = new Date()) {
  const date = new Date(isoDate);
  return Number.isFinite(date.getTime()) && localDateKey(date) === localDateKey(now);
}

export function summarizeDay(meals: readonly MealLog[], date = new Date()): DaySummary {
  const key = localDateKey(date);
  const entries = meals.filter((meal) => {
    const loggedAt = new Date(meal.loggedAt);
    return Number.isFinite(loggedAt.getTime()) && localDateKey(loggedAt) === key;
  });
  return {
    key,
    label: date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
    meals: entries,
    calories: entries.reduce((sum, meal) => sum + (meal.calories ?? 0), 0),
    caloriesCount: entries.filter((meal) => meal.calories !== undefined).length,
    proteinG: entries.reduce((sum, meal) => sum + (meal.proteinG ?? 0), 0),
    proteinCount: entries.filter((meal) => meal.proteinG !== undefined).length,
  };
}

export function summarizeDays(meals: readonly MealLog[], count = 7, now = new Date()): DaySummary[] {
  if (!Number.isInteger(count) || count < 1 || count > 366) throw new Error("Day count must be an integer between 1 and 366.");
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (count - 1 - index));
    return summarizeDay(meals, date);
  });
}

export function parseOptionalNutrition(raw: string, label: string, max = 10000): number | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) throw new Error(`${label} should be a number, such as 120 or 12.5.`);
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || value > max) throw new Error(`${label} should be a number from 0 to ${max.toLocaleString("en-US")}.`);
  return Math.round(value * 10) / 10;
}

export function mealDate(date: string, time: string, now = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("Use a date like 2026-10-04 and a time like 13:30.");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  if (year < 2000 || localDateKey(value) !== date || hour > 23 || minute > 59) throw new Error("Enter a valid meal date and time.");
  if (value.getTime() > now.getTime() + 60_000) throw new Error("A meal cannot be logged in the future.");
  return value.toISOString();
}
