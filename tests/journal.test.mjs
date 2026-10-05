import assert from "node:assert/strict";
import test from "node:test";
import { isToday, localDateKey, parseOptionalNutrition, summarizeDay, summarizeDays } from "../src/domain/journal.ts";

test("date keys use local calendar dates and reject invalid timestamps", () => {
  const day = new Date(2026, 9, 4, 12);
  assert.equal(localDateKey(day), "2026-10-04");
  assert.equal(isToday(day.toISOString(), day), true);
  assert.equal(isToday("not-a-date", day), false);
});

test("daily totals include only known nutrition values", () => {
  const date = new Date(2026, 9, 4, 12);
  const entries = [
    { id: "known", name: "Lunch", calories: 520, proteinG: 24.5, loggedAt: new Date(2026, 9, 4, 9).toISOString() },
    { id: "partial", name: "Fruit", loggedAt: new Date(2026, 9, 4, 14).toISOString() },
    { id: "yesterday", name: "Dinner", calories: 800, proteinG: 32, loggedAt: new Date(2026, 9, 3, 20).toISOString() },
  ];

  const summary = summarizeDay(entries, date);
  assert.equal(summary.meals.length, 2);
  assert.equal(summary.calories, 520);
  assert.equal(summary.caloriesCount, 1);
  assert.equal(summary.proteinG, 24.5);
  assert.equal(summary.proteinCount, 1);
});

test("seven-day history keeps empty days and orders entries oldest to newest", () => {
  const now = new Date(2026, 9, 4, 15);
  const meals = [{ id: "today", name: "Breakfast", calories: 300, loggedAt: new Date(2026, 9, 4, 8).toISOString() }];
  const days = summarizeDays(meals, 7, now);
  assert.equal(days.length, 7);
  assert.equal(days[0].key, "2026-09-28");
  assert.equal(days[5].meals.length, 0);
  assert.equal(days[6].key, "2026-10-04");
  assert.equal(days[6].calories, 300);
  assert.throws(() => summarizeDays(meals, 0, now), /integer between 1 and 366/);
});

test("optional nutrition fields are blank when unknown and reject invalid values", () => {
  assert.equal(parseOptionalNutrition("  ", "Calories"), undefined);
  assert.equal(parseOptionalNutrition(" 120.25 ", "Calories"), 120.3);
  assert.equal(parseOptionalNutrition("0", "Calories"), 0);
  assert.throws(() => parseOptionalNutrition("-1", "Calories"), /Calories should be a number/);
  assert.throws(() => parseOptionalNutrition("lots", "Calories"), /Calories should be a number/);
  assert.throws(() => parseOptionalNutrition("10001", "Calories"), /Calories should be a number/);
});
