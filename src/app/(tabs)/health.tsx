import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScrollPadding } from "@/components/Screen";
import { Body, Button, Card, Eyebrow, H1, Meta } from "@/components/ui";
import { useNow } from "@/lib/useNow";
import { summarizeDay, summarizeDays } from "@/domain/journal";
import { useLocalHealth } from "@/lib/localHealth";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function Health() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pad = useScrollPadding();
  const { meals, ready } = useLocalHealth();

  const now = useNow();
  const today = useMemo(() => summarizeDay(meals, now), [meals, now]);
  const todayMeals = today.meals;
  const calories = today.calories;
  const protein = today.proteinG;
  const week = useMemo(() => summarizeDays(meals, 7, now), [meals, now]);
  const maxCalories = Math.max(1, ...week.map((day) => day.calories));

  return (
    <ScrollView style={{ flex: 1, height: 0, overflow: "scroll", backgroundColor: p.bg }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: pad }} showsVerticalScrollIndicator={false}>
      <H1>Your journal</H1>
      <Body style={{ marginTop: spacing.sm }}>Your meals and your progress, one day at a time.</Body>

      <View style={styles.sectionHead}><Eyebrow>Today · {todayMeals.length} meals</Eyebrow><Meta>{now.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</Meta></View>
      <Card style={{ padding: spacing.base }}>
        <View style={styles.metricRow}>
          <Metric label="Calories entered" value={todayMeals.some((meal) => meal.calories !== undefined) ? calories.toLocaleString() : "—"} unit="kcal" />
          <View style={[styles.divider, { backgroundColor: p.border }]} />
          <Metric label="Protein entered" value={todayMeals.some((meal) => meal.proteinG !== undefined) ? protein.toFixed(protein % 1 ? 1 : 0) : "—"} unit="g" />
        </View>
        <Meta style={{ marginTop: spacing.md, lineHeight: 18 }}>These totals include only values you entered. They are not measured or checked against a personal target.</Meta>
      </Card>
      <Button title="Log a meal" variant="primary" icon="add" onPress={() => router.push("/scan")} style={{ marginTop: spacing.md }} />

      <View style={styles.sectionHead}><Eyebrow>Last 7 days</Eyebrow><Meta>Local meal journal</Meta></View>
      {!ready ? <Card><Body>Loading your journal…</Body></Card> : meals.length === 0 ? (
        <Card style={{ alignItems: "center", padding: spacing.xl }}>
          <View style={[styles.emptyIcon, { backgroundColor: p.surface2 }]}><Ionicons name="analytics-outline" size={21} color={p.text3} /></View>
          <Text style={[type.body, { color: p.text, fontWeight: "600", marginTop: spacing.md }]}>Your trends start with your first entry</Text>
          <Meta style={{ marginTop: 4, textAlign: "center" }}>Log meals as you go. This view will only use your own entries.</Meta>
        </Card>
      ) : (
        <Card>
          {week.map((day, index) => {
            const width = day.calories > 0 ? Math.max(5, day.calories / maxCalories * 100) : 0;
            return (
              <Pressable accessibilityRole="button" accessibilityLabel={`View meals on ${day.label}`} onPress={() => router.push({ pathname: "/history", params: { day: day.key } })} key={day.key} style={[styles.dayRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border }]}>
                <Text style={[type.meta, { color: p.text2, width: 48 }]}>{day.label}</Text>
                <View style={[styles.barTrack, { backgroundColor: p.surface2 }]}>
                  {!!width && <View style={[styles.bar, { width: `${width}%`, backgroundColor: p.accent }]} />}
                </View>
                <Text style={[type.meta, { color: p.text3, minWidth: 90, textAlign: "right" }]}>{day.caloriesCount ? `${day.calories.toLocaleString()} kcal` : `${day.meals.length} meal${day.meals.length === 1 ? "" : "s"}`}</Text>
              </Pressable>
            );
          })}
          <Meta style={{ paddingHorizontal: spacing.base, paddingBottom: spacing.md, lineHeight: 18 }}>Bars show calories you entered; days without calorie estimates show meal counts.</Meta>
        </Card>
      )}

      <Button title="View all meals" icon="list-outline" variant="secondary" onPress={() => router.push("/history")} style={{ marginTop: spacing.lg }} />

      <Pressable onPress={() => router.push("/health-profile")} accessibilityRole="button" style={[styles.profileLink, { borderColor: p.border, backgroundColor: p.surface }]}>
        <Ionicons name="person-circle-outline" size={21} color={p.accentText} />
        <View style={{ flex: 1 }}><Text style={[type.body, { color: p.text, fontWeight: "600" }]}>Health profile</Text><Meta>Review or edit details saved on this device</Meta></View>
        <Ionicons name="chevron-forward" size={17} color={p.text3} />
      </Pressable>
    </ScrollView>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  const p = usePalette();
  return <View style={{ flex: 1 }}><Text style={[type.eyebrow, { color: p.text3 }]}>{label}</Text><Text style={[styles.value, { color: p.text }]}>{value}<Text style={[type.meta, { color: p.text3 }]}> {unit}</Text></Text></View>;
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xxl, marginBottom: spacing.md },
  metricRow: { flexDirection: "row", gap: spacing.md },
  divider: { width: StyleSheet.hairlineWidth },
  value: { fontSize: 25, fontWeight: "700", marginTop: spacing.sm, fontVariant: ["tabular-nums"] },
  emptyIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  dayRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.base },
  barTrack: { height: 8, flex: 1, borderRadius: radius.full, overflow: "hidden" },
  bar: { height: "100%", borderRadius: radius.full },
  profileLink: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.base, marginTop: spacing.xxl },
});
