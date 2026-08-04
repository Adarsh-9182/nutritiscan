// ============================================================
// MEDICINE · RESPONSIBLY
//
// "The one genuinely actionable fact gets the amber card; dosing
// advice is explicitly deferred to a clinician."
//
// The editorial line is enforced in src/domain/medicines.ts —
// there is no `dose` field to render. What this screen adds is
// the VISUAL hierarchy that makes the line legible:
//
//   - Purpose gets a plain card. It's context, not action.
//   - TIMING gets the only amber card, because it is the one
//     thing here that changes what the user does in the next
//     hour, and getting it wrong quietly wastes the medicine.
//   - Interactions, effects and storage are a reference table.
//   - The disclaimer is last, unmissable, and not dismissible.
//
// Note what is NOT prominent: side effects. Leading with "dark
// stools, nausea" is how you talk someone out of a medicine their
// doctor prescribed. Present and honest, but reference material.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { ScreenBody, ScreenHeader } from "@/components/Screen";
import { EmptyState } from "@/components/states";
import { Badge, Body, Card, Disclaimer, Divider, Eyebrow, H1 } from "@/components/ui";
import { MEDICINE_DISCLAIMER, SEVERITY_LABEL, medicineById, yourItemClashes } from "@/domain/medicines";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function MedicineScreen() {
  const p = usePalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicine = medicineById(String(id));

  const [reminderOn, setReminderOn] = useState(false);
  const [showInteractions, setShowInteractions] = useState(false);

  if (!medicine) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <ScreenHeader backTo="/records" title="Medicine" />
        <EmptyState
          icon="medkit-outline"
          title="That medicine isn't in your records"
          body="Scan the box and it will be added, with its timing and any interactions against what you already take."
          actionLabel="Scan a medicine"
          onAction={() => router.replace({ pathname: "/scan", params: { mode: "medicine" } })}
        />
      </View>
    );
  }

  const clashes = yourItemClashes(medicine);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader backTo="/records" title="Scanned medicine" />

      <ScreenBody>
        {/* Identity */}
        <View style={[styles.identity, { marginTop: spacing.base }]}>
          <View style={[styles.box, { backgroundColor: p.surface2, borderColor: p.borderStrong }]}>
            <Ionicons name="medkit-outline" size={22} color={p.text3} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <H1>{medicine.name}</H1>
            <Text style={[type.meta, { color: p.text3, marginTop: 4 }]}>
              {medicine.kind} · {medicine.form}
            </Text>
          </View>
        </View>

        <Card style={{ padding: spacing.base, marginTop: spacing.xl }}>
          <Eyebrow>What it&apos;s for</Eyebrow>
          <Body style={{ marginTop: 8 }}>{medicine.purpose}</Body>
        </Card>

        {/* Timing: the one amber card. */}
        {medicine.timing && (
          <Card tone="attention" style={{ padding: spacing.base, marginTop: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="alert-circle-outline" size={13} color={p.attentionText} />
              <Text style={[type.eyebrow, { color: p.attentionText }]}>{medicine.timing.headline}</Text>
            </View>
            <Body style={{ marginTop: 8 }}>{medicine.timing.detail}</Body>
          </Card>
        )}

        {/* Reference table */}
        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.refRow}>
            <Text style={[type.body, { color: p.text2, flex: 1 }]}>Common effects</Text>
            <Text style={[type.meta, { color: p.text, textAlign: "right", flex: 1 }]}>
              {medicine.commonEffects.join(", ")}
            </Text>
          </View>
          <Divider />

          <Pressable
            onPress={() => setShowInteractions(true)}
            style={({ pressed }) => [styles.refRow, pressed && { backgroundColor: p.surface2 }]}
          >
            <Text style={[type.body, { color: p.text2, flex: 1 }]}>Interacts with</Text>
            <Text style={[type.meta, { color: p.attentionText, fontWeight: "600" }]}>
              {clashes > 0 ? `${clashes} of your items` : "Nothing of yours"}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={p.text3} />
          </Pressable>
          <Divider />

          <View style={styles.refRow}>
            <Text style={[type.body, { color: p.text2, flex: 1 }]}>Storage</Text>
            <Text style={[type.meta, { color: p.text }]}>{medicine.storage}</Text>
          </View>
        </Card>

        {/* Reminder */}
        {medicine.reminder && (
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.refRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.body, { color: p.text, fontWeight: "600" }]}>
                  Remind me at {medicine.reminder.time}
                </Text>
                <Text style={[type.meta, { color: p.text3, marginTop: 2 }]}>{medicine.reminder.why}</Text>
              </View>
              <Switch
                value={reminderOn}
                onValueChange={setReminderOn}
                trackColor={{ false: p.surface3, true: p.accent }}
                thumbColor="#fff"
                accessibilityLabel={`Remind me at ${medicine.reminder.time}`}
              />
            </View>
          </Card>
        )}

        {/* The line that cannot be dismissed. */}
        <Disclaimer icon="time-outline">{MEDICINE_DISCLAIMER}</Disclaimer>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/ask/[id]",
              params: {
                id: "new",
                q: `Help me write the question to ask my doctor about ${medicine.name}.`,
              },
            })
          }
          style={{ marginTop: spacing.sm }}
        >
          <Text style={{ color: p.accentText, fontSize: 13, fontWeight: "600" }}>
            Prepare that question →
          </Text>
        </Pressable>
      </ScreenBody>

      {/* Interactions detail */}
      <Modal
        visible={showInteractions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInteractions(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: p.overlay }]}
          onPress={() => setShowInteractions(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: p.bgElevated, borderColor: p.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHead}>
              <Text style={[type.h3, { color: p.text }]}>Interactions</Text>
              <Pressable onPress={() => setShowInteractions(false)} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={p.text3} />
              </Pressable>
            </View>

            {medicine.interactions.map((i) => (
              <View key={i.with} style={{ marginBottom: spacing.lg }}>
                <View style={styles.interactionHead}>
                  <Text style={[type.h3, { color: p.text }]}>{i.with}</Text>
                  <Badge tone={i.severity === "note" ? "steady" : "attention"}>
                    {SEVERITY_LABEL[i.severity]}
                  </Badge>
                  {i.fromYourItems && <Badge tone="evidence">Yours</Badge>}
                </View>
                <Body style={{ marginTop: 6 }}>{i.what}</Body>
                {i.spaceHours && (
                  <Text style={[type.meta, { color: p.text3, marginTop: 4 }]}>
                    Leave at least {i.spaceHours} hour{i.spaceHours === 1 ? "" : "s"} between them.
                  </Text>
                )}
              </View>
            ))}

            <Text style={[type.meta, { color: p.text3 }]}>
              Checked against the medicines and restrictions in your own records. It cannot know about
              anything you haven&apos;t told it.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "flex-start", gap: spacing.base },
  box: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  interactionHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
});
