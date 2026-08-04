// ============================================================
// BIOMARKER DETAIL
//
// "Range bar shows position, not pass/fail. Recommendations
// carry an evidence grade — the honest move, and it stops the app
// sounding certain about things it isn't."
//
// POSITION, NOT PASS/FAIL. A reference range drawn as a boundary
// invites one question: did I pass? Drawn as a span with a
// comfortable region inside it, the same data invites a better
// one: where am I, and which way am I moving? The value is
// identical; only the framing changed, and the framing is what
// decides whether someone panics.
//
// EVIDENCE GRADES. "Iron-rich food with vitamin C" and "cast-iron
// cooking" are not equally well-supported, and presenting them as
// a flat bulleted list is lying by omission. Grading them costs
// one badge and buys the right to be believed on the strong ones.
// ============================================================

import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LineChart, RangeBar } from "@/components/charts";
import { ScreenBody, ScreenHeader, Section } from "@/components/Screen";
import { Badge, Body, Card, Chip } from "@/components/ui";
import { EmptyState } from "@/components/states";
import {
  EVIDENCE_LABEL,
  FLAG_LABEL,
  JULY_PANEL,
  delta,
  markerById,
  positionPhrase,
  type EvidenceGrade,
} from "@/domain/labs";
import { spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

/**
 * Evidence grade → visual weight.
 *
 * `strong` is the only one that gets the confident treatment.
 * `mixed` and `limited` deliberately read quieter than the
 * surrounding text — a weakly-supported suggestion should look
 * like one.
 */
const GRADE_TONE: Record<EvidenceGrade, "evidence" | "neutral"> = {
  strong: "evidence",
  moderate: "evidence",
  mixed: "neutral",
  limited: "neutral",
};

const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

export default function BiomarkerScreen() {
  const p = usePalette();
  const router = useRouter();
  const { marker: markerId } = useLocalSearchParams<{ marker: string }>();

  const panel = JULY_PANEL;
  const marker = markerById(panel, String(markerId));

  if (!marker) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <ScreenHeader backTo="/labs" title="Marker" />
        <EmptyState
          icon="help-circle-outline"
          title="That marker isn't on this panel"
          body="It may have been on an earlier report. Open the full panel to see everything that was measured."
          actionLabel="Open the panel"
          onAction={() => router.replace("/labs")}
        />
      </View>
    );
  }

  const move = delta(marker);
  const position = positionPhrase(marker);
  const history = marker.history ?? [];

  const trend = [
    ...history.map((h) => ({ t: monthYear(h.date), v: h.value })),
    { t: monthYear(panel.date), v: marker.value },
  ];

  const spanLabel = (() => {
    const first = history[0]?.date;
    if (!first) return "one reading";
    const years =
      (new Date(panel.date).getTime() - new Date(first).getTime()) / (365.25 * 86_400_000);
    const rounded = Math.round(years);
    if (rounded < 1) return "under a year";
    return `${rounded} year${rounded === 1 ? "" : "s"}`;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader backTo="/labs" title={marker.name} />

      <ScreenBody>
        {/* The value. One hero figure per screen. */}
        <View style={styles.heroRow}>
          <Text style={[type.numeral, { color: p.text }]}>{marker.value}</Text>
          <Text style={[type.h3, { color: p.text3, marginBottom: 6 }]}>{marker.unit}</Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            {position && (
              <Badge tone={marker.tone === "attention" ? "attention" : "steady"}>{position}</Badge>
            )}
          </View>
        </View>

        <Text style={[type.meta, { color: p.text3, marginTop: 4 }]}>
          {marker.subtitle} · {FLAG_LABEL[marker.flag]}
        </Text>

        {/* Position along the range — the screen's central idea. */}
        <Card style={{ padding: spacing.base, marginTop: spacing.lg }}>
          <RangeBar
            value={marker.value}
            axis={marker.axis}
            comfortable={marker.comfortable}
            unit={marker.unit}
            label={marker.name}
          />
        </Card>

        {/* The trend. Slow-moving markers are the reason this
            exists: one reading is a data point, four is a story. */}
        {trend.length > 1 && (
          <Card style={{ padding: spacing.base, marginTop: spacing.md }}>
            <LineChart
              label={`${trend.length} panels, ${spanLabel}`}
              unit={` ${marker.unit}`}
              points={trend}
              threshold={{
                value: marker.comfortable[0],
                label: `Comfortable from ${marker.comfortable[0]}`,
              }}
              height={150}
              footnote={
                move
                  ? move.direction === "flat"
                    ? "Unchanged since the last panel."
                    : `${move.direction === "up" ? "Up" : "Down"} ${Math.abs(move.diff)} ${marker.unit} since ${monthYear(history[history.length - 1].date)}.`
                  : undefined
              }
            />
          </Card>
        )}

        {/* What it is, in words the reader doesn't need a degree
            for. Every number on this screen has a sentence. */}
        {marker.about && (
          <Section title="In plain terms">
            <Body>{marker.about}</Body>
          </Section>
        )}

        <Section title="What this reading means for you">
          <Body>{marker.plain}</Body>
        </Section>

        {/* Graded recommendations. */}
        {marker.helps && marker.helps.length > 0 && (
          <Section title="What tends to help">
            <Card>
              {marker.helps.map((h, i) => (
                <View
                  key={h.text}
                  style={[
                    styles.helpRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                  ]}
                >
                  <Text style={[type.body, { color: p.text2, flex: 1 }]}>{h.text}</Text>
                  <Badge tone={GRADE_TONE[h.grade]}>{EVIDENCE_LABEL[h.grade]}</Badge>
                </View>
              ))}
            </Card>
            <Text style={[type.meta, { color: p.text3, marginTop: spacing.sm }]}>
              Grades describe how well-studied each one is, not how well it will work for you.
            </Text>
          </Section>
        )}

        <View style={styles.chipWrap}>
          <Chip
            tone="neutral"
            onPress={() =>
              router.push({
                pathname: "/ask/[id]",
                params: {
                  id: "new",
                  q: `Explain my ${marker.name} of ${marker.value} ${marker.unit} and what I should do about it.`,
                },
              })
            }
          >
            Ask about this
          </Chip>
          <Chip tone="neutral" onPress={() => router.push("/plan")}>
            Build meals around it
          </Chip>
        </View>

        <Text style={[type.meta, { color: p.text3, marginTop: spacing.xl }]}>
          Reference ranges differ between laboratories, and a single value out of range is common in healthy
          people. Bring this to the clinician who ordered the test rather than acting on it alone.
        </Text>
      </ScreenBody>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md, marginTop: spacing.base },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xl },
});
