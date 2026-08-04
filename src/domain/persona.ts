// ============================================================
// THE PERSON THE PRODUCT IS BUILT AROUND
//
// Dev Raman, 34 — gluten-sensitive, low-normal ferritin, LDL
// trending up. Everything the app says about him is derived from
// the values here or from ./labs. Nothing is hard-coded prose in
// a screen.
//
// WHY THAT MATTERS: the fastest way to build a health product
// that lies is to write "Your iron is low" into JSX. The moment
// the number changes, the sentence doesn't. Every claim in this
// app is computed from data that lives in this folder, so a
// changed value changes the sentence too.
// ============================================================

export type Goal = { id: string; label: string; marker?: string };

export type Person = {
  name: string;
  initials: string;
  age: number;
  heightCm: number;
  weightKg: number;
  /** Hard dietary constraints. These gate every meal the planner may suggest. */
  restrictions: string[];
  conditions: string[];
  goals: Goal[];
  goalsReviewed: string; // ISO
};

export const DEV: Person = {
  name: "Dev Raman",
  initials: "DR",
  age: 34,
  heightCm: 178,
  weightKg: 71.2,
  restrictions: ["Gluten", "Lactose"],
  conditions: [],
  goals: [
    { id: "ferritin-up", label: "Raise ferritin", marker: "ferritin" },
    { id: "ldl-down", label: "Lower LDL", marker: "ldl" },
    { id: "weight-hold", label: "Hold weight" },
  ],
  goalsReviewed: "2026-07-14",
};

// ------------------------------------------------------------
// Self-reported and device-sourced series.
//
// Kept separate from labs because they differ in kind: a lab
// value is measured once by an instrument, these are noisy
// observations sampled daily. The UI labels them "self-reported"
// for exactly that reason — presenting a mood log with the same
// authority as a blood test is a category error.
// ------------------------------------------------------------

export type Series = { label: string; unit: string; points: { t: string; v: number }[] };

/** Energy through a typical day, 0–10, averaged over the logging window. */
export const ENERGY_CURVE: Series = {
  label: "Your energy, self-reported",
  unit: "/10",
  points: [
    { t: "8am", v: 7.1 },
    { t: "10am", v: 7.4 },
    { t: "12pm", v: 6.8 },
    { t: "2pm", v: 5.2 },
    { t: "4pm", v: 3.9 },
    { t: "6pm", v: 5.4 },
    { t: "8pm", v: 6.3 },
    { t: "10pm", v: 6.0 },
  ],
};

export const IRON_INTAKE: Series = {
  label: "Iron intake",
  unit: "mg",
  points: [
    { t: "W1", v: 8.9 },
    { t: "W2", v: 9.4 },
    { t: "W3", v: 11.8 },
    { t: "W4", v: 12.6 },
  ],
};

export const SLEEP: Series = {
  label: "Sleep",
  unit: "h",
  points: [
    { t: "W1", v: 6.9 },
    { t: "W2", v: 6.4 },
    { t: "W3", v: 6.1 },
    { t: "W4", v: 6.2 },
  ],
};

export const WEIGHT: Series = {
  label: "Weight",
  unit: "kg",
  points: [
    { t: "W1", v: 71.6 },
    { t: "W2", v: 71.0 },
    { t: "W3", v: 71.4 },
    { t: "W4", v: 71.2 },
  ],
};

/** Days in the last month the user logged an afternoon energy dip. */
export const FATIGUE_DAYS_LOGGED = 11;

/** Averaged daily iron from the last three days of logged meals. */
export const IRON_3DAY_AVG = 9;
/** The useful daily target for someone with Dev's ferritin. */
export const IRON_TARGET = 14;

export const PROTEIN_TARGET = 115;

/** Formats 6.2 hours as "6h 12m". */
export function hoursLabel(h: number): string {
  const whole = Math.floor(h);
  return `${whole}h ${String(Math.round((h - whole) * 60)).padStart(2, "0")}m`;
}
