// ============================================================
// PLAN CONSTRAINTS — shared between the plan and the grocery list
//
// A module-level store rather than screen state, because the
// grocery list is DERIVED FROM THE WEEK the constraints produce.
// If each screen kept its own copy, loosening "Iron up" on the
// plan would leave the shopping list buying for the old week —
// the exact silent drift the planner is designed to prevent.
//
// useSyncExternalStore rather than context: no provider to thread
// through the router tree, and the snapshot is referentially
// stable so a memoised child isn't re-rendered for nothing.
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useSyncExternalStore } from "react";
import type { ConstraintId } from "@/domain/plan";

const KEY = "ns2-plan-constraints";

const DEFAULTS: ConstraintId[] = ["iron-up", "ldl-down", "gluten-free", "quick", "protein"];

let active: ConstraintId[] = DEFAULTS;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

// Restore once at module load. Until it lands the defaults apply,
// which is also what a first-run user should see.
AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        active = parsed as ConstraintId[];
        emit();
      }
    } catch {
      // Corrupt value — the defaults are still correct.
    }
  })
  .catch(() => {
    // Storage unavailable; defaults stand.
  });

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const getSnapshot = () => active;

function write(next: ConstraintId[]) {
  active = next;
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {
    // Persistence failed; the session still honours the choice.
  });
}

export function useConstraints(): [Set<ConstraintId>, (id: ConstraintId) => void] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const toggle = useCallback((id: ConstraintId) => {
    write(active.includes(id) ? active.filter((c) => c !== id) : [...active, id]);
  }, []);
  return [new Set(list), toggle];
}
