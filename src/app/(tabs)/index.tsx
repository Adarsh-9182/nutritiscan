import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScrollPadding } from "@/components/Screen";
import { Body, Button, Card, Display, Eyebrow, Meta } from "@/components/ui";
import { useNow } from "@/lib/useNow";
import { summarizeDay } from "@/domain/journal";
import { useLocalHealth } from "@/lib/localHealth";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function AskHome() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pad = useScrollPadding();
  const { profile, meals, ready, error } = useLocalHealth();
  const now = useNow();
  const today = useMemo(() => summarizeDay(meals, now), [meals, now]);
  const todayMeals = today.meals;
  const calories = today.calories;
  const protein = today.proteinG;
  const measuredCalories = today.caloriesCount;
  const measuredProtein = today.proteinCount;
  const greeting = profile?.name ? `Good ${now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, ${profile.name.split(" ")[0]}.` : "Good food.\nBetter awareness.";

  return (
    <ScrollView
      // An explicit zero basis lets the flex layout allocate only the
      // viewport above the tab bar. Without it, Safari can size the web
      // ScrollView to its content and the PhoneFrame clips the overflow.
      style={{ flex: 1, height: 0, overflow: "scroll", backgroundColor: p.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: pad, paddingTop: insets.top + spacing.lg }}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
    >
      <View style={styles.identity}>
        <Text style={[type.eyebrow, { color: p.accentText }]}>NUTRITISCAN</Text>
        <Pressable onPress={() => router.push("/you")} accessibilityRole="button" accessibilityLabel="Your profile and settings" style={[styles.avatar, { backgroundColor: p.surface2, borderColor: p.border }]}>
          <Ionicons name="person-outline" size={17} color={p.text2} />
        </Pressable>
      </View>

      <Display>{greeting}</Display>
      <Body style={{ marginTop: 8, maxWidth: 320 }}>
        {profile ? "A small daily habit. A clearer picture of what you eat." : "Log what you eat, understand your week, and keep your journal close."}
      </Body>

      <Button title="Log a meal" variant="primary" icon="add" onPress={() => router.push("/scan")} style={{ marginTop: spacing.lg }} />

      {!profile && (
        <Card tone="accent" style={{ marginTop: spacing.xl, padding: spacing.base }}>
          <Eyebrow tone="accent">Make it yours</Eyebrow>
          <Text style={[type.body, { color: p.text, marginTop: 8 }]}>Add your name and goals. All other details are optional.</Text>
          <Button title="Set up your profile" variant="primary" icon="person-add-outline" onPress={() => router.push("/health-profile")} style={{ marginTop: spacing.md }} />
        </Card>
      )}

      <View style={styles.sectionHead}>
        <View>
          <Eyebrow>Today</Eyebrow>
          <Meta style={{ marginTop: 3 }}>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</Meta>
        </View>
        <Pressable onPress={() => router.push("/health")} accessibilityRole="button" style={styles.link}>
          <Text style={{ color: p.accentText, fontSize: 13, fontWeight: "600" }}>See journal</Text>
          <Ionicons name="arrow-forward" size={14} color={p.accentText} />
        </Pressable>
      </View>

      <Card style={{ padding: spacing.base }}>
        <View style={styles.metrics}>
          <View style={{ flex: 1 }}>
            <Text style={[type.eyebrow, { color: p.text3 }]}>Calories entered</Text>
            <Text style={[styles.metric, { color: p.text }]}>{ready && measuredCalories ? calories.toLocaleString() : "—"}<Text style={[type.meta, { color: p.text3 }]}> kcal</Text></Text>
            <Meta>{measuredCalories ? `from ${measuredCalories} meal${measuredCalories === 1 ? "" : "s"}` : "Add an estimate if you know it"}</Meta>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: p.border }]} />
          <View style={{ flex: 1 }}>
            <Text style={[type.eyebrow, { color: p.text3 }]}>Protein entered</Text>
            <Text style={[styles.metric, { color: p.text }]}>{ready && measuredProtein ? protein.toFixed(protein % 1 ? 1 : 0) : "—"}<Text style={[type.meta, { color: p.text3 }]}> g</Text></Text>
            <Meta>{measuredProtein ? `from ${measuredProtein} meal${measuredProtein === 1 ? "" : "s"}` : "No target assumed"}</Meta>
          </View>
        </View>
        <Text style={[type.meta, { color: p.text3, marginTop: spacing.md, lineHeight: 18 }]}>Only numbers you enter are included. A blank value is not counted as zero.</Text>
      </Card>

      {todayMeals.length > 0 && <Button title="Log another meal" variant="secondary" icon="add" onPress={() => router.push("/scan")} style={{ marginTop: spacing.md }} />}

      <View style={{ marginTop: spacing.xxl }}>
        <View style={styles.sectionHead}>
          <Eyebrow>Meals today</Eyebrow>
          <Meta>{todayMeals.length} logged</Meta>
        </View>
        {!ready ? (
          <Card><Body>Loading meals saved on this device…</Body></Card>
        ) : todayMeals.length === 0 ? (
          <Card style={{ alignItems: "center", padding: spacing.xl }}>
            <View style={[styles.emptyIcon, { backgroundColor: p.surface2 }]}><Ionicons name="restaurant-outline" size={22} color={p.text3} /></View>
            <Text style={[type.body, { color: p.text, fontWeight: "600", marginTop: spacing.md }]}>Nothing logged yet</Text>
            <Meta style={{ textAlign: "center", marginTop: 4 }}>Your entries will appear here. No meals or nutrition are guessed for you.</Meta>
            <Pressable onPress={() => router.push("/scan")} accessibilityRole="button" style={{ marginTop: spacing.md }}><Text style={{ color: p.accentText, fontWeight: "600" }}>Add your first meal</Text></Pressable>
          </Card>
        ) : (
          <Card>
            {todayMeals.slice(0, 5).map((meal, index) => (
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${meal.name}`} onPress={() => router.push({ pathname: "/scan", params: { id: meal.id } })} key={meal.id} style={[styles.mealRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border }]}>
                <View style={[styles.mealIcon, { backgroundColor: p.surface2 }]}><Ionicons name="restaurant-outline" size={15} color={p.text3} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.body, { color: p.text, fontWeight: "600" }]} numberOfLines={1}>{meal.name}</Text>
                  <Meta style={{ marginTop: 2 }}>{new Date(meal.loggedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{meal.calories !== undefined ? ` · ${meal.calories} kcal` : " · calories not entered"}{meal.proteinG !== undefined ? ` · ${meal.proteinG} g protein` : ""}</Meta>
                  {!!meal.note && <Meta numberOfLines={1} style={{ marginTop: 2 }}>{meal.note}</Meta>}
                </View>
              </Pressable>
            ))}
            {todayMeals.length > 5 && <Pressable onPress={() => router.push("/history")} style={{ padding: spacing.md, alignItems: "center" }}><Text style={{ color: p.accentText, fontWeight: "600" }}>View all {todayMeals.length} meals</Text></Pressable>}
          </Card>
        )}
      </View>

      {!!error && <Text accessibilityRole="alert" style={[type.meta, { color: p.attentionText, marginTop: spacing.md }]}>{error}</Text>}

      <View style={[styles.disclaimer, { borderTopColor: p.border }]}>
        <Ionicons name="lock-closed-outline" size={14} color={p.text3} />
        <Text style={[type.meta, { color: p.text3, flex: 1 }]}>Saved on this device. NutritiScan does not diagnose or replace a clinician.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xl },
  avatar: { width: 36, height: 36, borderRadius: radius.full, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xxl, marginBottom: spacing.md },
  link: { flexDirection: "row", alignItems: "center", gap: 5 },
  metrics: { flexDirection: "row", alignItems: "stretch", gap: spacing.md },
  metricDivider: { width: StyleSheet.hairlineWidth },
  metric: { fontSize: 25, fontWeight: "700", marginTop: spacing.sm, marginBottom: 3, fontVariant: ["tabular-nums"] },
  emptyIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  mealRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  mealIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xxl, paddingTop: spacing.md },
});
