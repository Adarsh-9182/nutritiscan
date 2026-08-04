// ============================================================
// HEALTH · TRENDS
//
// "The written summary sits above the charts, because a sentence
// beats a sparkline. Only four metrics — anything else is
// available by asking."
//
// Both halves matter.
//
// THE SENTENCE FIRST. A sparkline shows a shape; it does not tell
// you what the shape means or which of four shapes to care about.
// Putting the summary above the charts means the user has already
// been told the answer before they start doing pattern
// recognition on their own body — work they are not equipped for
// and should not be doing at 7am.
//
// FOUR METRICS, NOT FOURTEEN. Every extra tile costs attention
// and adds a judgement the user has to make about themselves. The
// other ten still exist — one question away. That is the whole
// bet of this product: an index is worse than an answer.
//
// This is also the only place a dashboard-shaped thing is allowed
// to exist at all, and it is deliberately behind a tab rather
// than on the home screen.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart, Sparkline } from "@/components/charts";
import { useScrollPadding } from "@/components/Screen";
import { Card, Eyebrow, H1 } from "@/components/ui";
import { JULY_PANEL, delta, markerById } from "@/domain/labs";
import { ENERGY_CURVE, IRON_INTAKE, SLEEP, WEIGHT, hoursLabel } from "@/domain/persona";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function HealthScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pad = useScrollPadding();

  const sleepNow = SLEEP.points[SLEEP.points.length - 1].v;
  const sleepFirst = SLEEP.points[0].v;
  const sleepDelta = Math.round((sleepNow - sleepFirst) * 60);
  const ironNow = IRON_INTAKE.points[IRON_INTAKE.points.length - 1].v;
  const ironFirst = IRON_INTAKE.points[0].v;
  const weightNow = WEIGHT.points[WEIGHT.points.length - 1].v;

  const labRows = ["ferritin", "ldl", "hba1c"]
    .map((id) => markerById(JULY_PANEL, id))
    .filter((m): m is NonNullable<typeof m> => !!m);

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
      <H1 style={{ marginBottom: spacing.lg }}>Health</H1>

      {/* The sentence, above the charts. */}
      <Card tone="accent" style={{ padding: spacing.base }}>
        <Eyebrow tone="accent">Four weeks, in one line</Eyebrow>
        <Text style={[type.body, { color: p.text, marginTop: 8 }]}>
          Protein and iron are both up. Sleep is the weak link — {hoursLabel(sleepNow)} average, and the
          fatigue days cluster after the short nights.
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/ask/[id]",
              params: {
                id: "new",
                q: "Why does my fatigue cluster after short nights? What should I change first?",
              },
            })
          }
          style={({ pressed }) => [styles.inlineAction, pressed && { opacity: 0.7 }]}
        >
          <Text style={{ color: p.accentText, fontSize: 13.5, fontWeight: "600" }}>
            Ask what to change first
          </Text>
          <Ionicons name="arrow-forward" size={15} color={p.accentText} />
        </Pressable>
      </Card>

      {/* Four metrics. Not five. */}
      <View style={styles.grid}>
        <StatTile
          label="Iron intake"
          value={`${ironNow}`}
          unit="mg avg"
          delta={`+${(ironNow - ironFirst).toFixed(1)} vs week 1`}
          good
          points={IRON_INTAKE.points}
        />
        <StatTile
          label="Sleep"
          value={hoursLabel(sleepNow)}
          delta={`${sleepDelta > 0 ? "+" : ""}${sleepDelta}m vs week 1`}
          good={sleepDelta >= 0}
          points={SLEEP.points}
        />
        <StatTile label="Weight" value={`${weightNow}`} unit="kg" delta="Steady" good points={WEIGHT.points} />
        <StatTile
          label="Resting HR"
          value="—"
          delta="Not recorded"
          good
        />
      </View>

      {/* The energy curve — self-reported, and labelled so. */}
      <Card style={{ padding: spacing.base, marginTop: spacing.md }}>
        <LineChart
          label={ENERGY_CURVE.label}
          unit={ENERGY_CURVE.unit}
          points={ENERGY_CURVE.points}
          markAt="4pm"
          height={140}
          footnote="Self-reported, so treat it as a pattern rather than a measurement."
        />
      </Card>

      {/* Lab trends */}
      <View style={{ marginTop: spacing.xxl }}>
        <View style={styles.sectionHead}>
          <Eyebrow>Lab trends</Eyebrow>
          <Pressable onPress={() => router.push("/labs")}>
            <Text style={{ color: p.accentText, fontSize: 13, fontWeight: "600" }}>Full panel</Text>
          </Pressable>
        </View>

        <Card>
          {labRows.map((m, i) => {
            const move = delta(m);
            const prev = m.history?.[m.history.length - 1];
            return (
              <Pressable
                key={m.id}
                onPress={() => router.push({ pathname: "/labs/[marker]", params: { marker: m.id } })}
                style={({ pressed }) => [
                  styles.labRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                  pressed && { backgroundColor: p.surface2 },
                ]}
              >
                <Text style={[type.body, { color: p.text2, flex: 1 }]}>{m.name}</Text>
                <Text
                  style={[
                    type.meta,
                    type.num,
                    { color: m.tone === "attention" ? p.attentionText : p.steadyText, fontWeight: "600" },
                  ]}
                >
                  {prev && move && move.direction !== "flat" ? `${prev.value} → ${m.value}` : `${m.value}`}{" "}
                  {m.unit}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      </View>

      {/* The plan lives here, not in a tab. */}
      <Pressable onPress={() => router.push("/plan")} style={{ marginTop: spacing.base }}>
        <Card style={styles.planCard}>
          <View style={[styles.planIcon, { backgroundColor: p.accentSoft }]}>
            <Ionicons name="calendar-outline" size={17} color={p.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { color: p.text, fontWeight: "600" }]}>This week&apos;s meals</Text>
            <Text style={[type.meta, { color: p.text3, marginTop: 2 }]}>
              Built around your ferritin and LDL
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={17} color={p.text3} />
        </Card>
      </Pressable>

      <Text style={[type.meta, { color: p.text3, marginTop: spacing.xl }]}>
        Anything not shown here is one question away — this page holds the four things worth watching, not
        everything that could be measured.
      </Text>
    </ScrollView>
  );
}

/**
 * A stat tile.
 *
 * The delta wears a TEXT token, not the series colour — green and
 * amber text on a small tile is the fastest way to make a calm
 * screen read as a scoreboard. Direction is carried by the words
 * ("+3.7 vs week 1"), which also survives colourblindness.
 */
function StatTile({
  label,
  value,
  unit,
  delta: deltaLabel,
  good,
  points,
}: {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  good: boolean;
  points?: { t: string; v: number }[];
}) {
  const p = usePalette();
  return (
    <Card style={styles.tile}>
      <Text style={[type.eyebrow, { color: p.text3 }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: p.text }]}>
        {value}
        {unit ? <Text style={[type.meta, { color: p.text3 }]}> {unit}</Text> : null}
      </Text>
      <Text style={[type.meta, { color: good ? p.text2 : p.attentionText, marginTop: 2 }]}>
        {deltaLabel}
      </Text>
      {points && <Sparkline points={points} height={26} style={{ marginTop: spacing.sm }} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  inlineAction: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.base },
  tile: { width: "47.5%", flexGrow: 1, padding: spacing.md },
  tileValue: { fontSize: 22, fontWeight: "700", marginTop: 6, letterSpacing: -0.5 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  labRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  planCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.base },
  planIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
});
