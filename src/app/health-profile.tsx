import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/Screen";
import { FormField } from "@/components/FormField";
import { Button, Card, Eyebrow, Meta } from "@/components/ui";
import { useLocalHealth, type HealthProfile } from "@/lib/localHealth";
import { spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";
function csv(value: string) { return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))]; }
function optionalNumber(value: string, label: string, min: number, max: number) {
  if (!value.trim()) return undefined;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) throw new Error(`${label} should be a number.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`${label} should be between ${min} and ${max}.`);
  if (label === "Age" && !Number.isInteger(number)) throw new Error("Enter your age in whole years.");
  return number;
}
export default function HealthProfileScreen() {
  const p = usePalette(); const { ready, error, retry, profile } = useLocalHealth();
  if (!ready) return <View style={{ flex: 1, backgroundColor: p.bg }}><ScreenHeader title="Your profile" backTo="/you" /><View style={{ padding: spacing.lg }}><Meta>{error || "Loading your saved profile…"}</Meta>{!!error && <Button title="Retry loading" onPress={() => void retry()} />}</View></View>;
  return <ProfileForm profile={profile} />;
}
function ProfileForm({ profile }: { profile: HealthProfile | null }) {
  const p = usePalette(); const router = useRouter(); const insets = useSafeAreaInsets(); const { saveProfile } = useLocalHealth();
  const [name, setName] = useState(profile?.name ?? "");
  const [age, setAge] = useState(profile?.age?.toString() ?? "");
  const [height, setHeight] = useState(profile?.heightCm?.toString() ?? "");
  const [weight, setWeight] = useState(profile?.weightKg?.toString() ?? "");
  const [allergies, setAllergies] = useState(profile?.allergies.join(", ") ?? "");
  const [conditions, setConditions] = useState(profile?.conditions.join(", ") ?? "");
  const [goals, setGoals] = useState(profile?.goals.join(", ") ?? "");
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const scroll = useRef<ScrollView>(null);
  const save = async () => {
    if (saving) return;
    setSaving(true); setError("");
    try {
      if (name.trim().length < 2 || name.trim().length > 60) throw new Error("Enter a name between 2 and 60 characters.");
      await saveProfile({ name: name.trim(), age: optionalNumber(age, "Age", 18, 120), heightCm: optionalNumber(height, "Height", 90, 250), weightKg: optionalNumber(weight, "Weight", 25, 350), allergies: csv(allergies), conditions: csv(conditions), goals: csv(goals) });
      if (router.canGoBack()) router.back(); else router.replace("/you");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save your profile. Try again."); requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true })); }
    finally { setSaving(false); }
  };
  return <KeyboardAvoidingView style={{ flex: 1, minHeight: 0, backgroundColor: p.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScreenHeader backTo="/you" title={profile ? "Edit your profile" : "Make it yours"} />
    <ScrollView ref={scroll} style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
      <Meta style={{ lineHeight: 20 }}>Start with your name. Everything else is optional, and stays on this device.</Meta>
      <Card style={{ marginTop: spacing.lg, padding: spacing.base }}>
        <Eyebrow>ABOUT YOU</Eyebrow>
        <FormField label="Name" value={name} onChangeText={setName} placeholder="What should we call you?" maxLength={60} autoComplete="name" />
        <View style={{ flexDirection: "row", gap: spacing.md }}><View style={{ flex: 1 }}><FormField label="Age · 18+" value={age} onChangeText={setAge} placeholder="Optional" keyboardType="number-pad" maxLength={3} /></View><View style={{ flex: 1 }}><FormField label="Height · cm" value={height} onChangeText={setHeight} placeholder="Optional" keyboardType="decimal-pad" maxLength={6} /></View></View>
        <FormField label="Weight · kg" value={weight} onChangeText={setWeight} placeholder="Optional" keyboardType="decimal-pad" maxLength={6} />
      </Card>
      <Card style={{ marginTop: spacing.md, padding: spacing.base }}>
        <Eyebrow>YOUR CONTEXT</Eyebrow>
        <FormField label="Food allergies or restrictions" value={allergies} onChangeText={setAllergies} placeholder="Separate items with commas" maxLength={240} />
        <FormField label="Health conditions · optional" value={conditions} onChangeText={setConditions} placeholder="Separate items with commas" maxLength={240} />
        <FormField label="Your goals · optional" value={goals} onChangeText={setGoals} placeholder="e.g. regular meals, track protein" maxLength={240} />
        <Meta style={{ marginTop: spacing.md, lineHeight: 18 }}>These are your notes. The app does not use them to diagnose conditions, suggest medication, or verify food safety.</Meta>
      </Card>
      {!!error && <Text accessibilityRole="alert" style={[type.meta, { color: p.attentionText, marginTop: spacing.md }]}>{error}</Text>}
      <Button variant="primary" title={saving ? "Saving…" : "Save profile"} icon="checkmark" disabled={saving} onPress={() => void save()} style={{ marginTop: spacing.lg }} />
      <Meta style={{ marginTop: spacing.md, textAlign: "center", lineHeight: 18 }}>Clear an optional field to remove it. Export or clear all your data from You.</Meta>
    </ScrollView>
  </KeyboardAvoidingView>;
}
