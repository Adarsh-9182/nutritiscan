import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, Chip, Eyebrow, H1, Meta } from "@/components/ui";
import { FormField } from "@/components/FormField";
import { ScreenHeader, useScrollPadding } from "@/components/Screen";
import { useLocalHealth } from "@/lib/localHealth";
import { MedicalRecordKind } from "@/domain/healthData";
import { spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";
import { useState } from "react";
const kinds: MedicalRecordKind[] = ["visit", "medication", "condition", "allergy", "lab", "procedure"];
const titles: Record<MedicalRecordKind, string> = { visit: "Doctor visit", medication: "Medication", condition: "Condition", allergy: "Allergy", lab: "Test or report", procedure: "Procedure" };
export default function Records() {
  const p = usePalette(); const router = useRouter(); const pad = useScrollPadding(); const { medicalRecords, ready } = useLocalHealth(); const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase(); const shown = medicalRecords.filter((r) => !q || [r.title, r.kind, r.clinician, r.facility, r.notes].some((part) => part?.toLowerCase().includes(q)));
  return <View style={{ flex: 1, backgroundColor: p.bg }}>
    <ScreenHeader title="Health history" backTo="/you" />
    <ScrollView style={{ flex: 1, height: 0, overflow: "scroll" }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: pad }}>
      <Eyebrow tone="accent">YOUR RECORD, YOUR CONTROL</Eyebrow>
      <H1 style={{ marginTop: spacing.sm }}>A clearer health history.</H1>
      <Meta style={{ marginTop: spacing.sm, lineHeight: 20 }}>Save visits, medicines, conditions, allergies and test results you want to remember. Entries are stored on this device and are not checked by a clinician.</Meta>
      <Pressable accessibilityRole="button" onPress={() => router.push("/doctor-summary" as never)} style={{ marginTop: spacing.lg }}>
        <Card tone="evidence" style={{ padding: spacing.base, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Ionicons name="document-text-outline" size={22} color={p.evidenceText} />
          <View style={{ flex: 1 }}><Text style={[type.body, { color: p.text, fontWeight: "700" }]}>Prepare for a doctor visit</Text><Meta>Review and share a summary from your saved history</Meta></View>
          <Ionicons name="chevron-forward" size={18} color={p.evidenceText} />
        </Card>
      </Pressable>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg }}>
        {kinds.map((kind) => <Chip key={kind} onPress={() => router.push({ pathname: "/record-edit", params: { kind } })}>+ {titles[kind]}</Chip>)}
      </View>
      <View style={{ marginTop: spacing.xxl }}><Eyebrow>RECENT HISTORY · {medicalRecords.length}</Eyebrow></View>
      {ready && medicalRecords.length > 0 && <FormField label="Search your history" value={query} onChangeText={setQuery} placeholder="Medicine, test, clinic or note" returnKeyType="search" />}
      {!ready ? <Meta style={{ marginTop: spacing.lg }}>Loading your saved history…</Meta> : medicalRecords.length === 0 ? <Card style={{ marginTop: spacing.md, padding: spacing.lg }}><Eyebrow>NOTHING ADDED YET</Eyebrow><Meta style={{ marginTop: spacing.sm, lineHeight: 20 }}>Start with a medicine, allergy, or recent visit. Add only what you want to keep in your personal timeline.</Meta></Card> : shown.length === 0 ? <Card style={{ marginTop: spacing.md, padding: spacing.lg }}><Eyebrow>NO MATCHES</Eyebrow><Meta style={{ marginTop: spacing.sm }}>Try a different search phrase.</Meta></Card> : shown.map((record) => <Pressable key={record.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/record-edit", params: { id: record.id } })} style={{ marginTop: spacing.md }}>
        <Card style={{ padding: spacing.base, flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: p.surface2 }}><Ionicons name={iconFor(record.kind)} size={17} color={p.accentText} /></View>
          <View style={{ flex: 1 }}><Text style={[type.meta, { color: p.evidenceText, textTransform: "capitalize" }]}>{titles[record.kind]} · {formatDate(record.date)}</Text><Text style={[type.body, { color: p.text, fontWeight: "700", marginTop: 3 }]}>{record.title}</Text>{record.clinician ? <Meta style={{ marginTop: 3 }}>{record.clinician}{record.facility ? ` · ${record.facility}` : ""}</Meta> : null}{record.notes ? <Meta numberOfLines={2} style={{ marginTop: 5, lineHeight: 18 }}>{record.notes}</Meta> : null}</View>
          <Ionicons name="chevron-forward" size={16} color={p.text3} />
        </Card>
      </Pressable>)}
      <Meta style={{ marginTop: spacing.lg, lineHeight: 18 }}>Every item here is entered by you. NutritiScan has not verified it against a clinic or source document.</Meta>
    </ScrollView>
  </View>;
}
function formatDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function iconFor(kind: MedicalRecordKind): keyof typeof Ionicons.glyphMap { return ({ visit: "medical-outline", medication: "medkit-outline", condition: "heart-outline", allergy: "alert-circle-outline", lab: "flask-outline", procedure: "bandage-outline" } as const)[kind]; }
