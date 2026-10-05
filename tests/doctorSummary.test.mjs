import assert from "node:assert/strict";
import test from "node:test";
import { buildDoctorSummary } from "../src/domain/doctorSummary.ts";

test("appointment summary uses entered values and labels missing allergy history as unknown", () => {
  const output = buildDoctorSummary({ name: "Test User", allergies: [], conditions: [], goals: [], age: undefined }, [
    { id: "r1", kind: "medication", title: "Medicine A", date: "2026-09-20", notes: "User note" },
    { id: "r2", kind: "lab", title: "Blood panel", date: "2026-10-01" },
  ], new Date("2026-10-05T12:00:00Z"));
  assert.match(output, /not been verified against clinic records/i);
  assert.match(output, /does not confirm that you have no allergies/i);
  assert.ok(output.indexOf("Blood panel") < output.indexOf("Medicine A"));
  assert.match(output, /Your note: User note/);
  assert.doesNotMatch(output, /diagnosis:|recommended treatment:/i);
});

test("empty appointment summary does not invent history", () => {
  const output = buildDoctorSummary(null, [], new Date("2026-10-05T12:00:00Z"));
  assert.match(output, /No history entries recorded yet/);
  assert.match(output, /Name: Not recorded/);
  assert.match(output, /not been verified/i);
});
