import { Platform } from "react-native";
import { normalizeBarcode, parseProduct, type LabelProduct } from "@/domain/products";
const cache = new Map<string, LabelProduct>();
export async function lookupProduct(input: string): Promise<LabelProduct> {
  const barcode = normalizeBarcode(input);
  if (cache.has(barcode)) return cache.get(barcode)!;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const fields = "product_name,brands,nutrition,nutriments,ingredients_text,allergens";
    const response = await fetch(`https://world.openfoodfacts.org/api/v3.6/product/${barcode}.json?fields=${fields}&app_name=NutritiScan`, {
      signal: controller.signal,
      headers: Platform.OS === "web" ? {} : { "User-Agent": "NutritiScan/1.0 (https://github.com/Adarsh-9182)" },
    });
    if (response.status === 404) throw new Error("Product not found. Enter the nutrition label manually instead.");
    if (response.status === 429 || response.status === 503) throw new Error("The product service is busy. Wait a minute before retrying, or enter the label manually.");
    if (!response.ok) throw new Error("Product lookup is unavailable. Try again or use manual entry.");
    const product = parseProduct(await response.json(), barcode);
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(barcode, product);
    return product;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Product lookup timed out. Check your connection or use manual entry.");
    if (error instanceof TypeError) throw new Error("Could not reach Open Food Facts. Check your connection or use manual entry.");
    throw error;
  } finally { clearTimeout(timer); }
}
