import type { HealthProfile, MedicalRecord } from "./healthData";

const LABELS = { visit: "Doctor visit", medication: "Medication", condition: "Condition", allergy: "Allergy", lab: "Test or report", procedure: "Procedure" } as const;
function displayDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }); }

/** A factual, deterministic appointment handout from user-entered fields; no model inference. */
export function buildDoctorSummary(profile: HealthProfile | null, records: MedicalRecord[], preparedAt = new Date()) {
  const lines = [
    "NUTRITISCAN · APPOINTMENT SUMMARY",
    `Prepared ${preparedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
    "",
    "Please review and correct this summary before sharing. It contains details you entered in NutritiScan; they have not been verified against clinic records. It is not a diagnosis or medical recommendation.",
    "",
    "PATIENT DETAILS",
    `Name: ${profile?.name || "Not recorded"}`,
    `Age: ${profile?.age ? `${profile.age} years` : "Not recorded"}`,
    `Allergies or food restrictions recorded: ${profile?.allergies.length ? profile.allergies.join(", ") : "None recorded in the app (this does not confirm that you have no allergies)."}`,
    `Conditions recorded: ${profile?.conditions.length ? profile.conditions.join(", ") : "None recorded in the app."}`,
    "",
    "PERSONAL HISTORY ENTRIES",
  ];
  if (!records.length) lines.push("No history entries recorded yet.");
  else for (const record of [...records].sort((a, b) => b.date.localeCompare(a.date))) {
    lines.push(`• ${displayDate(record.date)} · ${LABELS[record.kind]}: ${record.title}`);
    if (record.clinician) lines.push(`  Clinician: ${record.clinician}`);
    if (record.facility) lines.push(`  Facility: ${record.facility}`);
    if (record.notes) lines.push(`  Your note: ${record.notes}`);
  }
  return lines.join("\n");
}
