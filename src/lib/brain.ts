import type { Turn } from "@/domain/conversation";

/**
 * The mobile build currently has no authenticated health-answer service.
 * Keep an on-device, explicit capability response here instead of returning
 * personalized medical claims from the old example profile.
 */
let sequence = 0;

export function askDemoBrain(question: string): Turn {
  const urgent = /(can't breathe|cannot breathe|chest pain|suicid|kill myself|stroke|severe bleeding|unconscious|passing out)/i.test(question);
  return {
    id: `local-${Date.now()}-${sequence++}`,
    role: "assistant",
    text: urgent
      ? "**This may need urgent help.** Please contact your local emergency service or go to the nearest emergency department now. I can't assess an emergency in this app."
      : "I haven't sent your message or health details to an AI service. This mobile build doesn't have its health-answer service connected yet, so I can't interpret symptoms, reports, medicines, or personal nutrition needs. You can still save meals and profile notes on this device. For personal medical advice, ask a licensed clinician.",
  };
}
