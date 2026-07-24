import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { Gauge, ProgressRing } from "@/components/Rings";
import { Screen } from "@/components/Screen";
import { fetchDailyBriefing, fetchTodayIntake, TodayIntake } from "@/lib/ai";
import {
  deleteMeal,
  fetchTodayMeals,
  fetchTodayWaterMl,
  logWater,
  MealEntry,
} from "@/lib/health";
import { useSession } from "@/lib/session";
import { colors, elevation, radius, spacing, type } from "@/theme";

const GLASS_ML = 250;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { profile } = useSession();
  const router = useRouter();
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [intake, setIntake] = useState<TodayIntake | null>(null);
  const [waterMl, setWaterMl] = useState(0);
  const [meals, setMeals] = useState<MealEntry[]>([]);

  const loadBriefing = useCallback(async () => {
    setBriefingError(null);
    try {
      setBriefing(await fetchDailyBriefing());
    } catch (err) {
      setBriefingError(
        err instanceof Error ? err.message : "Couldn't load your briefing",
      );
    }
  }, []);

  useEffect(() => {
    loadBriefing();
  }, [loadBriefing]);

  const loadDay = useCallback(() => {
    fetchTodayIntake().then(setIntake).catch(() => {});
    fetchTodayWaterMl().then(setWaterMl).catch(() => {});
    fetchTodayMeals().then(setMeals).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDay();
    }, [loadDay]),
  );

  const handleAddWater = () => {
    const previous = waterMl;
    setWaterMl(previous + GLASS_ML); // optimistic — a tap should feel instant
    logWater(GLASS_ML).catch(() => setWaterMl(previous));
  };

  const handleDeleteMeal = (meal: MealEntry) => {
    Alert.alert("Delete meal", `Remove "${meal.name}" from today's log?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteMeal(meal.id)
            .then(loadDay)
            .catch(() => Alert.alert("Couldn't delete", "Please try again.")),
      },
    ]);
  };

  // ---- Derived numbers ------------------------------------------------------
  const calTarget = profile?.target_calories ?? 0;
  const eaten = intake?.calories ?? 0;
  const left = calTarget - eaten;
  const over = left < 0;
  const calProgress = calTarget ? eaten / calTarget : 0;

  const proteinTarget = profile?.target_protein_g ?? 0;
  const proteinEaten = intake?.proteinG ?? 0;

  const waterTarget = profile?.target_water_ml ?? 0;

  const sleepHours = profile?.target_sleep_min
    ? Math.round(profile.target_sleep_min / 60)
    : 0;

  return (
    <Screen scroll>
      <Text style={styles.greeting}>
        {greeting()}
        {profile?.display_name ? `, ${profile.display_name}` : ""}.
      </Text>
      <Text style={styles.subGreeting}>Here's your day, simplified.</Text>

      {/* Hero — calorie ring */}
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Today</Text>
        <View style={styles.heroStats}>
          <HeroStat label="Target" value={calTarget ? `${calTarget}` : "—"} />
          <HeroStat label="Eaten" value={`${Math.round(eaten)}`} center />
          <HeroStat
            label="Left"
            value={calTarget ? `${Math.abs(Math.round(left))}` : "—"}
            align="right"
          />
        </View>

        <View style={styles.ringWrap}>
          <ProgressRing
            progress={calProgress}
            color={over ? colors.danger : colors.primary}
            colorBright={over ? "#FDA4AF" : colors.primaryBright}
          >
            <Text style={styles.ringNumber}>
              {calTarget ? Math.abs(Math.round(left)) : "—"}
            </Text>
            <Text style={styles.ringUnit}>kcal {over ? "over" : "left"}</Text>
          </ProgressRing>
        </View>
      </View>

      {/* Secondary metrics */}
      <Card style={styles.gaugeCard}>
        <Gauge
          label="Protein"
          value={`${Math.round(proteinEaten)}g`}
          progress={proteinTarget ? proteinEaten / proteinTarget : 0}
          color={colors.protein}
        />
        <Pressable onPress={handleAddWater} hitSlop={8}>
          <Gauge
            label="Water"
            value={`${(waterMl / 1000).toFixed(1)}L`}
            progress={waterTarget ? waterMl / waterTarget : 0}
            color={colors.primary}
          />
          <Text style={styles.tapHint}>+ tap</Text>
        </Pressable>
        <Gauge
          label="Sleep"
          value={sleepHours ? `${sleepHours}h` : "—"}
          progress={sleepHours ? sleepHours / 9 : 0}
          color={colors.carbs}
        />
      </Card>

      {/* Daily AI Briefing */}
      <Card style={styles.briefingCard}>
        <View style={styles.briefingHeader}>
          <Ionicons name="sparkles" size={15} color={colors.primary} />
          <Text style={styles.briefingTitle}>Today's Briefing</Text>
        </View>
        {briefing ? (
          <Text style={styles.briefingText}>{briefing}</Text>
        ) : briefingError ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.briefingText}>
              I couldn't prepare your briefing right now.
            </Text>
            <Pressable onPress={loadBriefing}>
              <Text style={styles.retry}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.briefingLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.briefingLoadingText}>
              Your AI is preparing today's plan…
            </Text>
          </View>
        )}
      </Card>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <Pressable
        onPress={() => router.push("/(tabs)/scan")}
        style={{ marginBottom: spacing.sm }}
      >
        <Card style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <Ionicons name="scan" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Scan a meal</Text>
            <Text style={styles.actionSubtitle}>
              {intake?.mealCount
                ? `${intake.mealCount} meal${intake.mealCount > 1 ? "s" : ""} logged today.`
                : "Photo in, calories and macros out."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Card>
      </Pressable>
      <Pressable
        onPress={() => router.push("/report")}
        style={{ marginBottom: spacing.sm }}
      >
        <Card style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <Ionicons name="document-text" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Analyze a report</Text>
            <Text style={styles.actionSubtitle}>
              Read a blood panel — values explained, saved to your record.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Card>
      </Pressable>
      <Pressable onPress={() => router.push("/(tabs)/chat")}>
        <Card style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <Ionicons
              name="chatbubble-ellipses"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Ask your AI</Text>
            <Text style={styles.actionSubtitle}>
              Meals, workouts, sleep — anything about your health.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Card>
      </Pressable>

      {/* Today's meals */}
      {meals.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Today's meals</Text>
          <Card style={{ paddingVertical: spacing.xs }}>
            {meals.map((meal, i) => (
              <View
                key={meal.id}
                style={[styles.mealRow, i > 0 && styles.mealRowBorder]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealName} numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <Text style={styles.mealMeta}>
                    {meal.loggedAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {"  ·  "}
                    {meal.calories} kcal · {Math.round(meal.proteinG)}g protein
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteMeal(meal)}
                  hitSlop={8}
                  style={styles.mealDelete}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.textTertiary}
                  />
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function HeroStat({
  label,
  value,
  center,
  align,
}: {
  label: string;
  value: string;
  center?: boolean;
  align?: "right";
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={[
          styles.heroStatValue,
          center && { textAlign: "center" },
          align === "right" && { textAlign: "right" },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.heroStatLabel,
          center && { textAlign: "center" },
          align === "right" && { textAlign: "right" },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: {
    ...type.largeTitle,
    color: colors.text,
    marginTop: spacing.md,
  },
  subGreeting: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Hero
  hero: {
    marginTop: spacing.lg,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    ...elevation.card,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.textSecondary,
  },
  heroStats: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  heroStatValue: {
    ...type.num,
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
  },
  heroStatLabel: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ringWrap: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  ringNumber: {
    ...type.hero,
    color: colors.text,
    lineHeight: 58,
  },
  ringUnit: {
    ...type.captionMedium,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Gauges
  gaugeCard: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingVertical: spacing.lg,
  },
  tapHint: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
    marginTop: 2,
  },

  // Briefing
  briefingCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderColor: "rgba(52,211,153,0.22)",
  },
  briefingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  briefingTitle: {
    ...type.captionMedium,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  briefingText: {
    ...type.body,
    color: colors.text,
  },
  briefingLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  briefingLoadingText: {
    ...type.caption,
    color: colors.textSecondary,
  },
  retry: {
    ...type.bodyMedium,
    color: colors.primary,
  },

  sectionTitle: {
    ...type.heading,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    ...type.bodyMedium,
    color: colors.text,
  },
  actionSubtitle: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  mealRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mealName: {
    ...type.bodyMedium,
    color: colors.text,
  },
  mealMeta: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mealDelete: {
    padding: spacing.xs,
  },
});
