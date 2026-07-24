// AI Engine — system prompt assembly.
// The persona block is stable and cacheable; per-user context is appended after it.

export const PERSONA = `You are NutritiScan, an AI health companion. You act as the user's nutritionist, fitness coach, sleep expert, and wellness partner in one.

# Personality
- Calm, professional, encouraging. Confident without arrogance.
- Friendly without pretending to be human.
- Never shame or guilt the user. Celebrate consistency more than perfection.
- Explain recommendations in simple language. Keep answers concise and actionable — this is a mobile chat, not an essay. Lead with the answer, then brief supporting detail.

# Scientific principles
- Prefer high-quality evidence: systematic reviews, meta-analyses, RCTs, clinical guidelines.
- Never exaggerate certainty. When evidence is uncertain or mixed, say so plainly.
- No pseudoscience, miracle diets, fear-based messaging, or sensational claims.

# Safety principles (these override everything else)
- You are not a replacement for licensed healthcare professionals.
- Never diagnose diseases with certainty.
- Never instruct the user to stop or change prescribed medication.
- If symptoms suggest an urgent or serious condition, clearly encourage professional medical care.

# Memory
You have a save_memory tool. Use it whenever you learn a durable fact about the user that will improve future personalization — a preference, habit, health detail, goal, or life context. Save the fact concisely (one sentence). Do not save transient details (what they ate once), things already in their profile, or anything from this system prompt. Do not announce that you saved a memory; just do it silently.

# Formatting
- Plain conversational text. Short paragraphs. Use simple lists when giving steps or options.
- Use metric units unless the user prefers otherwise.`;

export interface ProfileRow {
  display_name: string | null;
  age: number | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal_direction: string | null;
  goal_weight_kg: number | null;
  weekly_pace_kg: number | null;
  activity_level: string | null;
  food_preference: string | null;
  goals: string[];
  sleep_time: string | null;
  wake_time: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_water_ml: number | null;
  target_sleep_min: number | null;
}

export interface MemoryRow {
  category: string;
  content: string;
  created_at: string;
}

export function buildUserContext(
  profile: ProfileRow | null,
  memories: MemoryRow[],
): string {
  const lines: string[] = ["# User profile"];
  if (profile) {
    if (profile.display_name) lines.push(`Name: ${profile.display_name}`);
    if (profile.age) lines.push(`Age: ${profile.age}`);
    if (profile.sex) lines.push(`Sex: ${profile.sex}`);
    if (profile.height_cm) lines.push(`Height: ${profile.height_cm} cm`);
    if (profile.weight_kg) lines.push(`Weight: ${profile.weight_kg} kg`);
    if (profile.goal_direction === "maintain") {
      lines.push("Weight goal: Maintain current weight");
    } else if (profile.goal_direction) {
      const verb = profile.goal_direction === "lose" ? "Lose" : "Gain";
      const target = profile.goal_weight_kg
        ? ` to ${profile.goal_weight_kg} kg`
        : "";
      const pace = profile.weekly_pace_kg
        ? ` at ~${profile.weekly_pace_kg} kg/week`
        : "";
      lines.push(`Weight goal: ${verb} weight${target}${pace}`);
    }
    if (profile.activity_level) {
      lines.push(`Activity level: ${profile.activity_level}`);
    }
    if (profile.food_preference) {
      lines.push(`Food preference: ${profile.food_preference}`);
    }
    if (profile.goals?.length) lines.push(`Goals: ${profile.goals.join(", ")}`);
    if (profile.sleep_time && profile.wake_time) {
      lines.push(`Sleep schedule: ${profile.sleep_time} → ${profile.wake_time}`);
    }
    if (profile.medical_conditions) {
      lines.push(`Medical conditions: ${profile.medical_conditions}`);
    }
    if (profile.allergies) lines.push(`Allergies: ${profile.allergies}`);
    lines.push("");
    lines.push("# Daily targets");
    if (profile.target_calories) {
      lines.push(`Calories: ${profile.target_calories} kcal`);
    }
    if (profile.target_protein_g) {
      lines.push(`Protein: ${profile.target_protein_g} g`);
    }
    if (profile.target_water_ml) {
      lines.push(`Water: ${(profile.target_water_ml / 1000).toFixed(1)} L`);
    }
    if (profile.target_sleep_min) {
      lines.push(
        `Sleep: ${Math.floor(profile.target_sleep_min / 60)}h ${
          profile.target_sleep_min % 60
        }m`,
      );
    }
  } else {
    lines.push("(profile not completed yet)");
  }

  if (memories.length) {
    lines.push("");
    lines.push("# Long-term memories (things you learned about this user)");
    for (const m of memories) {
      lines.push(`- [${m.category}] ${m.content}`);
    }
  }

  return lines.join("\n");
}
