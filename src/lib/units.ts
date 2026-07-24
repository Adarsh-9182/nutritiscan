// Unit conversion + display. The database is always metric (cm, kg); the user's
// unit_system preference only affects what we show and how we parse their input.

export type UnitSystem = "metric" | "imperial";

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const IN_PER_FT = 12;

const round1 = (n: number) => Math.round(n * 10) / 10;

// ---- Weight ---------------------------------------------------------------

export function kgToLb(kg: number): number {
  return round1(kg / KG_PER_LB);
}

export function lbToKg(lb: number): number {
  return round1(lb * KG_PER_LB);
}

/** Weight in the user's preferred unit, rounded for display. */
export function weightInSystem(kg: number, system: UnitSystem): number {
  return system === "imperial" ? kgToLb(kg) : round1(kg);
}

/** Parse a weight the user typed (in their unit) back into canonical kg. */
export function weightToKg(value: number, system: UnitSystem): number {
  return system === "imperial" ? lbToKg(value) : round1(value);
}

// ---- Height ---------------------------------------------------------------

export interface FeetInches {
  feet: number;
  inches: number;
}

export function cmToFeetInches(cm: number): FeetInches {
  const totalInches = cm / CM_PER_IN;
  let feet = Math.floor(totalInches / IN_PER_FT);
  let inches = Math.round(totalInches - feet * IN_PER_FT);
  // Carry 12" up to the next foot.
  if (inches === IN_PER_FT) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return round1((feet * IN_PER_FT + inches) * CM_PER_IN);
}

// ---- Labels ---------------------------------------------------------------

export function weightUnit(system: UnitSystem): string {
  return system === "imperial" ? "lb" : "kg";
}

export function heightUnit(system: UnitSystem): string {
  return system === "imperial" ? "ft·in" : "cm";
}

/** Human-readable height, e.g. "5'11\"" or "175 cm". */
export function formatHeight(cm: number, system: UnitSystem): string {
  if (system === "imperial") {
    const { feet, inches } = cmToFeetInches(cm);
    return `${feet}'${inches}"`;
  }
  return `${round1(cm)} cm`;
}

/** Human-readable weight, e.g. "154 lb" or "70 kg". */
export function formatWeight(kg: number, system: UnitSystem): string {
  return `${weightInSystem(kg, system)} ${weightUnit(system)}`;
}
