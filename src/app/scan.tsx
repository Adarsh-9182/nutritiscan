import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FormField } from "@/components/FormField";
import { Button, Card, Chip, Eyebrow, H1, Meta } from "@/components/ui";
import { localDateKey, mealDate, parseOptionalNutrition, type MealLog } from "@/domain/journal";
import { scaleProduct, type LabelProduct } from "@/domain/products";
import { lookupProduct } from "@/lib/products";
import { useLocalHealth } from "@/lib/localHealth";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function Scan() {
  const p = usePalette(); const router = useRouter(); const params = useLocalSearchParams<{ id?: string; copy?: string }>();
  const { meals, ready, error, retry } = useLocalHealth();
  const id = typeof params.id === "string" ? params.id : undefined;
  const copy = typeof params.copy === "string" ? params.copy : undefined;
  if (!ready) return <View style={{ flex: 1, backgroundColor: p.bg, padding: spacing.lg }}><H1>Your journal</H1><Meta>{error || "Loading meals…"}</Meta>{!!error && <Button title="Retry loading" onPress={() => void retry()} />}<Button title="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} /></View>;
  return <MealForm key={id ?? copy ?? "new"} id={id} copy={copy} existing={meals.find((meal) => meal.id === (id ?? copy))} />;
}
function MealForm({ id, copy, existing }: { id?: string; copy?: string; existing?: MealLog }) {
  const p = usePalette(); const router = useRouter(); const insets = useSafeAreaInsets();
  const { saveMeal, deleteMeal, ready, error: storageError } = useLocalHealth();
  const [name, setName] = useState(existing?.name ?? "");
  const [calories, setCalories] = useState(existing?.calories?.toString() ?? "");
  const [protein, setProtein] = useState(existing?.proteinG?.toString() ?? "");
  const [carbs, setCarbs] = useState(existing?.carbsG?.toString() ?? "");
  const [fat, setFat] = useState(existing?.fatG?.toString() ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [date, setDate] = useState(localDateKey(id && existing ? new Date(existing.loggedAt) : new Date()));
  const [time, setTime] = useState((id && existing ? new Date(existing.loggedAt) : new Date()).toTimeString().slice(0, 5));
  const [source, setSource] = useState<"manual" | "label">(existing?.source ?? "manual");
  const [savedBarcode, setSavedBarcode] = useState<string | undefined>(existing?.barcode);
  const [mode, setMode] = useState<"manual" | "barcode">("manual");
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<LabelProduct | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  const requestId = useRef(0);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => () => { requestId.current += 1; }, []);
  const close = () => router.canGoBack() ? router.back() : router.replace("/");
  const lookup = async (input = barcode) => {
    const request = ++requestId.current;
    setLookingUp(true); setLookupError(""); setProduct(null); setCameraVisible(false);
    try { const result = await lookupProduct(input); if (request === requestId.current) { setProduct(result); setQuantity("100"); } }
    catch (err) { if (request === requestId.current) setLookupError(err instanceof Error ? err.message : "Could not look up this product."); }
    finally { if (request === requestId.current) setLookingUp(false); }
  };
  const openCamera = async () => {
    try {
      const access = permission?.granted ? permission : await requestPermission();
      if (!access.granted) { setLookupError("Camera permission was not granted. You can type the barcode instead."); return; }
      scanned.current = false; setCameraVisible(true); setLookupError("");
    } catch { setLookupError("Camera unavailable. Type the barcode from the package instead."); }
  };
  const applyLabel = () => {
    if (!product) return;
    try {
      const totals = scaleProduct(product, quantity);
      setName(product.name); setCalories(totals.calories?.toString() ?? ""); setProtein(totals.proteinG?.toString() ?? "");
      setCarbs(totals.carbsG?.toString() ?? ""); setFat(totals.fatG?.toString() ?? "");
      setSource("label"); setSavedBarcode(product.barcode);
      setNote(`${quantity} ${product.basisUnit} · Open Food Facts label (${product.barcode}). Check against your package.`);
      setMode("manual"); setProduct(null); setLookupError("");
    } catch (err) { setLookupError(err instanceof Error ? err.message : "Check the amount."); }
  };
  const save = async () => {
    if (!ready || saving) return;
    setSaving(true); setError("");
    try {
      const mealName = name.trim();
      if (mealName.length < 2 || mealName.length > 80) throw new Error("Enter a meal name between 2 and 80 characters.");
      await saveMeal({ name: mealName,
        calories: parseOptionalNutrition(calories, "Calories"), proteinG: parseOptionalNutrition(protein, "Protein", 1000),
        carbsG: parseOptionalNutrition(carbs, "Carbohydrate", 2000), fatG: parseOptionalNutrition(fat, "Fat", 1000),
        note: note.trim() || undefined, loggedAt: mealDate(date, time), source, barcode: savedBarcode }, id);
      close();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this meal. Try again."); requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true })); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!id || saving) return;
    setSaving(true);
    try { await deleteMeal(id); close(); }
    catch { setError("Could not remove this meal. Your entry has been kept."); }
    finally { setSaving(false); }
  };
  return <KeyboardAvoidingView style={[styles.root, { backgroundColor: p.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={[styles.top, { paddingTop: insets.top + spacing.sm, borderBottomColor: p.border }]}>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close meal log" hitSlop={12}><Ionicons name="close" size={24} color={p.text2} /></Pressable>
      <Eyebrow>FOOD JOURNAL</Eyebrow><View style={{ width: 24 }} />
    </View>
    <ScrollView ref={scroll} style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
      <H1>{id ? "Edit meal" : copy ? "Log it again" : "What’s on your plate?"}</H1>
      <Meta style={{ marginTop: spacing.sm, lineHeight: 20 }}>A quick note now. A clearer picture of your week later.</Meta>
      {!ready ? <Card style={{ marginTop: spacing.lg }}><Meta>{storageError || "Loading your journal…"}</Meta></Card> : id && !existing ? <Card style={{ marginTop: spacing.lg }}><Meta>This meal is no longer in your journal. Find removed meals in History.</Meta><Button title="Back to home" onPress={() => router.replace("/")} /></Card> : <>
      {!id && <View style={styles.row}><Chip selected={mode === "manual"} onPress={() => { setMode("manual"); setCameraVisible(false); }}>Enter a meal</Chip><Chip selected={mode === "barcode"} onPress={() => setMode("barcode")}>Scan a barcode</Chip></View>}
      {mode === "barcode" && <Card style={{ marginTop: spacing.lg, padding: spacing.base }}>
        <Eyebrow>PACKAGED FOOD</Eyebrow><Meta style={{ marginTop: 8, lineHeight: 19 }}>Look up the package barcode. Only the barcode is sent to Open Food Facts; your journal stays here.</Meta>
        {Platform.OS !== "web" && <Button title={cameraVisible ? "Close camera" : "Use camera"} icon="barcode-outline" variant="secondary" onPress={() => cameraVisible ? setCameraVisible(false) : void openCamera()} style={{ marginTop: spacing.md }} />}
        {cameraVisible && <View style={{ height: 240, overflow: "hidden", borderRadius: radius.md, marginTop: spacing.md }}><CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a"] }} onMountError={() => { setCameraVisible(false); setLookupError("Could not start the camera. Type the barcode instead."); }} onBarcodeScanned={({ data }) => { if (scanned.current) return; scanned.current = true; setBarcode(data); void lookup(data); }} /></View>}
        <FormField label="Product barcode" value={barcode} onChangeText={(value) => { setBarcode(value); setProduct(null); }} placeholder="Numbers below the barcode" keyboardType="number-pad" maxLength={20} />
        <Button variant="primary" title={lookingUp ? "Looking up…" : "Find product"} disabled={lookingUp || !barcode.trim()} onPress={() => void lookup()} style={{ marginTop: spacing.md }} />
        {!!lookupError && <Text accessibilityRole="alert" style={[type.meta, { color: p.attentionText, marginTop: spacing.md }]}>{lookupError}</Text>}
        {product && <View style={{ marginTop: spacing.lg }}>
          <Text style={[type.h3, { color: p.text }]}>{product.name}</Text><Meta>{product.brand}</Meta>
          <Meta style={{ marginTop: spacing.sm }}>Per 100 {product.basisUnit ?? "g/ml"}: {product.calories === undefined ? "calories not available" : `${Math.round(product.calories)} kcal`} · {product.proteinG === undefined ? "protein not available" : `${product.proteinG} g protein`}</Meta>
          {!!product.allergens && <Meta style={{ marginTop: spacing.sm }}>Listed allergens: {product.allergens}. Verify on the package; this is not a safety check.</Meta>}
          <FormField label={`Amount you ate · ${product.basisUnit ?? "g/ml"}`} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="100" />

          <Meta style={{ marginTop: 8, lineHeight: 18 }}>Use the same unit as the package’s per-100 nutrition. Community data can be incomplete; check your label.</Meta>
          <Button variant="primary" title="Use this portion" icon="checkmark" disabled={!product.basisUnit} onPress={applyLabel} style={{ marginTop: spacing.md }} />
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(product.sourceUrl).catch(() => setLookupError("Could not open the source."))} style={{ paddingVertical: spacing.md }}><Text style={{ color: p.accentText }}>Source: Open Food Facts · ODbL</Text></Pressable>
        </View>}
      </Card>}
      <Card style={{ marginTop: spacing.lg, padding: spacing.base }}>
        <Eyebrow>YOUR MEAL</Eyebrow>
        <FormField label="Meal name" value={name} onChangeText={setName} placeholder="e.g. Dal, rice and salad" maxLength={80} />
        <View style={styles.row}><View style={{ flex: 1 }}><FormField label="Date · YYYY-MM-DD" value={date} onChangeText={setDate} placeholder="2026-10-04" maxLength={10} /></View><View style={{ width: 95 }}><FormField label="Time · HH:MM" value={time} onChangeText={setTime} placeholder="13:30" maxLength={5} /></View></View>
        <View style={styles.row}><Chip onPress={() => { setDate(localDateKey(new Date())); setTime(new Date().toTimeString().slice(0,5)); }}>Today</Chip><Chip onPress={() => { const when = new Date(); when.setDate(when.getDate()-1); setDate(localDateKey(when)); }}>Yesterday</Chip></View>
        <View style={styles.row}><View style={{ flex: 1 }}><FormField label="Calories · kcal" value={calories} onChangeText={(v) => { setCalories(v); setSource("manual"); }} placeholder="Optional" keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><FormField label="Protein · g" value={protein} onChangeText={(v) => { setProtein(v); setSource("manual"); }} placeholder="Optional" keyboardType="decimal-pad" /></View></View>
        <View style={styles.row}><View style={{ flex: 1 }}><FormField label="Carbs · g" value={carbs} onChangeText={(v) => { setCarbs(v); setSource("manual"); }} placeholder="Optional" keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><FormField label="Fat · g" value={fat} onChangeText={(v) => { setFat(v); setSource("manual"); }} placeholder="Optional" keyboardType="decimal-pad" /></View></View>
        <Meta style={{ marginTop: spacing.md, lineHeight: 18 }}>{source === "label" ? "Portion calculated from Open Food Facts. Review and correct before saving." : "Nutrition is optional. Blank values stay unknown; no targets are assumed."}</Meta>
        <FormField label="Note · optional" value={note} onChangeText={setNote} placeholder="Portion, ingredients, or preparation" multiline maxLength={500} />
      </Card>
      {!!error && <Text accessibilityRole="alert" style={[type.meta, { color: p.attentionText, marginTop: spacing.md }]}>{error}</Text>}
      <Button variant="primary" title={saving ? "Saving…" : id ? "Save changes" : "Save meal"} icon="checkmark" disabled={saving} onPress={() => void save()} style={{ marginTop: spacing.lg }} />
      {id && <Button title="Remove meal" variant="secondary" icon="trash-outline" disabled={saving} onPress={() => void remove()} style={{ marginTop: spacing.md }} />}
      {id && <Meta style={{ marginTop: spacing.sm, textAlign: "center" }}>Removed meals can be restored from History.</Meta>}
      <Meta style={{ marginTop: spacing.lg, textAlign: "center" }}>Saved on this device. No photo recognition or AI advice.</Meta>
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  top: { minHeight: 54, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, flexWrap: "wrap" },
});
