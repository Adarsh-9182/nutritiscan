// ============================================================
// YOU · PROFILE & SETTINGS
//
// "Goals live at the top because they're what the assistant
// reasons from. Training on personal data is off by default and
// says so."
//
// The ordering is an argument about what a settings screen is
// for. Most put identity first and preferences below, mirroring
// the database. This puts GOALS first, because goals are the
// input to every answer the product gives — a user who wants to
// understand why the app said something looks here, and finding
// "Raise ferritin, Lower LDL" is the explanation.
//
// On privacy: the copy describes what actually happens, in plain
// words, including the unflattering parts. A product asking for
// the most sensitive data a person has does not get to be vague
// about where it goes.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScrollPadding } from "@/components/Screen";
import { Badge, Card, Divider, Eyebrow, H1, Row } from "@/components/ui";
import { DEV } from "@/domain/persona";
import { RECORDS, formatLongDate } from "@/domain/records";
import { radius, spacing, type } from "@/theme";
import { useTheme, usePalette, type ThemeChoice } from "@/theme/context";

export default function You() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pad = useScrollPadding();
  const { choice, setChoice } = useTheme();

  const [keepOnDevice, setKeepOnDevice] = useState(true);
  const [improveAnswers, setImproveAnswers] = useState(false);

  const confirmDelete = () =>
    Alert.alert(
      "Delete everything?",
      "This removes every record, logged meal, conversation and setting from this device. It cannot be undone, and there is no cloud copy to restore from.",
      [
        { text: "Keep it", style: "cancel" },
        { text: "Delete everything", style: "destructive", onPress: () => {} },
      ],
    );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingBottom: pad,
        paddingTop: insets.top + spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: p.accentSoft }]}>
          <Text style={{ color: p.accentText, fontSize: 15, fontWeight: "700" }}>{DEV.initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <H1>{DEV.name}</H1>
          <Text style={[type.meta, { color: p.text3, marginTop: 2 }]}>
            {DEV.age} · {DEV.heightCm} cm · {DEV.weightKg} kg · gluten-free
          </Text>
        </View>
      </View>

      {/* Goals first: this is what the assistant reasons from. */}
      <Card style={{ padding: spacing.base }}>
        <Eyebrow>What we&apos;re optimising for</Eyebrow>
        <View style={styles.goalWrap}>
          {DEV.goals.map((g) =>
            g.marker ? (
              <Pressable
                key={g.id}
                onPress={() => router.push({ pathname: "/labs/[marker]", params: { marker: g.marker! } })}
              >
                <Badge tone="accent">{g.label}</Badge>
              </Pressable>
            ) : (
              <Badge key={g.id}>{g.label}</Badge>
            ),
          )}
        </View>
        <Text style={[type.meta, { color: p.text3, marginTop: spacing.md }]}>
          Last reviewed {formatLongDate(DEV.goalsReviewed)}. We&apos;ll ask again when a new panel arrives.
        </Text>
      </Card>

      {/* Memory */}
      <View style={{ marginTop: spacing.xxl }}>
        <Eyebrow>Health memory</Eyebrow>
        <Card style={{ marginTop: spacing.sm }}>
          <Row
            icon="person-outline"
            title="Health profile"
            detail="Body, goals, habits, and where each fact came from"
            onPress={() => router.push("/health-profile")}
          />
          <Divider />
          <Row icon="alert-circle-outline" title="Allergies & conditions" value={DEV.restrictions.join(", ")} />
          <Divider />
          <Row
            icon="document-text-outline"
            title="Medical records"
            value={`${RECORDS.length} documents`}
            onPress={() => router.push("/records")}
          />
          <Divider />
          <Row
            icon="medkit-outline"
            title="Medicines"
            value="1 active"
            onPress={() =>
              router.push({ pathname: "/medicine/[id]", params: { id: "ferrous-fumarate-210" } })
            }
          />
          <Divider />
          <Row icon="heart-outline" title="Connected sources" value="Apple Health" />
        </Card>
      </View>

      {/* Privacy, stated plainly */}
      <View style={{ marginTop: spacing.xxl }}>
        <Eyebrow>Privacy</Eyebrow>
        <Card style={{ marginTop: spacing.sm }}>
          <ToggleRow
            label="Keep records on device"
            detail="No cloud copy of your files"
            value={keepOnDevice}
            onChange={setKeepOnDevice}
          />
          <Divider />
          <ToggleRow
            label="Use my data to improve answers"
            detail="Off by default"
            value={improveAnswers}
            onChange={setImproveAnswers}
          />
        </Card>

        {/* The honest version, not the reassuring version. */}
        <View style={[styles.note, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Ionicons name="lock-closed-outline" size={14} color={p.text3} style={{ marginTop: 2 }} />
          <Text style={[type.meta, { color: p.text3, flex: 1 }]}>
            Your health data lives on this device. It is not encrypted at rest and it is not synced anywhere.
            Questions you ask are sent to a model provider to be answered, along with the profile summary
            above — the documents themselves are not.
          </Text>
        </View>
      </View>

      {/* Appearance */}
      <View style={{ marginTop: spacing.xxl }}>
        <Eyebrow>Appearance</Eyebrow>
        <View style={[styles.segmented, { backgroundColor: p.surface2, borderColor: p.border }]}>
          {(["dark", "light", "system"] as ThemeChoice[]).map((c) => {
            const on = choice === c;
            return (
              <Pressable
                key={c}
                onPress={() => setChoice(c)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.segment, on && { backgroundColor: p.surface }]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: on ? p.text : p.text3,
                    fontWeight: on ? "600" : "400",
                    textTransform: "capitalize",
                  }}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Ownership. Deletion is a first-class action. */}
      <View style={{ marginTop: spacing.xxl }}>
        <Eyebrow>Your data</Eyebrow>
        <Card style={{ marginTop: spacing.sm }}>
          <Row icon="download-outline" title="Export everything" detail="One file, yours to keep" onPress={() => {}} />
          <Divider />
          <Row
            icon="trash-outline"
            tone="attention"
            title="Delete everything"
            detail="Removes every record, meal and answer from this device"
            onPress={confirmDelete}
          />
        </Card>
      </View>

      <Text style={[type.meta, { color: p.text3, marginTop: spacing.xl }]}>
        NutritiScan is an educational companion. It explains your data and helps you prepare questions — it
        does not diagnose, prescribe, or replace the clinician who knows you.
      </Text>
    </ScrollView>
  );
}

function ToggleRow({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const p = usePalette();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.body, { color: p.text, fontWeight: "600" }]}>{label}</Text>
        <Text style={[type.meta, { color: p.text3, marginTop: 2 }]}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: p.surface3, true: p.accent }}
        thumbColor="#fff"
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.base, marginBottom: spacing.xl },
  avatar: { width: 56, height: 56, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  goalWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  segmented: {
    flexDirection: "row",
    gap: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 4,
    marginTop: spacing.sm,
  },
  segment: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.sm },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
});
