import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { ScreenHeader } from "@/components/Screen";
import { Button, Card, Eyebrow, H1, Meta } from "@/components/ui";
import { FormField } from "@/components/FormField";
import { healthRequest, uploadForm } from "@/lib/healthApi";
import { WEB_ORIGIN } from "@/lib/companion";
import { usePalette } from "@/theme/context";
import { spacing, type } from "@/theme";

type Candidate = { name: string; value: number; unit: string; measured_at: string; source_page?: number; source_text?: string };
type Report = { id: string; filename: string; status: string; candidates: Candidate[]; review_note?: string };
export default function CloudHealth() {
  const p = usePalette();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [storage, setStorage] = useState(false); const [cloud, setCloud] = useState(false);
  const [reports, setReports] = useState<Report[]>([]); const [selected, setSelected] = useState<Report | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]); const [compared, setCompared] = useState(false);
  const [date, setDate] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const run = async (task: () => Promise<void>) => { if (busy) return; setBusy(true); setError(""); try { await task(); } catch (e) { setError(e instanceof Error ? e.message : "The request failed."); } finally { setBusy(false); } };
  const refresh = async () => { const result = await healthRequest("documents"); setReports(result.documents); };
  useEffect(() => { let active = true; healthRequest("status").then(async () => { if (!active) return; setAvailable(true); try { const c = await healthRequest("consent"); if (!active) return; setSignedIn(true); setStorage(c.storage); setCloud(c.cloud_ai); if (c.storage) { const d = await healthRequest("documents"); if (active) setReports(d.documents); } } catch { /* Sign-in remains visible. */ } }).catch(() => { if (active) setAvailable(false); }); return () => { active = false; }; }, []);
  const signIn = () => run(async () => { await healthRequest(`auth/${register ? "register" : "login"}`, { method: "POST", body: JSON.stringify({ email, password }) }); setPassword(""); setSignedIn(true); const c = await healthRequest("consent"); setStorage(c.storage); setCloud(c.cloud_ai); if (c.storage) await refresh(); });
  const upload = () => run(async () => { const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/png", "image/jpeg"], copyToCacheDirectory: true }); if (result.canceled) return; const file = result.assets[0]; if ((file.size ?? 0) > 10 * 1024 * 1024) throw new Error("Use a report smaller than 10 MB."); let body: FormData; if (Platform.OS === "web") { body = new FormData(); body.append("file", await (await fetch(file.uri)).blob(), file.name); } else body = uploadForm(file.uri, file.name, file.mimeType ?? "application/pdf"); await healthRequest("documents", { method: "POST", body }); await refresh(); });
  const review = (report: Report) => { setSelected(report); setCandidates(report.candidates.map((c) => ({ ...c }))); setCompared(false); setDate(""); };
  return <View style={{ flex: 1, backgroundColor: p.bg }}><ScreenHeader backTo="/" title="Reports & shared health" /><ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
    <Eyebrow tone="accent">YOUR HEALTH MEMORY</Eyebrow><H1 style={{ marginTop: 10 }}>Records that stay connected.</H1><Meta style={{ marginTop: 10, lineHeight: 21 }}>Your shared account is separate from this device’s journal. Reports are saved privately, and lab values enter your timeline only after you review them.</Meta>
    {available === null ? <Meta style={{ marginTop: 20 }}>Checking the health service…</Meta> : !available ? <Card style={{ padding: 20, marginTop: 22 }}><Eyebrow>Service setup pending</Eyebrow><Meta style={{ marginTop: 10, lineHeight: 21 }}>The shared health backend has not been connected to the website yet. Your local history and public health chat are available. Report upload will become available when the service is deployed.</Meta><Button title="Open NutritiScan" onPress={() => Linking.openURL(`${WEB_ORIGIN}/health`)} style={{ marginTop: 16 }} /></Card> : !signedIn ? <Card style={{ padding: 18, marginTop: 22 }}>
      <Text style={[type.h2, { color: p.text }]}>{register ? "Create your health account" : "Welcome back"}</Text>
      <FormField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <FormField label="Password (at least 12 characters)" value={password} onChangeText={setPassword} secureTextEntry />
      {register && <Meta style={{ marginTop: 10 }}>Younger users should ask a parent or guardian to create and manage their account. Verified guardian consent for a child&apos;s health records is not available yet.</Meta>}
      <Button title={busy ? "Please wait…" : register ? "Create account" : "Sign in"} variant="primary" disabled={busy || !email || password.length < 12} onPress={signIn} style={{ marginTop: 18 }} />
      <Button title={register ? "Already have an account? Sign in" : "New here? Create an account"} variant="quiet" onPress={() => setRegister(!register)} style={{ marginTop: 8 }} />
    </Card> : <>
      <Card style={{ padding: 18, marginTop: 22 }}><Eyebrow>Your choices</Eyebrow><Toggle checked={storage} label="Store my health records on NutritiScan’s private service" onPress={() => setStorage(!storage)} /><Toggle checked={cloud} label="Allow my records and voice audio to be processed by the configured AI provider" onPress={() => setCloud(!cloud)} /><Meta style={{ marginTop: 10 }}>AI processing is optional. Patient records are not used by NutritiScan for model training.</Meta><Button title="Save consent choices" disabled={busy} onPress={() => run(async () => { await healthRequest("consent", { method: "PUT", body: JSON.stringify({ storage, cloud_ai: cloud }) }); if (storage) await refresh(); })} style={{ marginTop: 14 }} /></Card>
      {storage && <><Button title="Upload a report" icon="cloud-upload-outline" variant="primary" disabled={busy} onPress={upload} style={{ marginTop: 22 }} /><Button title="Refresh processing reports" disabled={busy} onPress={() => run(refresh)} style={{ marginTop: 8 }} />
      {reports.map((report) => <Pressable key={report.id} accessibilityRole="button" disabled={!['review','manual_review'].includes(report.status)} onPress={() => review(report)} style={{ marginTop: 12 }}><Card style={{ padding: 17 }}><Text style={[type.h3, { color: p.text }]}>{report.filename}</Text><Meta style={{ marginTop: 6 }}>{report.status.replaceAll("_", " ")} · {report.candidates.length} proposed values</Meta></Card></Pressable>)}
      {selected && <Card style={{ padding: 18, marginTop: 18 }}><Eyebrow tone="accent">Review before saving</Eyebrow><Meta style={{ marginTop: 10 }}>{selected.review_note}</Meta><Button title="View original on the web" onPress={() => Linking.openURL(`${WEB_ORIGIN}/health`)} style={{ marginTop: 12 }} /><FormField label="Collection date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="Use the date on your report" />
      {candidates.map((c, i) => <View key={i} style={{ borderTopWidth: 1, borderTopColor: p.border, marginTop: 12 }}><FormField label="Marker" value={c.name} onChangeText={(name) => setCandidates((v) => v.map((x, j) => j === i ? { ...x, name } : x))} /><FormField label="Value" value={String(c.value)} keyboardType="decimal-pad" onChangeText={(value) => setCandidates((v) => v.map((x, j) => j === i ? { ...x, value: Number(value) } : x))} /><FormField label="Unit" value={c.unit} onChangeText={(unit) => setCandidates((v) => v.map((x, j) => j === i ? { ...x, unit } : x))} /><Meta>Page {c.source_page ?? "not recorded"}: {c.source_text}</Meta><Button title="Remove this marker" variant="quiet" onPress={() => setCandidates((v) => v.filter((_, j) => j !== i))} /></View>)}
      <Button title="Add a measurement manually" onPress={() => setCandidates((v) => [...v, { name: "", value: 0, unit: "", measured_at: "" }])} style={{ marginTop: 12 }} /><Toggle checked={compared} label="I checked each value, unit and date against the original report" onPress={() => setCompared(!compared)} /><Button title="Confirm & save measurements" variant="primary" disabled={busy || !compared || !date || !candidates.length} onPress={() => run(async () => { await healthRequest(`documents/${selected.id}/confirm`, { method: "POST", body: JSON.stringify({ compared_with_original: true, observations: candidates.map((c) => ({ name: c.name, value: c.value, unit: c.unit, measured_at: date, source_page: c.source_page, source_text: c.source_text ?? "" })) }) }); setSelected(null); await refresh(); })} style={{ marginTop: 14 }} /></Card>}
      <Button title="Open shared dashboard & trends" onPress={() => Linking.openURL(`${WEB_ORIGIN}/health`)} style={{ marginTop: 18 }} /></>}
      <Button title="Sign out" variant="quiet" onPress={() => run(async () => { await healthRequest("auth/logout", { method: "POST" }); setSignedIn(false); setReports([]); setSelected(null); })} style={{ marginTop: 18 }} />
    </>}
    {error ? <Text accessibilityRole="alert" style={[type.meta, { color: p.attentionText, marginTop: 16 }]}>{error}</Text> : null}
  </ScrollView></View>;
}
function Toggle({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) { const p = usePalette(); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={{ flexDirection: "row", gap: 10, paddingVertical: 13, alignItems: "center" }}><Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={p.accentText} /><Text style={[type.meta, { color: p.text2, flex: 1 }]}>{label}</Text></Pressable>; }
