// ============================================================
// LAB SUMMARY — THE CALM SCREEN
//
// The most important screen in the product to get right, because
// it is the one where a person is most frightened and least
// equipped.
//
// A standard lab report is 38 rows, alphabetical, with red
// asterisks on the two that are out of range. It is optimised for
// a clinician scanning for exceptions, and it is actively hostile
// to the patient holding it.
//
// Four inversions, each visible below:
//
// 1. THE HEADLINE COUNTS WHAT IS FINE. "36 of 38 markers are
//    where they should be" comes first, at display size.
// 2. THE 36 GOOD ONES COLLAPSE INTO ONE GREEN LINE. Reachable,
//    not hidden — 36 rows of "normal" is how the two that matter
//    get lost.
// 3. NOTHING IS RED. The two flagged markers are amber, because
//    "above target" is not "danger". There is no red token in the
//    theme to reach for.
// 4. THE EXIT IS A CONVERSATION WITH A HUMAN — three questions to
//    bring to a doctor. Not an upsell, not a supplement.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sparkline } from "@/components/charts";
import { ScreenBody, ScreenHeader, Section } from "@/components/Screen";
import { Badge, Body, Card, Chip, Display } from "@/components/ui";
import {
  DOCTOR_QUESTIONS,
  FLAG_LABEL,
  JULY_PANEL,
  attentionMarkers,
  calmGroups,
  delta,
  steadyCount,
  steadyMarkers,
} from "@/domain/labs";
import { formatLongDate } from "@/domain/records";
import { spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function LabSummary() {
  const p = usePalette();
  const router = useRouter();
  const panel = JULY_PANEL;
  const [expanded, setExpanded] = useState(false);

  const { steady, total } = steadyCount(panel);
  const attention = attentionMarkers(panel);
  const calm = calmGroups(panel);
  const fine = steadyMarkers(panel);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader
        backTo="/records"
        eyebrow={`Panel · ${formatLongDate(panel.date)}`}
        trailing={
          <Pressable accessibilityRole="button" accessibilityLabel="Share this summary" hitSlop={10}>
            <Ionicons name="share-outline" size={20} color={p.accentText} />
          </Pressable>
        }
      />

      <ScreenBody>
        {/* 1 — The headline counts what is fine. */}
        <Display style={{ marginTop: spacing.base }}>
          {steady} of {total} markers are where they should be.
        </Display>
        <Body style={{ marginTop: spacing.md }}>
          {attention.length === 0
            ? "Nothing on this panel needs a conversation."
            : `${attention.length === 1 ? "One is" : `${attention.length} are`} worth attention — neither is urgent, and both respond to what you eat.`}
        </Body>

        {/* 2 — The good news, collapsed into one line. */}
        <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
          <Card tone="steady" style={{ padding: spacing.base, marginTop: spacing.lg }}>
            <View style={styles.calmRow}>
              <Ionicons name="checkmark" size={16} color={p.steadyText} style={{ marginTop: 2 }} />
              <Text style={[type.body, { color: p.text, flex: 1 }]}>
                {calm.join(", ").replace(/, ([^,]*)$/, " and $1")} all steady since March.
              </Text>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={p.steadyText}
                style={{ marginTop: 2 }}
              />
            </View>

            {expanded && (
              <View style={{ marginTop: spacing.md }}>
                {fine.map((m, i) => (
                  <Pressable
                    key={m.id}
                    onPress={() => router.push({ pathname: "/labs/[marker]", params: { marker: m.id } })}
                    style={({ pressed }) => [
                      styles.fineRow,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[type.body, { color: p.text2, flex: 1 }]} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={[type.meta, type.num, { color: p.text3 }]}>
                      {m.value} {m.unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
        </Pressable>

        {/* 3 — The exceptions. Amber, never red. */}
        {attention.length > 0 && (
          <Section title="Worth attention">
            {attention.map((m) => {
              const move = delta(m);
              const history = m.history ?? [];
              return (
                <Pressable
                  key={m.id}
                  onPress={() => router.push({ pathname: "/labs/[marker]", params: { marker: m.id } })}
                  style={{ marginBottom: spacing.md }}
                >
                  <Card style={{ padding: spacing.base }}>
                    <View style={styles.markerHead}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[type.h3, { color: p.text }]}>{m.name}</Text>
                        <Text style={[type.meta, { color: p.text3, marginTop: 2 }]}>{m.subtitle}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.markerValue, { color: p.text }]}>
                          {m.value}
                          <Text style={[type.meta, { color: p.text3 }]}> {m.unit}</Text>
                        </Text>
                        <View style={{ marginTop: 8 }}>
                          <Badge tone="attention">{FLAG_LABEL[m.flag]}</Badge>
                        </View>
                      </View>
                    </View>

                    {/* A shape, not a table. The sentence below
                        carries the meaning; this only shows which
                        way it has been moving. */}
                    {history.length > 1 && (
                      <Sparkline
                        points={[
                          ...history.map((h) => ({ t: h.date, v: h.value })),
                          { t: panel.date, v: m.value },
                        ]}
                        height={34}
                        style={{ marginTop: spacing.md }}
                      />
                    )}

                    <Text style={[type.body, { color: p.text2, marginTop: spacing.md }]}>{m.plain}</Text>

                    {move && (
                      <Text style={[type.meta, { color: p.text3, marginTop: 6 }]}>
                        {move.direction === "flat"
                          ? "Unchanged since the last panel."
                          : `${move.direction === "up" ? "Up" : "Down"} from ${move.from} ${m.unit} last time.`}
                      </Text>
                    )}
                  </Card>
                </Pressable>
              );
            })}
          </Section>
        )}

        {/* 4 — The exit is a human. */}
        <Section title="Three questions to bring to your doctor">
          <Card>
            {DOCTOR_QUESTIONS.map((q, i) => (
              <View
                key={q}
                style={[
                  styles.questionRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                ]}
              >
                <Text style={[type.meta, type.num, { color: p.accentText, fontWeight: "700" }]}>{i + 1}</Text>
                <Text style={[type.body, { color: p.text2, flex: 1 }]}>{q}</Text>
              </View>
            ))}
          </Card>
          <Text style={[type.meta, { color: p.text3, marginTop: spacing.sm }]}>
            Written as questions, not conclusions. Your clinician has context this app doesn&apos;t.
          </Text>
        </Section>

        <View style={styles.chipWrap}>
          <Chip
            tone="neutral"
            onPress={() =>
              router.push({
                pathname: "/ask/[id]",
                params: { id: "new", q: "Walk me through my July blood panel in plain language." },
              })
            }
          >
            Ask about this panel
          </Chip>
          <Chip tone="neutral" onPress={() => router.push("/plan")}>
            Build a week around it
          </Chip>
        </View>

        <Text style={[type.meta, { color: p.text3, marginTop: spacing.xl }]}>
          Reference ranges vary between laboratories. This explains your results — it does not diagnose, and
          it is not a substitute for the clinician who ordered them.
        </Text>
      </ScreenBody>
    </View>
  );
}

const styles = StyleSheet.create({
  calmRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  fineRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 9 },
  markerHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  markerValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  questionRow: { flexDirection: "row", gap: spacing.md, padding: spacing.base },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xl },
});
