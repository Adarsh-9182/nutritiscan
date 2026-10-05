import assert from "node:assert/strict";
import test from "node:test";
import { decodeHealthData, HealthRepository, STORAGE_KEY } from "../src/domain/healthData.ts";
const meal = (id) => ({ id, name: "Test lunch", calories: 520, loggedAt: "2026-10-04T08:00:00Z" });
function storage(raw = null) {
  return { raw, fail: false, async getItem() { return this.raw; }, async setItem(key, value) { assert.equal(key, STORAGE_KEY); if (this.fail) throw new Error("disk full"); await new Promise(r => setTimeout(r, 2)); this.raw = value; }, async removeItem() { this.raw = null; } };
}
test("legacy journal migrates to v2 and unknown nutrients remain unknown", () => {
  const data = decodeHealthData(JSON.stringify({ profile: null, meals: [meal("one")] }));
  assert.equal(data.version, 2); assert.deepEqual(data.trash, []); assert.deepEqual(data.medicalRecords, []);
  assert.equal(data.meals[0].proteinG, undefined);
});
test("medical history entries validate and reject duplicate ids and impossible dates", () => {
  const record = { id: "visit-1", kind: "visit", title: "Annual check-in", date: "2026-10-05", clinician: "Dr Example", notes: "Discuss test results" };
  const migrated = decodeHealthData(JSON.stringify({ version: 1, meals: [], medicalRecords: [record] }));
  assert.equal(migrated.version, 2); assert.equal(migrated.medicalRecords[0].title, "Annual check-in");
  assert.throws(() => decodeHealthData(JSON.stringify({ version: 2, meals: [], medicalRecords: [record, record] })), /Duplicate medical/);
  assert.throws(() => decodeHealthData(JSON.stringify({ version: 2, meals: [], medicalRecords: [{ ...record, date: "2026-02-31" }] })), /real date/);
  assert.throws(() => decodeHealthData(JSON.stringify({ version: 2, meals: [], medicalRecords: [{ ...record, kind: "diagnosis" }] })), /record type/);
});
test("malformed, duplicate and unsafe nutrition payloads are rejected", () => {
  for (const entry of [{ ...meal("x"), calories: -3 }, { ...meal("x"), proteinG: "20" }, { ...meal("x"), loggedAt: "invalid" }]) {
    assert.throws(() => decodeHealthData(JSON.stringify({ meals: [entry] })));
  }
  assert.throws(() => decodeHealthData(JSON.stringify({ meals: [meal("x"), meal("x")] })), /Duplicate/);
  assert.throws(() => decodeHealthData(JSON.stringify({ version: 42, meals: [] })), /not supported/);
  assert.throws(() => decodeHealthData(JSON.stringify({ profile: { name: "User" }, meals: [] })), /profile details/);
});
test("concurrent saves preserve both entries, including after a fresh launch", async () => {
  const disk = storage(); let current;
  const repo = new HealthRepository(disk, data => { current = data; }); await repo.load();
  await Promise.all([repo.mutate(d => ({ ...d, meals: [...d.meals, meal("first")] })), repo.mutate(d => ({ ...d, meals: [...d.meals, meal("second")] }))]);
  assert.deepEqual(current.meals.map(m => m.id), ["first", "second"]);
  await new HealthRepository(disk, data => { current = data; }).load();
  assert.equal(current.meals.length, 2);
});
test("medical history persists beside the existing profile and meal journal", async () => {
  const disk = storage(); let current;
  const repo = new HealthRepository(disk, data => { current = data; }); await repo.load();
  const record = { id: "r-1", kind: "medication", title: "Medicine A", date: "2026-10-01", notes: "User-entered" };
  await repo.mutate(d => ({ ...d, meals: [meal("meal-1")], medicalRecords: [record] }));
  await new HealthRepository(disk, data => { current = data; }).load();
  assert.equal(current.meals.length, 1); assert.equal(current.medicalRecords[0].title, "Medicine A");
});
test("failed writes retain the previous journal and do not poison later saves", async () => {
  const disk = storage(); let current;
  const repo = new HealthRepository(disk, data => { current = data; }); await repo.load();
  disk.fail = true;
  await assert.rejects(repo.mutate(d => ({ ...d, meals: [meal("lost")] })), /disk full/);
  assert.equal(current.meals.length, 0); assert.equal(disk.raw, null);
  disk.fail = false; await repo.mutate(d => ({ ...d, meals: [meal("saved")] }));
  assert.equal(current.meals[0].id, "saved");
});
test("corrupt storage cannot be silently overwritten by a new entry", async () => {
  const disk = storage("not json"); const repo = new HealthRepository(disk, () => {});
  await assert.rejects(repo.load());
  await assert.rejects(repo.mutate(d => ({ ...d, meals: [meal("new")] })), /could not be loaded/);
  assert.equal(disk.raw, "not json");
});
