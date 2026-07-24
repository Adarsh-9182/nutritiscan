import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DayBarChart } from "@/components/DayBarChart";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { WeightTrend } from "@/components/WeightTrend";
import {
  DayPoint,
  fetchIntakeByDay,
  fetchSleepByDay,
  fetchWaterByDay,
  fetchWeightHistory,
  IntakeDay,
  logSleep,
  logWeight,
  WeightEntry,
} from "@/lib/health";
import { useSession } from "@/lib/session";
import { colors, radius, spacing, type } from "@/theme";

const DAYS = 7;
const WEIGHT_WINDOW_DAYS = 30;
const SLEEP_CHOICES_H = [6, 7, 8, 9];

export default function Progress() {
  const { profile, refreshProfile } = useSession();
  const [intake, setIntake] = useState<IntakeDay[]>([]);
  const [water, setWater] = useState<DayPoint[]>([]);
  const [sleep, setSleep] = useState<DayPoint[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  const load = useCallback(() => {
    fetchIntakeByDay(DAYS).then(setIntake).catch(() => {});
    fetchWaterByDay(DAYS).then(setWater).catch(() => {});
    fetchSleepByDay(DAYS).then(setSleep).catch(() => {});
    fetchWeightHistory(WEIGHT_WINDOW_DAYS).then(setWeights).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const currentWeight =
    weights.length > 0
      ? weights[weights.length - 1].weightKg
      : profile?.weight_kg
        ? Number(profile.weight_kg)
        : null;
  const weightDelta =
    weights.length >= 2
      ? weights[weights.length - 1].weightKg - weights[0].weightKg
      : null;

  const handleLogWeight = async () => {
    const value = Number(weightInput.replace(",", "."));
    if (!Number.isFinite(value) || value < 25 || value > 350) {
      Alert.alert("Weight", "Enter a weight between 25 and 350 kg.");
      return;
    }
    setSavingWeight(true);
    try {
      await logWeight(value, profile);
      setWeightInput("");
      await refreshProfile();
      load();
    } catch (err) {
      Alert.alert(
        "Couldn't log weight",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSavingWeight(false);
    }
  };

  const handleLogSleep = async (hours: number) => {
    try {
      await logSleep(hours * 60);
      load();
    } catch (err) {
      Alert.alert(
        "Couldn't log sleep",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  const avgCalories = average(intake.map((d) => d.calories));
  const avgProtein = average(intake.map((d) => d.proteinG));
  const sleptToday = sleep.length > 0 && sleep[sleep.length - 1].value > 0;

  return (
    <Screen scroll keyboardAvoiding>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>One question: am I improving?</Text>

      {/* Weight */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Weight</Text>
          {weightDelta !== null ? (
            <Text style={styles.delta}>
              {weightDelta > 0 ? "▲" : weightDelta < 0 ? "▼" : "—"}{" "}
              {Math.abs(weightDelta).toFixed(1)} kg in{" "}
              {WEIGHT_WINDOW_DAYS} days
            </Text>
          ) : null}
        </View>
        {currentWeight !== null ? (
          <Text style={styles.hero}>
            {currentWeight.toFixed(1)}
            <Text style={styles.heroUnit}> kg</Text>
          </Text>
        ) : null}
        <WeightTrend entries={weights} />
        <View style={styles.logRow}>
          <View style={{ flex: 1 }}>
            <TextField
              placeholder="Today's weight (kg)"
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
            />
          </View>
          <Button
            label="Log"
            onPress={handleLogWeight}
            loading={savingWeight}
            disabled={!weightInput.trim()}
            style={styles.logButton}
          />
        </View>
      </Card>

      {/* Calories */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Calories</Text>
          {avgCalories !== null ? (
            <Text style={styles.cardStat}>
              avg {Math.round(avgCalories)} kcal
            </Text>
          ) : null}
        </View>
        <DayBarChart
          data={intake.map((d) => ({ label: d.label, value: d.calories }))}
          target={profile?.target_calories}
        />
      </Card>

      {/* Protein */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Protein</Text>
          {avgProtein !== null ? (
            <Text style={styles.cardStat}>avg {Math.round(avgProtein)} g</Text>
          ) : null}
        </View>
        <DayBarChart
          data={intake.map((d) => ({ label: d.label, value: d.proteinG }))}
          target={profile?.target_protein_g}
          formatValue={(v) => `${Math.round(v)}g`}
        />
      </Card>

      {/* Water */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Water</Text>
        </View>
        <DayBarChart
          data={water.map((d) => ({ label: d.label, value: d.value }))}
          target={profile?.target_water_ml}
          formatValue={(v) => `${(v / 1000).toFixed(1)}L`}
        />
      </Card>

      {/* Sleep */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Sleep</Text>
          {sleptToday ? (
            <Text style={styles.cardStat}>last night logged</Text>
          ) : null}
        </View>
        <DayBarChart
          data={sleep.map((d) => ({ label: d.label, value: d.value }))}
          target={profile?.target_sleep_min}
          formatValue={(v) => `${(v / 60).toFixed(1)}h`}
        />
        <Text style={styles.sleepPrompt}>
          {sleptToday
            ? "Adjust last night's sleep:"
            : "How long did you sleep last night?"}
        </Text>
        <View style={styles.chips}>
          {SLEEP_CHOICES_H.map((h) => (
            <Pressable
              key={h}
              onPress={() => handleLogSleep(h)}
              style={({ pressed }) => [
                styles.chip,
                pressed && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Text style={styles.chipLabel}>{h}h</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

function average(values: number[]): number | null {
  const nonEmpty = values.filter((v) => v > 0);
  if (nonEmpty.length === 0) return null;
  return nonEmpty.reduce((a, b) => a + b, 0) / nonEmpty.length;
}

const styles = StyleSheet.create({
  title: {
    ...type.largeTitle,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  card: {
    marginTop: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...type.heading,
    color: colors.text,
  },
  cardStat: {
    ...type.caption,
    color: colors.textSecondary,
  },
  delta: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  hero: {
    ...type.largeTitle,
    color: colors.text,
  },
  heroUnit: {
    ...type.heading,
    color: colors.textSecondary,
  },
  logRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: "flex-end",
  },
  logButton: {
    paddingHorizontal: spacing.md,
  },
  sleepPrompt: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  chips: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipLabel: {
    ...type.bodyMedium,
    color: colors.text,
  },
});
