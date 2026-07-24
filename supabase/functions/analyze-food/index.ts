// Food Recognition Engine — analyze a meal photo with Claude vision.
//
// POST /functions/v1/analyze-food
// Body: { image: string (base64 JPEG), correction?: string }
// Response: {
//   meal_name, items: [{name, portion, calories, protein_g, carbs_g, fat_g}],
//   total: {calories, protein_g, carbs_g, fat_g},
//   confidence: "high"|"medium"|"low",
//   clarifying_question: string | null
// }

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-opus-4-8";

const SYSTEM = `You are NutritiScan's food recognition engine. Analyze the photo of a meal and estimate its nutrition.

Rules:
- Identify each distinct food item, its approximate portion (in common-sense units like "1 cup", "150 g", "2 slices"), and estimated calories and macros for that portion.
- Estimates should reflect typical preparation unless the photo clearly shows otherwise (e.g. visible oil, cream sauce, frying).
- Never pretend certainty. Set confidence honestly:
  - "high": clearly identifiable foods with visible portions
  - "medium": identifiable foods but portion or preparation is uncertain
  - "low": ambiguous dishes, hidden ingredients, or unclear photo
- If confidence is not high, write ONE short clarifying question the user could answer to improve the estimate (e.g. "Is this cooked in butter or oil?"). Otherwise set clarifying_question to null.
- If the user provides a correction, treat it as ground truth and re-estimate.
- If the image is not food, return an empty items array, zero totals, confidence "low", and a clarifying question asking for a photo of a meal.
- meal_name is a short human-friendly label like "Grilled chicken with rice".
- Totals must equal the sum of the items (rounded).`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    meal_name: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          portion: { type: "string" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
        },
        required: ["name", "portion", "calories", "protein_g", "carbs_g", "fat_g"],
        additionalProperties: false,
      },
    },
    total: {
      type: "object",
      properties: {
        calories: { type: "number" },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
      },
      required: ["calories", "protein_g", "carbs_g", "fat_g"],
      additionalProperties: false,
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    clarifying_question: { type: ["string", "null"] },
  },
  required: ["meal_name", "items", "total", "confidence", "clarifying_question"],
  additionalProperties: false,
} as const;

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

    const { image, correction } = await req.json();
    if (typeof image !== "string" || image.length < 100) {
      return json({ error: "image (base64 JPEG) is required" }, 400);
    }

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const userContent: Anthropic.ContentBlockParam[] = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: image,
        },
      },
      {
        type: "text",
        text: correction
          ? `Analyze this meal. The user clarified: "${correction}"`
          : "Analyze this meal.",
      },
    ];

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "The image couldn't be analyzed." }, 422);
    }

    const text = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    )?.text;
    if (!text) return json({ error: "Empty analysis" }, 502);

    return json(JSON.parse(text));
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
