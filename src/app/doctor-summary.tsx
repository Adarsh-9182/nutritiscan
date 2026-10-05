import { useMemo, useState } from "react";
import { Platform, ScrollView, Share, Text, View } from "react-native";
import { Button, Card, Eyebrow, H1, Meta } from "@/components/ui";
import { FormField } from "@/components/FormField";
import { ScreenHeader, useScrollPadding } from "@/components/Screen";
import { buildDoctorSummary } from "@/domain/doctorSummary";
import { useLocalHealth } from "@/lib/localHealth";
import { exportText } from "@/lib/backup";
import { spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function DoctorSummary() {
  const p = usePalette(); const pad = useScrollPadding(); const { profile, medicalRecords, ready } = useLocalHealth();
  const [questions, setQuestions] = useState(""); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  const base = useMemo(() => buildDoctorSummary(profile, medicalRecords), [profile, medicalRecords]);
  const text = `${base}\n\nQUESTIONS FOR THIS VISIT\n${questions.trim() || "No questions added."}`;
  const share = async () => {
    setBusy(true); setStatus("");
    try {
      const webShare = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share : undefined;
      if (Platform.OS === "web" && webShare) await webShare.call(navigator, { title: "NutritiScan appointment summary", text });
      else if (Platform.OS === "web") await exportText(text);
      else await Share.share({ title: "NutritiScan appointment summary", message: text });
      setStatus(Platform.OS === "web" && webShare ? "Summary shared." : "Summary ready. Check where you save or share it.");
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setStatus(error instanceof Error ? error.message : "Could not share the summary. Your records remain saved on this device."); }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: p.bg }}>
    <ScreenHeader title="Appointment summary" backTo="/records" />
    <ScrollView style={{ flex: 1, height: 0, overflow: "scroll" }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: pad }} keyboardShouldPersistTaps="handled">
      <Eyebrow tone="evidence">BUILT FROM YOUR ENTRIES</Eyebrow><H1 style={{ marginTop: spacing.sm }}>Take your history with you.</H1>
      <Meta style={{ marginTop: spacing.sm, lineHeight: 20 }}>Review the details, add questions for your clinician, then share or save a plain-text summary.</Meta>
      <Card tone="attention" style={{ marginTop: spacing.lg, padding: spacing.base }}><Eyebrow tone="attention">CHECK BEFORE SHARING</Eyebrow><Meta style={{ marginTop: spacing.sm, lineHeight: 19 }}>These details were entered by you and have not been checked against source reports. NutritiScan did not diagnose, interpret results, or recommend treatment.</Meta></Card>
      <FormField label="Questions for your clinician (optional)" value={questions} onChangeText={setQuestions} placeholder="What would you like to discuss?" multiline maxLength={2000} />
      <Button title={busy ? "Preparing…" : "Share appointment summary"} variant="primary" disabled={!ready || busy} onPress={() => void share()} style={{ marginTop: spacing.lg }} />
      {!!status && <Text accessibilityLiveRegion="polite" style={[type.meta, { color: p.evidenceText, marginTop: spacing.md }]}>{status}</Text>}
      <View style={{ marginTop: spacing.xl }}><Eyebrow>PREVIEW · {medicalRecords.length} ENTRIES</Eyebrow></View>
      <Card style={{ marginTop: spacing.md, padding: spacing.base }}><Text selectable style={[type.meta, { color: p.text2, lineHeight: 21 }]}>{ready ? text : "Loading your saved summary…"}</Text></Card>
    </ScrollView>
  </View>;
}
