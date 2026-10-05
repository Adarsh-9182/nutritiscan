import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBarcode, parseProduct, scaleProduct } from "../src/domain/products.ts";
import { mealDate } from "../src/domain/journal.ts";
test("barcode checksum accepts EAN/UPC and rejects QR content or mistyped digits", () => {
  assert.equal(normalizeBarcode(" 3017620422003 "), "3017620422003");
  assert.equal(normalizeBarcode("012345678905"), "012345678905");
  assert.throws(() => normalizeBarcode("3017620422004"), /check digit/);
  assert.throws(() => normalizeBarcode("https://example.com"), /digit product/);
});
test("product portions preserve missing data and real zeros", () => {
  const product = parseProduct({ product: { product_name: "Fixture", nutriments: { "energy-kcal_100g": 250, proteins_100g: 0, fat_100g: -1 } } }, "3017620422003");
  const totals = scaleProduct(product, "40");
  assert.equal(totals.calories, 100); assert.equal(totals.proteinG, 0);
  assert.equal(totals.carbsG, undefined); assert.equal(totals.fatG, undefined);
  assert.throws(() => scaleProduct(product, "0"), /greater than 0/);
  assert.throws(() => scaleProduct(product, "0x10"), /amount/);
  assert.throws(() => parseProduct({ status: 0 }, "3017620422003"), /not in Open Food Facts/);
});
test("meal dates validate real calendar days and prohibit future entries", () => {
  const now = new Date(2026, 9, 4, 15);
  assert.equal(new Date(mealDate("2026-10-03", "12:30", now)).getHours(), 12);
  assert.throws(() => mealDate("2026-02-30", "12:00", now), /valid meal date/);
  assert.throws(() => mealDate("2026-10-04", "25:00", now), /valid meal date/);
  assert.throws(() => mealDate("2026-10-05", "12:00", now), /future/);
});

test("current API nutrition schema reads normalized label values and rejects estimates", () => {
  const product = parseProduct({ product: { product_name: "Current fixture", nutrition: { aggregated_set: { per: "100ml", preparation: "as_sold", nutrients: {
    "energy-kcal": { value: 40, unit: "kcal", source: "packaging" },
    proteins: { value: 3, unit: "g", source: "manufacturer" },
    fat: { value: 2, unit: "g", source: "estimate" }
  } } } } }, "3017620422003");
  assert.equal(product.basisUnit, "ml");
  assert.equal(scaleProduct(product, "250").calories, 100);
  assert.equal(scaleProduct(product, "250").proteinG, 7.5);
  assert.equal(product.fatG, undefined);
});
