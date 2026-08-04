// ============================================================
// MEAL INTELLIGENCE
//
// Deterministic and keyless. A vision model's job is to say WHAT
// is on the plate; this module decides WHAT IT MEANS for the
// person eating it — which is the part that makes this
// NutritiScan and not a calorie counter.
//
// Every reason the verdict gives is tied to THIS user's own labs
// or restrictions. A reason that would be true for any human is
// not worth the line.
// ============================================================

import { JULY_PANEL, markerById } from "./labs";
import { DEV, IRON_TARGET, PROTEIN_TARGET } from "./persona";

export type Food = {
  id: string;
  name: string;
  /** Per 100 g. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  iron: number;
  /** A typical serving in grams. */
  serving: number;
  gluten?: boolean;
  dairy?: boolean;
  refined?: boolean;
};

const FOODS: Food[] = [
  { id: "rajma", name: "Rajma", kcal: 127, protein: 8.7, carbs: 22.8, fat: 0.5, fiber: 6.4, iron: 2.9, serving: 180 },
  { id: "rice", name: "White rice", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, iron: 0.2, serving: 150, refined: true },
  { id: "dal", name: "Dal", kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, iron: 3.3, serving: 180 },
  { id: "roti", name: "Roti", kcal: 264, protein: 9, carbs: 46, fat: 4, fiber: 5, iron: 2.5, serving: 45, gluten: true },
  { id: "millet-roti", name: "Millet roti", kcal: 250, protein: 8, carbs: 44, fat: 3, fiber: 6, iron: 3.9, serving: 45 },
  { id: "paneer", name: "Paneer", kcal: 296, protein: 18, carbs: 3.6, fat: 22, fiber: 0, iron: 0.3, serving: 100, dairy: true },
  { id: "tofu", name: "Tofu", kcal: 144, protein: 15, carbs: 3, fat: 9, fiber: 2, iron: 2.7, serving: 150 },
  { id: "curd", name: "Curd", kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, iron: 0.1, serving: 150, dairy: true },
  { id: "spinach", name: "Spinach", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, iron: 2.7, serving: 100 },
  { id: "egg", name: "Egg", kcal: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, iron: 1.2, serving: 50 },
  { id: "chicken", name: "Chicken", kcal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, iron: 1, serving: 120 },
  { id: "fish", name: "Fish", kcal: 128, protein: 22, carbs: 0, fat: 4, fiber: 0, iron: 1.1, serving: 150 },
  { id: "chickpea", name: "Chickpeas", kcal: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6, iron: 2.9, serving: 160 },
  { id: "quinoa", name: "Quinoa", kcal: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8, iron: 1.5, serving: 150 },
  { id: "besan", name: "Besan chilla", kcal: 180, protein: 11, carbs: 22, fat: 5, fiber: 5, iron: 2.6, serving: 120 },
  { id: "salad", name: "Salad", kcal: 25, protein: 1.2, carbs: 5, fat: 0.2, fiber: 2, iron: 0.6, serving: 100 },
  { id: "lemon", name: "Lemon", kcal: 29, protein: 1.1, carbs: 9, fat: 0.3, fiber: 2.8, iron: 0.6, serving: 20 },
];

export type MealItem = { food: Food; grams: number };

export type Verdict = {
  title: string;
  items: MealItem[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  iron: number;
  /** 0–100, how well this meal serves THIS user's goals. */
  score: number;
  /** The sentence. Always first on screen, before any number. */
  headline: string;
  /** Each tied to the user's own labs or restrictions. */
  reasons: { tone: "good" | "watch"; text: string }[];
  /** Exactly one suggested addition — a list of five is a menu. */
  suggestion?: { what: string; why: string };
};

const PER_MEAL_PROTEIN = Math.round(PROTEIN_TARGET / 3);
const PER_MEAL_IRON = Math.round((IRON_TARGET / 3) * 10) / 10;

/** Parse a plain description ("rajma chawal with salad") into items. */
export function parseMeal(text: string): MealItem[] {
  const t = text.toLowerCase();
  const items: MealItem[] = [];
  const seen = new Set<string>();

  for (const food of FOODS) {
    const key = food.name.toLowerCase().split(" ")[0];
    if (!t.includes(key) && !t.includes(food.id)) continue;
    if (seen.has(food.id)) continue;
    seen.add(food.id);
    items.push({ food, grams: food.serving });
  }
  return items;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Read a plate against the user's own memory.
 *
 * The score is not a grade of the food in the abstract — a bowl
 * of rajma scores differently for someone whose ferritin is fine.
 */
export function analyzeMeal(items: MealItem[], title: string): Verdict {
  const sum = (f: (i: MealItem) => number) => round(items.reduce((a, i) => a + f(i), 0));
  const per = (i: MealItem, key: keyof Food) => ((i.food[key] as number) * i.grams) / 100;

  const kcal = Math.round(items.reduce((a, i) => a + per(i, "kcal"), 0));
  const protein = sum((i) => per(i, "protein"));
  const carbs = sum((i) => per(i, "carbs"));
  const fat = sum((i) => per(i, "fat"));
  const fiber = sum((i) => per(i, "fiber"));
  const iron = sum((i) => per(i, "iron"));

  const ferritin = markerById(JULY_PANEL, "ferritin");
  const hasGluten = items.some((i) => i.food.gluten);
  const hasDairy = items.some((i) => i.food.dairy);
  const hasVitC = items.some((i) => i.food.id === "lemon" || i.food.id === "salad");

  const reasons: Verdict["reasons"] = [];

  // Iron, read against the user's actual ferritin.
  if (iron >= 3 && ferritin) {
    reasons.push({
      tone: "good",
      text: `${iron} mg of plant iron — about a third of today's target, and ${
        hasVitC ? "there's vitamin C on the plate, which helps absorption" : "pairing it with something citrus would help absorption"
      }.`,
    });
  } else if (ferritin) {
    reasons.push({
      tone: "watch",
      text: `Only ${iron} mg of iron. With ferritin at ${ferritin.value} ${ferritin.unit}, ${PER_MEAL_IRON} mg a meal is the useful shape.`,
    });
  }

  // Restrictions are facts about the user, not preferences.
  if (hasGluten && DEV.restrictions.includes("Gluten")) {
    reasons.push({ tone: "watch", text: "Contains wheat — you've recorded a gluten sensitivity." });
  } else if (!hasGluten) {
    reasons.push({
      tone: "good",
      text: `Naturally gluten-free, and ${fiber} g of fibre keeps the glucose curve flat.`,
    });
  }

  if (hasDairy && DEV.restrictions.includes("Lactose")) {
    reasons.push({ tone: "watch", text: "Contains dairy — you've recorded lactose sensitivity." });
  }

  // Protein against this user's per-meal share.
  const shortBy = Math.round(PER_MEAL_PROTEIN - protein);
  if (protein >= PER_MEAL_PROTEIN) {
    reasons.push({ tone: "good", text: `${protein} g protein — clears your ${PER_MEAL_PROTEIN} g per-meal share.` });
  } else {
    reasons.push({
      tone: "watch",
      text: `Protein lands at ${protein} g. You're ${shortBy} g short of your per-meal share.`,
    });
  }

  // Score, from what actually drove it.
  let score = 50;
  score += Math.min(25, (protein / PER_MEAL_PROTEIN) * 25);
  score += Math.min(12, iron * 3);
  score += Math.min(10, fiber * 1.2);
  if (hasGluten && DEV.restrictions.includes("Gluten")) score -= 25;
  if (items.some((i) => i.food.refined) && fiber < 4) score -= 8;
  score = Math.max(5, Math.min(99, Math.round(score)));

  const headline =
    hasGluten && DEV.restrictions.includes("Gluten")
      ? "I'd skip this one — it has wheat in it."
      : score >= 75
        ? "Good for you tonight — this is the shape of meal that moves your ferritin."
        : shortBy > 0
          ? "Good for you tonight — add one thing."
          : "Reasonable plate. Nothing to change.";

  const suggestion =
    shortBy > 0
      ? {
          what: DEV.restrictions.includes("Lactose") ? "Add 200 g tofu" : "Add 200 g curd or paneer",
          why: `+${Math.round(shortBy * 1.2)} g protein · closes the day at ${PROTEIN_TARGET} g`,
        }
      : undefined;

  return { title, items, kcal, protein, carbs, fat, fiber, iron, score, headline, reasons, suggestion };
}

/** The sample plate the scanner falls back to with no vision model. */
export const SAMPLE_MEAL = () => analyzeMeal(parseMeal("rajma rice salad lemon"), "Rajma chawal · 1 bowl");
