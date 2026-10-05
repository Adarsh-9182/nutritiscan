import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { Button, Card, Chip, Eyebrow, H1, Meta } from "@/components/ui";
import { FormField } from "@/components/FormField";
import { ScreenHeader, useScrollPadding } from "@/components/Screen";
import { isCalendarDate, type MedicalRecordKind } from "@/domain/healthData";
import { useLocalHealth } from "@/lib/localHealth";
import { spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

const kinds: { id: MedicalRecordKind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "visit", label: "Visit", icon: "medical-outline" }, { id: "medication", label: "Medicine", icon: "medkit-outline" },
  { id: "condition", label: "Condition", icon: "heart-outline" }, { id: "allergy", label: "Allergy", icon: "alert-circle-outline" },
  { id: "lab", label: "Test", icon: "flask-outline" }, { id: "procedure", label: "Procedure", icon: "bandage-outline" },
];
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
export default function RecordEdit() {
  const p = usePalette(); const router = useRouter(); const pad = useScrollPadding(); const scroll = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ id?: string; kind?: MedicalRecordKind }>(); const { medicalRecords, ready, saveMedicalRecord, deleteMedicalRecord } = useLocalHealth();
  const existing = useMemo(() => params.id ? medicalRecords.find((item) => item.id === params.id) : undefined, [params.id, medicalRecords]);
  const [kind, setKind] = useState<MedicalRecordKind>(existing?.kind ?? (kinds.some((item) => item.id === params.kind) ? params.kind! : "visit"));
  const [title, setTitle] = useState(existing?.title ?? ""); const [date, setDate] = useState(existing?.date ?? localDate());
  const [clinician, setClinician] = useState(existing?.clinician ?? ""); const [facility, setFacility] = useState(existing?.facility ?? ""); const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [confirmDelete, setConfirmDelete] = useState(false);
  const save = async () => {
    setError("");
    if (!title.trim()) { setError("Add a short name so you can find this item later."); scroll.current?.scrollToEnd({ animated: true }); return; }
    if (!isCalendarDate(date)) { setError("Enter a valid date as YYYY-MM-DD."); return; }
    setBusy(true);
    try { await saveMedicalRecord({ kind, title: title.trim(), date, clinician: clinician.trim() || undefined, facility: facility.trim() || undefined, notes: notes.trim() || undefined }, existing?.id); router.replace("/records"); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save this item. Try again."); }
    finally { setBusy(false); }
  };
  const remove = async () => { if (!existing || busy) return; setBusy(true); try { await deleteMedicalRecord(existing.id); setConfirmDelete(false); router.replace("/records"); } catch { setError("Could not remove this record. Try again."); } finally { setBusy(false); } };
  if (!ready) return <View style={{ flex: 1, backgroundColor: p.bg }}><ScreenHeader title="Health history" backTo="/records" /><Meta style={{ margin: spacing.lg }}>Loading your saved history…</Meta></View>;
  if (params.id && !existing) return <View style={{ flex: 1, backgroundColor: p.bg }}><ScreenHeader title="Health history" backTo="/records" /><Card style={{ margin: spacing.lg, padding: spacing.lg }}><Eyebrow>ITEM NOT FOUND</Eyebrow><Meta style={{ marginTop: spacing.sm }}>This item may have been removed.</Meta><Button title="Back to history" onPress={() => router.replace("/records")} style={{ marginTop: spacing.md }} /></Card></View>;
  return <View style={{ flex: 1, backgroundColor: p.bg }}>
    <ScreenHeader title={existing ? "Edit history item" : "Add to health history"} backTo="/records" />
    <ScrollView ref={scroll} style={{ flex: 1, height: 0, overflow: "scroll" }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: pad }} keyboardShouldPersistTaps="handled">
      <Eyebrow tone="accent">PERSONAL TIMELINE</Eyebrow><H1 style={{ marginTop: spacing.sm }}>{existing ? "Update a record." : "Keep what matters."}</H1>
      <Meta style={{ marginTop: spacing.sm, lineHeight: 20 }}>Enter a detail from your own records or memory. NutritiScan does not verify these entries or give a diagnosis.</Meta>
      <Text style={[type.eyebrow, { color: p.text3, marginTop: spacing.xl }]}>TYPE</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>{kinds.map((item) => <Chip key={item.id} selected={kind === item.id} onPress={() => setKind(item.id)}><Text style={{ color: kind === item.id ? p.accentText : p.text2 }}>{item.label}</Text></Chip>)}</View>
      <FormField label="Name or short title" value={title} onChangeText={setTitle} placeholder={kind === "medication" ? "Medicine name and strength" : kind === "lab" ? "Test or report name" : kind === "visit" ? "Reason for visit" : "What do you want to remember?"} maxLength={100} returnKeyType="next" />
      <FormField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-10-05" maxLength={10} keyboardType="numbers-and-punctuation" />
      <FormField label="Doctor or clinician (optional)" value={clinician} onChangeText={setClinician} placeholder="Name" maxLength={100} />
      <FormField label="Clinic or facility (optional)" value={facility} onChangeText={setFacility} placeholder="Clinic, hospital or lab" maxLength={100} />
      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="What happened, what was prescribed, or what you want to ask next time" multiline maxLength={2000} />
      <Meta style={{ marginTop: spacing.md, lineHeight: 18 }}>Entries stay on this device. Avoid adding details you do not want stored here.</Meta>
      {!!error && <Text accessibilityRole="alert" style={{ color: p.attentionText, marginTop: spacing.md }}>{error}</Text>}
      <Button title={busy ? "Saving…" : existing ? "Save changes" : "Save to history"} variant="primary" disabled={busy} onPress={() => void save()} style={{ marginTop: spacing.xl }} />
      {existing && <Button title="Remove this item" variant="secondary" disabled={busy} onPress={() => setConfirmDelete(true)} style={{ marginTop: spacing.sm }} />}
    </ScrollView>
    <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}><View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: spacing.lg }}><Card style={{ padding: spacing.lg }}><Eyebrow tone="attention">REMOVE HISTORY ITEM</Eyebrow><H1 style={{ marginTop: spacing.md }}>Remove this entry?</H1><Meta style={{ marginTop: spacing.sm, lineHeight: 20 }}>It will be permanently removed from this device and appointment summaries.</Meta><Button title={busy ? "Removing…" : "Remove item"} disabled={busy} onPress={() => void remove()} style={{ marginTop: spacing.lg }} /><Button title="Keep item" variant="secondary" disabled={busy} onPress={() => setConfirmDelete(false)} style={{ marginTop: spacing.sm }} /></Card></View></Modal>
  </View>;
}
