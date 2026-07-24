import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { formatHeight, formatWeight } from "@/lib/units";
import { colors, spacing, type } from "@/theme";

interface Memory {
  id: string;
  category: string;
  content: string;
}

const GOAL_LABELS: Record<string, string> = {
  lose_fat: "Lose fat",
  build_muscle: "Build muscle",
  improve_energy: "Improve energy",
  improve_sleep: "Improve sleep",
  healthy_eating: "Eat healthier",
  general_wellness: "General wellness",
};

const DIRECTION_LABELS: Record<string, string> = {
  lose: "Lose weight",
  maintain: "Maintain weight",
  gain: "Gain weight",
};

export default function Profile() {
  const { session, profile } = useSession();
  const [memories, setMemories] = useState<Memory[]>([]);

  const loadMemories = useCallback(async () => {
    const { data } = await supabase
      .from("memories")
      .select("id, category, content")
      .order("created_at", { ascending: false });
    setMemories(data ?? []);
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  async function forgetMemory(memory: Memory) {
    Alert.alert("Forget this?", `"${memory.content}"`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Forget",
        style: "destructive",
        onPress: async () => {
          await supabase.from("memories").delete().eq("id", memory.id);
          loadMemories();
        },
      },
    ]);
  }

  function signOut() {
    Alert.alert("Sign out?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  }

  const units = profile?.unit_system ?? "metric";
  const details: [string, string][] = [
    ["Age", profile?.age ? String(profile.age) : "—"],
    [
      "Height",
      profile?.height_cm ? formatHeight(profile.height_cm, units) : "—",
    ],
    [
      "Weight",
      profile?.weight_kg ? formatWeight(profile.weight_kg, units) : "—",
    ],
    [
      "Goal",
      profile?.goal_direction
        ? DIRECTION_LABELS[profile.goal_direction] ?? profile.goal_direction
        : "—",
    ],
    ...(profile?.goal_weight_kg
      ? ([["Target", formatWeight(profile.goal_weight_kg, units)]] as [
          string,
          string,
        ][])
      : []),
    [
      "Diet",
      profile?.food_preference
        ? profile.food_preference.replace("_", "-")
        : "—",
    ],
  ];

  return (
    <Screen scroll>
      <Text style={styles.title}>
        {profile?.display_name ?? "Your profile"}
      </Text>
      <Text style={styles.subtitle}>{session?.user.email}</Text>

      {/* Personal details */}
      <Card style={styles.card}>
        {details.map(([label, value], i) => (
          <View
            key={label}
            style={[styles.row, i > 0 && styles.rowBorder]}
          >
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
      </Card>

      {/* Goals */}
      <Text style={styles.sectionTitle}>Goals</Text>
      <View style={styles.chips}>
        {(profile?.goals ?? []).map((goal) => (
          <View key={goal} style={styles.chip}>
            <Text style={styles.chipText}>{GOAL_LABELS[goal] ?? goal}</Text>
          </View>
        ))}
        {!profile?.goals?.length && (
          <Text style={styles.emptyText}>No goals set yet.</Text>
        )}
      </View>

      {/* AI memories */}
      <Text style={styles.sectionTitle}>What your AI remembers</Text>
      <Text style={styles.sectionHint}>
        Facts your AI has learned to personalize its guidance. Tap one to
        forget it.
      </Text>
      {memories.length ? (
        <Card style={styles.card}>
          {memories.map((memory, i) => (
            <Pressable
              key={memory.id}
              onPress={() => forgetMemory(memory)}
              style={[styles.memoryRow, i > 0 && styles.rowBorder]}
            >
              <Ionicons
                name="bookmark-outline"
                size={16}
                color={colors.primary}
                style={{ marginTop: 3 }}
              />
              <Text style={styles.memoryText}>{memory.content}</Text>
            </Pressable>
          ))}
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.emptyText}>
            Nothing yet. As you chat, your AI will quietly remember your
            preferences, habits, and goals.
          </Text>
        </Card>
      )}

      {/* Disclaimer + sign out */}
      <Text style={styles.disclaimer}>
        NutritiScan provides general wellness guidance and is not a substitute
        for professional medical advice, diagnosis, or treatment. Always
        consult a licensed healthcare provider for medical concerns.
      </Text>

      <Button
        label="Sign Out"
        variant="secondary"
        onPress={signOut}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.largeTitle,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  card: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 4,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: {
    ...type.body,
    color: colors.textSecondary,
  },
  rowValue: {
    ...type.bodyMedium,
    color: colors.text,
  },
  sectionTitle: {
    ...type.heading,
    color: colors.text,
    marginTop: spacing.xl,
  },
  sectionHint: {
    ...type.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    ...type.captionMedium,
    color: colors.primary,
  },
  memoryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  memoryText: {
    ...type.body,
    color: colors.text,
    flex: 1,
  },
  emptyText: {
    ...type.body,
    color: colors.textSecondary,
  },
  disclaimer: {
    ...type.caption,
    color: colors.textTertiary,
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
