// Medical Report Engine — extract and safely explain a photo of a medical report.
//
// POST /functions/v1/analyze-report
// Body: { image: string (base64 JPEG) }
// Response: {
//   report_title, report_date: string|null,
//   biomarkers: [{ name, category, value, unit, reference_range:{low,high,text},
//                  status: "low"|"normal"|"high"|"critical"|"unknown", explanation }],
//   summary, flags: string|null,
//   confidence: "high"|"medium"|"low",
//   clarifying_question: string|null
// }

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-opus-4-8";

const SYSTEM =
  `You are NutritiScan's medical report engine. Read the photo of a medical \
report (a blood panel, urinalysis, metabolic panel, or similar) and extract \
its results into structured data with plain-language explanations.

Rules:
- Extract every distinct measurement you can read as a biomarker: its name, its \
value exactly as printed (keep it as text — some results are "Positive", \
"Trace", or "<0.01", not numbers), its unit, and the reference range.
- For the reference range, fill reference_range.low and reference_range.high \
when the range is numeric (e.g. 13.5–17.5). When the range is not numeric \
(e.g. "Negative"), put it in reference_range.text and leave low/high null.
- Set status by comparing the value to the reference range:
  - "normal": within range
  - "low" / "high": outside range but not alarming
  - "critical": far outside range in a way that typically warrants prompt \
medical attention
  - "unknown": no reference range is printed, or the value can't be compared
- explanation: one or two plain sentences a non-expert can understand — what \
the marker is and what this result may indicate. Describe, never diagnose.
- category: group the marker (e.g. "Hematology", "Lipids", "Liver", "Kidney", \
"Metabolic", "Thyroid", "Vitamins").
- report_title: a short label for the panel, e.g. "Complete Blood Count".
- report_date: the collection/report date printed on the report as YYYY-MM-DD, \
or null if not visible.
- summary: a short, calm, plain-language overview of the overall picture.
- flags: a brief note of the results most worth discussing with a doctor, or \
null if everything is within range.

SAFETY (these override everything else):
- You are not a doctor and this is not a diagnosis. Never state or imply that \
the user has a specific disease.
- Never recommend starting, stopping, or changing any medication.
- Frame everything as information to review with a licensed healthcare \
professional. If any result looks critical, say clearly that they should seek \
professional medical advice.
- Do not invent values you cannot read. If the image is unreadable or is not a \
medical report, return an empty biomarkers array, a summary saying so, \
confidence "low", and a clarifying_question asking for a clearer photo of a \
medical report.

Set confidence honestly based on how clearly you can read the report. If it is \
not high, write ONE short clarifying_question that would help (e.g. "Could you \
retake the photo with the reference-range column in frame?"). Otherwise set \
clarifying_question to null.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    report_title: { type: "string" },
    report_date: { type: ["string", "null"] },
    biomarkers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: ["string", "null"] },
          value: { type: "string" },
          unit: { type: ["string", "null"] },
          reference_range: {
            type: "object",
            properties: {
              low: { type: ["number", "null"] },
              high: { type: ["number", "null"] },
              text: { type: ["string", "null"] },
            },
            required: ["low", "high", "text"],
            additionalProperties: false,
          },
          status: {
            type: "string",
            enum: ["low", "normal", "high", "critical", "unknown"],
          },
          explanation: { type: "string" },
        },
        required: [
          "name",
          "category",
          "value",
          "unit",
          "reference_range",
          "status",
          "explanation",
        ],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
    flags: { type: ["string", "null"] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    clarifying_question: { type: ["string", "null"] },
  },
  required: [
    "report_title",
    "report_date",
    "biomarkers",
    "summary",
    "flags",
    "confidence",
    "clarifying_question",
  ],
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

    const { image } = await req.json();
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
        text: "Read this medical report and extract its results.",
      },
    ];

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "The report couldn't be analyzed." }, 422);
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
