import type { MealLog } from "./journal";
export type HealthProfile = {
  name: string; age?: number; heightCm?: number; weightKg?: number;
  allergies: string[]; conditions: string[]; goals: string[]; updatedAt: string;
};
export type MedicalRecordKind = "condition" | "allergy" | "medication" | "lab" | "procedure" | "visit";
export type MedicalRecord = { id: string; kind: MedicalRecordKind; title: string; date: string; clinician?: string; facility?: string; notes?: string };
export type HealthData = { version: 2; profile: HealthProfile | null; meals: MealLog[]; trash: MealLog[]; medicalRecords: MedicalRecord[] };
export const emptyHealthData = (): HealthData => ({ version: 2, profile: null, meals: [], trash: [], medicalRecords: [] });
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("This file is not a NutritiScan backup.");
  return value as Record<string, unknown>;
};
function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`Invalid ${label}.`);
  return value.trim();
}
function number(value: unknown, label: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${label}.`);
  return value;
}
function date(value: unknown) {
  if (typeof value !== "string" || !Number.isFinite(new Date(value).getTime())) throw new Error("Invalid saved date.");
  return new Date(value).toISOString();
}
function list(value: unknown) {
  if (!Array.isArray(value) || value.length > 30) throw new Error("Invalid profile details.");
  return [...new Set(value.map((item) => text(item, "profile detail", 240)))];
}
export function validateProfile(value: unknown): HealthProfile {
  const p = object(value);
  return { name: text(p.name, "name", 60), age: number(p.age, "age", 18, 120),
    heightCm: number(p.heightCm, "height", 90, 250), weightKg: number(p.weightKg, "weight", 25, 350),
    allergies: list(p.allergies), conditions: list(p.conditions), goals: list(p.goals), updatedAt: date(p.updatedAt) };
}
export function validateMeal(value: unknown): MealLog {
  const m = object(value);
  const source = m.source === undefined ? "manual" : m.source;
  if (source !== "manual" && source !== "label") throw new Error("Invalid meal source.");
  const note = m.note === undefined ? undefined : text(m.note, "meal note", 500);
  const barcode = m.barcode === undefined ? undefined : text(m.barcode, "barcode", 14);
  if (barcode && !/^\d{8,14}$/.test(barcode)) throw new Error("Invalid barcode.");
  return { id: text(m.id, "meal id", 100), name: text(m.name, "meal name", 80), loggedAt: date(m.loggedAt),
    calories: number(m.calories, "calories", 0, 10000), proteinG: number(m.proteinG, "protein", 0, 1000),
    carbsG: number(m.carbsG, "carbohydrate", 0, 2000), fatG: number(m.fatG, "fat", 0, 1000), note, source, barcode };
}
const RECORD_KINDS: MedicalRecordKind[] = ["condition", "allergy", "medication", "lab", "procedure", "visit"];
export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
export function validateMedicalRecord(value: unknown): MedicalRecord {
  const r = object(value);
  if (!RECORD_KINDS.includes(r.kind as MedicalRecordKind)) throw new Error("Invalid medical record type.");
  const dateValue = text(r.date, "record date", 10);
  if (!isCalendarDate(dateValue)) throw new Error("Enter a real date in YYYY-MM-DD format.");
  const optional = (value: unknown, label: string, max: number) => value === undefined || value === "" ? undefined : text(value, label, max);
  return { id: text(r.id, "record id", 100), kind: r.kind as MedicalRecordKind, title: text(r.title, "record title", 100), date: dateValue,
    clinician: optional(r.clinician, "clinician", 100), facility: optional(r.facility, "clinic or facility", 100), notes: optional(r.notes, "record notes", 2000) };
}
export function decodeHealthData(raw: string | null): HealthData {
  if (!raw) return emptyHealthData();
  if (raw.length > 10_000_000) throw new Error("Backup is too large (maximum 10 MB).");
  const value = object(JSON.parse(raw));
  if (value.version !== undefined && value.version !== 1 && value.version !== 2) throw new Error("This backup version is not supported.");
  if (!Array.isArray(value.meals) || value.meals.length > 20000) throw new Error("Invalid meal journal.");
  if (value.trash !== undefined && (!Array.isArray(value.trash) || value.trash.length > 20000)) throw new Error("Invalid recently removed meals.");
  const meals = value.meals.map(validateMeal);
  const trash = ((value.trash as unknown[] | undefined) ?? []).map(validateMeal);
  const rawRecords = value.medicalRecords === undefined ? [] : value.medicalRecords;
  if (!Array.isArray(rawRecords) || rawRecords.length > 1000) throw new Error("Invalid medical history.");
  const medicalRecords = rawRecords.map(validateMedicalRecord);
  const ids = [...meals, ...trash].map((meal) => meal.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate meal ids in backup.");
  const recordIds = medicalRecords.map((record) => record.id);
  if (new Set(recordIds).size !== recordIds.length) throw new Error("Duplicate medical record ids in backup.");
  return { version: 2, profile: value.profile == null ? null : validateProfile(value.profile), meals, trash, medicalRecords };
}
export interface JournalStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }
export const STORAGE_KEY = "nutritiscan.local-health.v1";
/** Writes are queued; a failed write never changes the in-memory snapshot. */
export class HealthRepository {
  private current = emptyHealthData();
  private loaded = false;
  private queue: Promise<unknown> = Promise.resolve();
  private storage: JournalStorage;
  private publish: (data: HealthData) => void;
  constructor(storage: JournalStorage, publish: (data: HealthData) => void) { this.storage = storage; this.publish = publish; }
  load() {
    const action = this.queue.then(async () => {
      this.loaded = false;
      const next = decodeHealthData(await this.storage.getItem(STORAGE_KEY));
      this.current = next; this.loaded = true; this.publish(next);
    });
    this.queue = action.catch(() => {});
    return action;
  }
  mutate(update: (current: HealthData) => HealthData) {
    const action = this.queue.then(async () => {
      if (!this.loaded) throw new Error("Saved data could not be loaded. Retry before making changes.");
      const next = decodeHealthData(JSON.stringify(update(this.current)));
      await this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
      this.current = next; this.publish(next);
    });
    this.queue = action.catch(() => {});
    return action;
  }
  clear() {
    const action = this.queue.then(async () => {
      await this.storage.removeItem(STORAGE_KEY);
      this.current = emptyHealthData(); this.loaded = true; this.publish(this.current);
    });
    this.queue = action.catch(() => {});
    return action;
  }
}
