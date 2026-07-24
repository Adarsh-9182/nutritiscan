import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors, spacing, type } from "@/theme";

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markText}>N</Text>
        </View>
        <Text style={styles.title}>Meet NutritiScan.</Text>
        <Text style={styles.subtitle}>Your AI Health Companion.</Text>
        <Text style={styles.body}>
          Your nutritionist. Your trainer.{"\n"}
          Your health coach. Your wellness partner.{"\n"}
          Everything powered by AI.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Get Started"
          onPress={() => router.push("/(auth)/sign-up")}
        />
        <Button
          label="Sign In"
          variant="secondary"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  markText: {
    color: colors.textInverse,
    fontSize: 36,
    fontWeight: "700",
  },
  title: {
    ...type.largeTitle,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    ...type.heading,
    color: colors.primary,
    textAlign: "center",
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
