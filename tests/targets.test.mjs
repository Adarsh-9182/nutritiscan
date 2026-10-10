import assert from "node:assert/strict";
import test from "node:test";
import { computeTargets } from "../src/engines/targets.ts";

const input = {
  age: 34,
  sex: "other",
  heightCm: 170,
  weightKg: 68,
  activityLevel: "moderate",
  goalDirection: "maintain",
  weeklyPaceKg: 0,
};

test("adult profile can use the current estimated targets", () => {
  assert.ok(computeTargets(input).calories > 0);
});

test("adult calorie and protein equations are not applied to minors", () => {
  assert.throws(
    () => computeTargets({ ...input, age: 17 }),
    /not calculated for users under 18/,
  );
});
