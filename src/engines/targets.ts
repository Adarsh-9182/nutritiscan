// Nutrition Engine (client-safe slice) — daily target computation.
// Mifflin-St Jeor for BMR; standard activity multipliers; the calorie goal is
// derived from the user's chosen direction + weekly pace, not a flat guess.

export type Sex = "male" | "female" | "other";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type GoalDirection = "lose" | "maintain" | "gain";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Energy density of body-mass change. ~7700 kcal per kg → per-day adjustment
// for a given kg/week pace.
const KCAL_PER_KG = 7700;

export interface TargetInput {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goalDirection: GoalDirection;
  /** Magnitude of desired weekly change in kg (>= 0). Ignored when maintaining. */
  weeklyPaceKg: number;
}

export interface DailyTargets {
  calories: number;
  proteinG: number;
  waterMl: number;
  sleepMin: number;
}

export function computeTargets(input: TargetInput): DailyTargets {
  const {
    age,
    sex,
    heightCm,
    weightKg,
    activityLevel,
    goalDirection,
    weeklyPaceKg,
  } = input;

  // Mifflin-St Jeor. For "other", average the male/female constants.
  const sexConstant = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
  const tdee = bmr * ACTIVITY_MULTIPLIER[activityLevel];

  // Convert the weekly pace into a daily calorie delta.
  const dailyDelta =
    goalDirection === "maintain"
      ? 0
      : (Math.max(0, weeklyPaceKg) * KCAL_PER_KG) / 7;

  let calories = tdee;
  if (goalDirection === "lose") calories = tdee - dailyDelta;
  else if (goalDirection === "gain") calories = tdee + dailyDelta;

  // Never prescribe an unsafe floor, and never let a deficit exceed the TDEE.
  calories = Math.max(1200, Math.round(calories / 10) * 10);

  // Protein: 1.6 g/kg baseline; 2.0 g/kg when actively losing or gaining
  // (higher protein preserves lean mass in a deficit, supports growth in a surplus).
  const proteinPerKg = goalDirection === "maintain" ? 1.6 : 2.0;
  const proteinG = Math.round(weightKg * proteinPerKg);

  // Water: ~35 ml/kg, clamped to a sensible range.
  const waterMl = Math.min(4000, Math.max(1500, Math.round(weightKg * 35)));

  return { calories, proteinG, waterMl, sleepMin: 480 };
}
