import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEY } from "@/domain/healthData";
import { exportBackup, readBackup } from "@/lib/backup";
import { FormField } from "@/components/FormField";
import { useScrollPadding } from "@/components/Screen";
import { Button, Card, Divider, Eyebrow, H1, Meta } from "@/components/ui";
import { useLocalHealth } from "@/lib/localHealth";
import { clearChats, CHAT_CONSENT_KEY } from "@/lib/companion";
import { radius, spacing, type } from "@/theme";
import { useTheme, usePalette, type ThemeChoice } from "@/theme/context";

export default function You() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pad = useScrollPadding();
  const { choice, setChoice } = useTheme();
  const { profile, meals, trash, medicalRecords, ready, deleteAll, importData, error, retry } = useLocalHealth();
  const [working, setWorking] = useState(false);

  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const exportData = async () => {
    if (working) return;
    setWorking(true); setActionError(""); setMessage("");
    try {
      const raw = error ? await AsyncStorage.getItem(STORAGE_KEY) : JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), profile, meals, trash, medicalRecords }, null, 2);
      if (!raw) throw new Error("There is no saved data to export yet.");
      await exportBackup(raw);
      setMessage("Backup prepared. Keep the file somewhere private; it contains your journal and profile.");
    } catch (err) { setActionError(err instanceof Error ? err.message : "Could not export data. Your journal is still saved here."); }
    finally { setWorking(false); }
  };
  const restoreBackup = async () => {
    if (!ready || working) return;
    setWorking(true); setActionError(""); setMessage("");
    try {
      const raw = await readBackup();
      if (raw === null) return;
      await importData(raw);
      setMessage("Backup imported. New journal and health history entries were added; existing entries and your current profile were kept.");
    } catch (err) { setActionError(err instanceof Error ? err.message : "Could not import that backup. Current data was kept."); }
    finally { setWorking(false); }
  };
  const eraseData = async () => {
    if (confirmText !== "DELETE" || working) return;
    setWorking(true); setActionError("");
    try { await clearChats(); await deleteAll(); setConfirmVisible(false); setConfirmText(""); setMessage("Your profile, journal, local history and conversations have been cleared from this device."); }
    catch { setActionError("Could not clear data. Please try again."); }
    finally { setWorking(false); }
  };

  return (
    <>
    <ScrollView style={{ flex: 1, height: 0, overflow: "scroll", backgroundColor: p.bg }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: pad, paddingTop: insets.top + spacing.lg }} showsVerticalScrollIndicator={false}>
      <Eyebrow tone="accent">YOUR SPACE</Eyebrow>
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: p.accentSoft }]}><Text style={{ color: p.accentText, fontSize: 15, fontWeight: "700" }}>{profile?.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "?"}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <H1>{profile?.name || "Your profile"}</H1>
          <Meta style={{ marginTop: 3 }}>{profile ? [profile.age !== undefined ? `${profile.age} years` : null, profile.heightCm ? `${profile.heightCm} cm` : null, profile.weightKg ? `${profile.weightKg} kg` : null].filter(Boolean).join(" · ") || "Profile saved on this device" : "No profile details added yet"}</Meta>
        </View>
      </View>

      <Button title={profile ? "Edit your profile" : "Create your profile"} variant="primary" icon="person-outline" onPress={() => router.push("/health-profile")} />

      <View style={{ marginTop: spacing.xxl }}><Eyebrow>Health memory</Eyebrow>
        <Card style={{ marginTop: spacing.sm }}>
          <InfoRow icon="alert-circle-outline" title="Allergies & restrictions" value={profile?.allergies.join(", ") || "None added"} />
          <Divider />
          <InfoRow icon="heart-outline" title="Conditions" value={profile?.conditions.join(", ") || "None added"} />
          <Divider />
          <InfoRow icon="flag-outline" title="Your goals" value={profile?.goals.join(", ") || "None added"} />
          <Divider />
          <InfoRow icon="restaurant-outline" title="Saved meals" value={ready ? String(meals.length) : "Loading…"} />
          <Divider />
          <InfoRow icon="document-text-outline" title="Health history" value={ready ? String(medicalRecords.length) : "Loading…"} />
        </Card>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
          <Button title="Open health history" icon="document-text-outline" variant="secondary" onPress={() => router.push("/records")} style={{ flex: 1 }} />
          <Button title="Doctor summary" icon="share-outline" variant="secondary" onPress={() => router.push("/doctor-summary")} style={{ flex: 1 }} />
        </View>
      </View>

      <View style={{ marginTop: spacing.xxl }}><Eyebrow>Shared account & AI</Eyebrow>
        <Button title="Reports, shared account & consent" icon="cloud-outline" onPress={() => router.push("/cloud-health" as never)} style={{ marginTop: spacing.md }} />
        <Button title="Revoke public AI chat consent" variant="quiet" onPress={() => { AsyncStorage.removeItem(CHAT_CONSENT_KEY).then(() => setMessage("Public chat consent revoked. Your next conversation will ask before sending messages.")).catch(() => setActionError("Could not save your choice. Please retry.")); }} style={{ marginTop: spacing.sm }} />
      </View>
      <View style={{ marginTop: spacing.xxl }}><Eyebrow>Appearance</Eyebrow>
        <View style={[styles.segmented, { backgroundColor: p.surface2, borderColor: p.border }]}>
          {(["dark", "light", "system"] as ThemeChoice[]).map((value) => {
            const selected = choice === value;
            return <Pressable key={value} onPress={() => setChoice(value)} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.segment, selected && { backgroundColor: p.surface }]}>
              <Text style={{ fontSize: 13, color: selected ? p.text : p.text3, fontWeight: selected ? "600" : "400", textTransform: "capitalize" }}>{value}</Text>
            </Pressable>;
          })}
        </View>
      </View>

      <View style={{ marginTop: spacing.xxl }}><Eyebrow>Your data</Eyebrow>
        <Card style={{ marginTop: spacing.sm }}>
          <InfoRow icon="phone-portrait-outline" title="Stored on this device" value="No account or cloud sync" />
          <Divider />
          <Pressable onPress={exportData} disabled={working} accessibilityRole="button" style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.65 }]}>
            <Ionicons name="share-outline" size={18} color={p.accentText} />
            <View style={{ flex: 1 }}><Text style={[type.body, { color: p.text, fontWeight: "600" }]}>{working ? "Working…" : "Export my data"}</Text><Meta>Save a JSON backup of your profile, history and meals</Meta></View>
            <Ionicons name="chevron-forward" size={16} color={p.text3} />
          </Pressable>
          <Divider />
          <Pressable onPress={() => void restoreBackup()} disabled={!ready || working} accessibilityRole="button" style={styles.actionRow}>
            <Ionicons name="download-outline" size={18} color={p.accentText} />
            <View style={{ flex: 1 }}><Text style={[type.body, { color: p.text, fontWeight: "600" }]}>Import a backup</Text><Meta>Add missing entries without replacing your data</Meta></View>
          </Pressable>
          <Divider />
          <Pressable onPress={() => { setConfirmText(""); setConfirmVisible(true); }} disabled={working} accessibilityRole="button" style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.65 }]}>
            <Ionicons name="trash-outline" size={18} color={p.attentionText} />
            <View style={{ flex: 1 }}><Text style={[type.body, { color: p.attentionText, fontWeight: "600" }]}>Delete my health data</Text><Meta>Remove your profile and meal journal</Meta></View>
            <Ionicons name="chevron-forward" size={16} color={p.text3} />
          </Pressable>
        </Card>
        <View style={[styles.privacy, { backgroundColor: p.surface2, borderColor: p.border }]}>
          <Ionicons name="lock-closed-outline" size={15} color={p.text3} />
          <Text style={[type.meta, { color: p.text3, flex: 1, lineHeight: 18 }]}>This build saves your profile, health history and meal journal on this device. Barcode lookup sends only a product code to Open Food Facts. AI chat sends only the messages you choose to send after consent. Shared records use a separate private account. Local journal and chat storage are not encrypted by NutritiScan.</Text>
        </View>
      </View>

      {!!error && <Card tone="attention" style={{ marginTop: spacing.lg, padding: spacing.base }}><Meta>{error}</Meta><Button title="Retry loading" onPress={() => void retry()} style={{ marginTop: spacing.sm }} /></Card>}
      {!!message && <Text accessibilityLiveRegion="polite" style={[type.meta, { color: p.steadyText, marginTop: spacing.lg, lineHeight: 19 }]}>{message}</Text>}
      {!!actionError && <Text accessibilityRole="alert" style={[type.meta, { color: p.attentionText, marginTop: spacing.lg }]}>{actionError}</Text>}
      <Text style={[type.meta, { color: p.text3, marginTop: spacing.xl, lineHeight: 18 }]}>NutritiScan is a record-keeping companion. It does not diagnose, prescribe, or replace a licensed clinician.</Text>
    </ScrollView>
    <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => { if (!working) setConfirmVisible(false); }}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: spacing.lg }}>
        <Card style={{ width: "100%", maxWidth: 380, padding: spacing.lg }}>
          <Eyebrow tone="attention">CLEAR LOCAL DATA</Eyebrow>
          <Text style={[type.h3, { color: p.text, marginTop: spacing.md }]}>Delete your health data?</Text>
          <Meta style={{ marginTop: spacing.md, lineHeight: 20 }}>This permanently removes your profile, meals, local history and conversations on this device. Shared account data must be deleted separately from the shared dashboard. Export a backup first if you want to keep a copy.</Meta>
          <FormField label="Type DELETE to confirm" value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" placeholder="DELETE" />
          {!!actionError && <Meta style={{ color: p.attentionText, marginTop: spacing.sm }}>{actionError}</Meta>}
          <Button variant="primary" title={working ? "Clearing…" : "Delete all data"} disabled={confirmText !== "DELETE" || working} onPress={() => void eraseData()} style={{ marginTop: spacing.lg }} />
          <Button title="Cancel" variant="secondary" disabled={working} onPress={() => setConfirmVisible(false)} style={{ marginTop: spacing.sm }} />
        </Card>
      </View>
    </Modal>
    </>
  );
}

function InfoRow({ icon, title, value }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string }) {
  const p = usePalette();
  return <View style={styles.infoRow}><Ionicons name={icon} size={17} color={p.text3} /><Text style={[type.body, { color: p.text, flex: 1, fontWeight: "600" }]}>{title}</Text><Text style={[type.meta, { color: p.text3, maxWidth: 130, textAlign: "right" }]} numberOfLines={2}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  segmented: { flexDirection: "row", borderWidth: 1, borderRadius: radius.md, padding: 4, marginTop: spacing.md },
  segment: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.sm },
  infoRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  actionRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  privacy: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.md },
});
