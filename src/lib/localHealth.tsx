import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { decodeHealthData, emptyHealthData, HealthRepository, type HealthData, type HealthProfile, type MedicalRecord } from "@/domain/healthData";
import type { MealLog } from "@/domain/journal";
export type { MealLog, HealthProfile };
export type MealInput = Omit<MealLog, "id">;
export type MedicalRecordInput = Omit<MedicalRecord, "id">;
type ContextValue = HealthData & {
  ready: boolean; error: string | null; retry: () => Promise<void>;
  saveProfile: (profile: Omit<HealthProfile, "updatedAt">) => Promise<void>;
  saveMeal: (meal: MealInput, id?: string) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>; restoreMeal: (id: string) => Promise<void>;
  saveMedicalRecord: (record: MedicalRecordInput, id?: string) => Promise<void>;
  deleteMedicalRecord: (id: string) => Promise<void>;
  deleteAll: () => Promise<void>; importData: (raw: string) => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);
export function LocalHealthProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HealthData>(emptyHealthData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repository] = useState(() => new HealthRepository(AsyncStorage, setData));
  const retry = useCallback(async () => {
    setReady(false);
    try { await repository.load(); setError(null); setReady(true); }
    catch { setError("Saved data could not be read. Nothing has been overwritten. Retry from You."); }
  }, [repository]);
  useEffect(() => {
    let active = true;
    repository.load().then(() => { if (active) { setReady(true); setError(null); } }).catch(() => { if (active) setError("Saved data could not be read. Nothing has been overwritten. Retry from You."); });
    return () => { active = false; };
  }, [repository]);
  const value = useMemo<ContextValue>(() => ({
    ...data, ready, error, retry,
    saveProfile: async (profile) => repository.mutate((current) => ({ ...current, profile: { ...profile, updatedAt: new Date().toISOString() } })),
    saveMeal: async (meal, id) => repository.mutate((current) => {
      if (id && !current.meals.some((item) => item.id === id)) throw new Error("This meal is no longer in your journal.");
      const entry = { ...meal, id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };
      return { ...current, meals: [entry, ...current.meals.filter((item) => item.id !== id)].sort((a, b) => Date.parse(b.loggedAt) - Date.parse(a.loggedAt)) };
    }),
    deleteMeal: async (id) => repository.mutate((current) => ({ ...current, meals: current.meals.filter((meal) => meal.id !== id), trash: [...current.trash, ...current.meals.filter((meal) => meal.id === id)] })),
    restoreMeal: async (id) => repository.mutate((current) => ({ ...current, meals: [...current.meals, ...current.trash.filter((meal) => meal.id === id)].sort((a, b) => Date.parse(b.loggedAt) - Date.parse(a.loggedAt)), trash: current.trash.filter((meal) => meal.id !== id) })),
    saveMedicalRecord: async (record, id) => repository.mutate((current) => {
      if (id && !current.medicalRecords.some((item) => item.id === id)) throw new Error("This record is no longer in your health history.");
      const entry: MedicalRecord = { ...record, id: id ?? `record-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };
      return { ...current, medicalRecords: [entry, ...current.medicalRecords.filter((item) => item.id !== id)].sort((a, b) => b.date.localeCompare(a.date)) };
    }),
    deleteMedicalRecord: async (id) => repository.mutate((current) => ({ ...current, medicalRecords: current.medicalRecords.filter((item) => item.id !== id) })),
    deleteAll: async () => { await repository.clear(); setError(null); setReady(true); },
    importData: async (raw) => {
      const next = decodeHealthData(raw);
      await repository.mutate((current) => {
        const known = new Set([...current.meals, ...current.trash].map((meal) => meal.id));
        const recordIds = new Set(current.medicalRecords.map((record) => record.id));
        return { ...current, profile: current.profile ?? next.profile,
          meals: [...current.meals, ...next.meals.filter((meal) => !known.has(meal.id))].sort((a,b) => Date.parse(b.loggedAt)-Date.parse(a.loggedAt)),
          trash: [...current.trash, ...next.trash.filter((meal) => !known.has(meal.id))],
          medicalRecords: [...current.medicalRecords, ...next.medicalRecords.filter((record) => !recordIds.has(record.id))].sort((a,b) => b.date.localeCompare(a.date)) };
      });
    },
  }), [data, ready, error, retry, repository]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLocalHealth() {
  const value = useContext(Context);
  if (!value) throw new Error("useLocalHealth must be used inside LocalHealthProvider");
  return value;
}
