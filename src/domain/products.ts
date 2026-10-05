export type LabelProduct = {
  barcode: string; name: string; brand?: string; ingredients?: string; allergens?: string;
  calories?: number; proteinG?: number; carbsG?: number; fatG?: number;
  sourceUrl: string; basisUnit?: "g" | "ml";
};
function value(raw: unknown, max: number): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > max) return undefined;
  return raw;
}
export function normalizeBarcode(raw: string): string {
  const code = raw.trim().replace(/\s/g, "");
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) throw new Error("Enter an 8, 12, 13, or 14 digit product barcode.");
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const total = digits.reverse().reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0);
  if ((10 - total % 10) % 10 !== check) throw new Error("That barcode has an invalid check digit. Check the numbers on the package.");
  return code;
}
export function parseProduct(payload: unknown, barcode: string): LabelProduct {
  if (!payload || typeof payload !== "object") throw new Error("The product service returned an unreadable response.");
  const p = (payload as { product?: Record<string, unknown> }).product;
  if (!p || typeof p !== "object") throw new Error("This product is not in Open Food Facts. You can still enter its label manually.");
  const name = typeof p.product_name === "string" ? p.product_name.trim() : "";
  if (!name) throw new Error("This barcode has no product name. Please enter its label manually.");
  const nutrition = p.nutrition && typeof p.nutrition === "object" ? p.nutrition as Record<string, unknown> : undefined;
  const aggregated = nutrition?.aggregated_set && typeof nutrition.aggregated_set === "object" ? nutrition.aggregated_set as Record<string, unknown> : undefined;
  const basisUnit = aggregated ? aggregated.per === "100g" ? "g" : aggregated.per === "100ml" ? "ml" : undefined : "g";
  const nutrients = aggregated?.nutrients && typeof aggregated.nutrients === "object" ? aggregated.nutrients as Record<string, unknown> : {};
  const nutrient = (key: string, unit: string, max: number) => {
    const item = nutrients[key];
    if (!basisUnit || !item || typeof item !== "object") return undefined;
    const n = item as Record<string, unknown>;
    // Estimated or prepared-food values are not package-label values.
    if (n.unit !== unit || (n.source !== "manufacturer" && n.source !== "packaging") || aggregated?.preparation !== "as_sold") return undefined;
    return value(n.value, max);
  };
  const legacy = p.nutriments && typeof p.nutriments === "object" ? p.nutriments as Record<string, unknown> : {};
  const kcal = aggregated ? nutrient("energy-kcal", "kcal", 1000) : value(legacy["energy-kcal_100g"], 1000);
  const kj = aggregated ? nutrient("energy-kj", "kJ", 4200) : value(legacy.energy_100g, 4200);
  return { barcode, name: name.slice(0, 80), brand: typeof p.brands === "string" ? p.brands : undefined,
    ingredients: typeof p.ingredients_text === "string" ? p.ingredients_text : undefined,
    allergens: typeof p.allergens === "string" ? p.allergens.replaceAll("en:", "").replaceAll(",", ", ") : undefined,
    basisUnit, calories: kcal ?? (kj === undefined ? undefined : kj / 4.184),
    proteinG: aggregated ? nutrient("proteins", "g", 100) : value(legacy.proteins_100g, 100),
    carbsG: aggregated ? nutrient("carbohydrates", "g", 100) : value(legacy.carbohydrates_100g, 100),
    fatG: aggregated ? nutrient("fat", "g", 100) : value(legacy.fat_100g, 100),
    sourceUrl: `https://world.openfoodfacts.org/product/${barcode}` };
}
export function scaleProduct(product: LabelProduct, quantity: string) {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(quantity.trim())) throw new Error("Enter the amount you ate, in grams or millilitres.");
  if (!product.basisUnit) throw new Error("This product has no per-100 label values. Enter its nutrition manually.");
  const amount = Number(quantity);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) throw new Error("Amount should be greater than 0 and no more than 2,000.");
  const scale = (n?: number) => n === undefined ? undefined : Math.round(n * amount) / 100;
  return { calories: scale(product.calories), proteinG: scale(product.proteinG), carbsG: scale(product.carbsG), fatG: scale(product.fatG) };
}
