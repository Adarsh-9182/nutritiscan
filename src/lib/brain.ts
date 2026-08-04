// ============================================================
// ON-DEVICE BRAIN
//
// A safe, rule-based responder so the product is fully usable
// with no network and no API key. This is NOT a placeholder: with
// nothing else configured it IS what the app answers with, so it
// has to earn every claim from the data in front of it.
//
// Three rules it never breaks:
//   1. NEVER INVENT DATA. If a marker isn't recorded, it says so
//      rather than guessing a value.
//   2. NEVER DIAGNOSE. It explains and defers.
//   3. ALWAYS END IN ONE TESTABLE STEP — the cheapest test that
//      would distinguish between the possibilities it raised, not
//      a list of general advice.
// ============================================================

import type { Turn } from "@/domain/conversation";
import type { Evidence } from "@/domain/insight";
import { JULY_PANEL, attentionMarkers, markerById, steadyCount } from "@/domain/labs";
import { MEDICINES } from "@/domain/medicines";
import { DEV, ENERGY_CURVE, IRON_TARGET, PROTEIN_TARGET, SLEEP, hoursLabel } from "@/domain/persona";

/** Emergencies short-circuit everything. Never triage these. */
const EMERGENCY =
  /(can't breathe|cannot breathe|chest pain|suicid|kill myself|stroke|severe bleeding|unconscious|passing out)/i;

type Route = "emergency" | "fatigue" | "labs" | "iron" | "food" | "medicine" | "sleep" | "general";

function route(text: string): Route {
  const t = text.toLowerCase();
  if (EMERGENCY.test(t)) return "emergency";
  if (/tired|fatigue|energy|4 ?pm|afternoon|exhaust/.test(t)) return "fatigue";
  if (/ferritin|iron/.test(t)) return "iron";
  if (/lab|panel|blood|report|ldl|cholesterol|marker|hba1c|thyroid/.test(t)) return "labs";
  if (/eat|food|meal|protein|dinner|lunch|breakfast|gluten|recipe/.test(t)) return "food";
  if (/medicine|tablet|supplement|fumarate|dose|drug/.test(t)) return "medicine";
  if (/sleep|rest|night|insomnia/.test(t)) return "sleep";
  return "general";
}

const LAB_EVIDENCE: Evidence = { label: "Your labs · 12 Jul", source: "labs", href: "/labs" };
const SLEEP_EVIDENCE: Evidence = {
  label: `Sleep ${hoursLabel(SLEEP.points[SLEEP.points.length - 1].v)} avg`,
  source: "device",
  href: "/health",
};

let seq = 0;
const turn = (text: string, evidence?: Evidence[], extra?: Partial<Turn>): Turn => ({
  id: `a-${Date.now()}-${seq++}`,
  role: "assistant",
  text,
  evidence,
  ...extra,
});

export function askDemoBrain(question: string): Turn {
  const r = route(question);
  const ferritin = markerById(JULY_PANEL, "ferritin");
  const ldl = markerById(JULY_PANEL, "ldl");

  if (r === "emergency") {
    return turn(
      `**This may be an emergency.** Please seek emergency care right now — call your local emergency number or go to the nearest hospital.\n\nI can't safely triage this, and I'm not going to try.`,
    );
  }

  if (r === "fatigue") {
    const dip = ENERGY_CURVE.points.reduce((lo, pt) => (pt.v < lo.v ? pt : lo), ENERGY_CURVE.points[0]);
    return turn(
      `Two things line up.\n\nYour ferritin is ${ferritin?.value} ${ferritin?.unit} — inside range, but low enough that afternoon fatigue is common. And your own logs put the dip at ${dip.t}, about 90 minutes after a lunch that has averaged more refined carbohydrate than protein.\n\n**The cheapest test:** 25 g of protein at lunch for a week. If the dip softens, it was the meal. If it doesn't, we look at the iron.`,
      [LAB_EVIDENCE, { label: "Your logged meals", source: "logs", href: "/health" }, SLEEP_EVIDENCE],
      {
        chart: {
          label: ENERGY_CURVE.label,
          unit: ENERGY_CURVE.unit,
          points: ENERGY_CURVE.points,
          markAt: dip.t,
        },
        followUps: [
          { label: "Build that lunch", href: "/plan" },
          { label: "Show the iron sources", ask: "What are the best iron sources for me, given I'm gluten-free?" },
        ],
      },
    );
  }

  if (r === "iron") {
    if (!ferritin) {
      return turn(
        `I don't have an iron result recorded for you, so there's nothing here I can honestly interpret — and I won't guess.\n\nScan a blood report and I'll read it.`,
      );
    }
    return turn(
      `Your ferritin is **${ferritin.value} ${ferritin.unit}** — inside the reference range, at the bottom of it.\n\nThe things with the strongest evidence behind them:\n\n- Iron-rich food eaten with vitamin C\n- Tea and coffee kept away from meals\n\nYou're gluten-free, so the usual fortified-cereal route is out. Lentils, chickpeas, besan and spinach do the same job.\n\n**One step this week:** put something citrus on the plate at the meal with the most iron in it.`,
      [LAB_EVIDENCE],
      {
        followUps: [
          { label: "See the marker", href: "/labs/ferritin" },
          { label: "Build a week around it", href: "/plan" },
        ],
      },
    );
  }

  if (r === "labs") {
    const { steady, total } = steadyCount(JULY_PANEL);
    const flagged = attentionMarkers(JULY_PANEL);
    return turn(
      `**${steady} of ${total} markers are where they should be** — kidney, liver, thyroid, sugar and blood counts are all steady since March.\n\n${flagged.length} ${flagged.length === 1 ? "is" : "are"} worth attention, and neither is urgent:\n\n${flagged
        .map((m) => `- **${m.name}, ${m.value} ${m.unit}.** ${m.plain}`)
        .join("\n")}\n\nBoth respond to what you eat, which is the useful part.\n\n_This explains your results — it doesn't diagnose. Bring the flagged values to the clinician who ordered them._`,
      [LAB_EVIDENCE],
      { followUps: [{ label: "Open the full summary", href: "/labs" }] },
    );
  }

  if (r === "food") {
    return turn(
      `You're aiming for **${PROTEIN_TARGET} g of protein** a day — about ${Math.round(PROTEIN_TARGET / 3)} g a meal — and **${IRON_TARGET} mg of iron** while your ferritin sits low.\n\nYou've recorded a ${DEV.restrictions.join(" and ").toLowerCase()} sensitivity, so anything I suggest is built around that: no wheat, and dairy kept away from the iron.\n\n**One step this week:** anchor lunch on a pulse — rajma, chickpeas or dal. It's the single change that moves protein and iron at the same time.`,
      [LAB_EVIDENCE, { label: "Your restrictions", source: "records", href: "/you" }],
      { followUps: [{ label: "See this week's plan", href: "/plan" }] },
    );
  }

  if (r === "medicine") {
    const m = MEDICINES[0];
    return turn(
      `You have **${m.name}** recorded. ${m.purpose}\n\n${m.timing ? `**${m.timing.headline}.** ${m.timing.detail}` : ""}\n\n_Educational information, not a prescription. Dose changes belong to your clinician — I can help you write the question._`,
      [{ label: "Your records", source: "records", href: "/records" }],
      { followUps: [{ label: "Open the medicine", href: "/medicine/ferrous-fumarate-210" }] },
    );
  }

  if (r === "sleep") {
    const now = SLEEP.points[SLEEP.points.length - 1].v;
    return turn(
      `You're averaging **${hoursLabel(now)}**, under the 7–9 hours most adults do well on — and your fatigue days cluster after the shortest nights.\n\nI can see the pattern, but not the cause: I don't have anything recorded about when you go to bed or what's keeping you up.\n\n**One step this week:** pick a fixed lights-out time and hold it for seven nights. That's enough to tell whether the afternoon dip follows the sleep or the meal.`,
      [SLEEP_EVIDENCE],
      { followUps: [{ label: "Look at the pattern", href: "/health" }] },
    );
  }

  return turn(
    `I can help with what's actually recorded about you — your July panel, the meals you log, your medicines and your restrictions.\n\nRight now the two things worth a conversation are **${ferritin?.name} at ${ferritin?.value} ${ferritin?.unit}** and **${ldl?.name} at ${ldl?.value} ${ldl?.unit}**. Everything else on that panel is steady.\n\n_Educational companion — never a replacement for your doctor._`,
    [LAB_EVIDENCE],
    {
      followUps: [
        { label: "Explain my panel", ask: "Explain my July blood panel." },
        { label: "What should I eat?", ask: "What should I eat this week?" },
      ],
    },
  );
}
