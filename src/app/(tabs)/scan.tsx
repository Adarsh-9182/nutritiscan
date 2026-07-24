import { Ionicons } from "@expo/vector-icons";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { analyzeFood, FoodAnalysis, logMeal } from "@/lib/ai";
import { colors, radius, spacing, type } from "@/theme";

type Phase = "idle" | "analyzing" | "result" | "logging";

const CONFIDENCE_LABEL: Record<FoodAnalysis["confidence"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const CONFIDENCE_COLOR: Record<FoodAnalysis["confidence"], string> = {
  high: colors.success,
  medium: colors.warning,
  low: colors.danger,
};

export default function Scan() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [correction, setCorrection] = useState("");

  function reset() {
    setPhase("idle");
    setImageUri(null);
    setImageBase64(null);
    setAnalysis(null);
    setCorrection("");
  }

  async function pickImage(fromCamera: boolean) {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.8,
    };

    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera access needed",
          "Allow camera access in Settings to scan meals.",
        );
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (result.canceled || !result.assets[0]) return;
    await runAnalysis(result.assets[0].uri);
  }

  async function runAnalysis(uri: string, note?: string) {
    setPhase("analyzing");
    setImageUri(uri);
    try {
      // Resize + compress so the upload stays small; 1024px is plenty for food.
      let base64 = imageBase64;
      if (!base64 || uri !== imageUri) {
        const manipulated = await manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.6, format: SaveFormat.JPEG, base64: true },
        );
        base64 = manipulated.base64 ?? null;
        setImageBase64(base64);
      }
      if (!base64) throw new Error("Couldn't read the photo");

      const analysisResult = await analyzeFood(base64, note);
      setAnalysis(analysisResult);
      setCorrection("");
      setPhase("result");
    } catch (err) {
      setPhase(imageUri ? "result" : "idle");
      Alert.alert(
        "Couldn't analyze that photo",
        `${err instanceof Error ? err.message : "Something went wrong"}. Try another photo in better lighting.`,
      );
    }
  }

  async function handleLog() {
    if (!analysis) return;
    setPhase("logging");
    try {
      await logMeal(analysis);
      Alert.alert(
        "Logged ✓",
        `${analysis.meal_name} — ${Math.round(analysis.total.calories)} kcal added to today.`,
      );
      reset();
    } catch (err) {
      setPhase("result");
      Alert.alert(
        "Couldn't log the meal",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  // ── Idle: invite the scan ────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <Screen>
        <View style={styles.idleContent}>
          <View style={styles.icon}>
            <Ionicons name="scan-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Scan your meal</Text>
          <Text style={styles.body}>
            Point your camera at any meal. Your AI will identify the food,
            estimate calories and macros, and log it — no typing.
          </Text>
          <View style={styles.idleActions}>
            <Button label="Take a photo" onPress={() => pickImage(true)} />
            <Button
              label="Choose from library"
              variant="secondary"
              onPress={() => pickImage(false)}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // ── Analyzing / Result ───────────────────────────────────────────────────
  return (
    <Screen padded={false} keyboardAvoiding>
      <ScrollView
        contentContainerStyle={styles.resultContent}
        keyboardShouldPersistTaps="handled"
      >
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.photo} />
        )}

        {phase === "analyzing" && (
          <View style={styles.analyzing}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.analyzingText}>
              Your AI is looking at this meal…
            </Text>
          </View>
        )}

        {analysis && phase !== "analyzing" && (
          <View style={styles.analysisBlock}>
            <View style={styles.resultHeader}>
              <Text style={styles.mealName}>{analysis.meal_name}</Text>
              <View
                style={[
                  styles.confidenceBadge,
                  { backgroundColor: `${CONFIDENCE_COLOR[analysis.confidence]}18` },
                ]}
              >
                <Text
                  style={[
                    styles.confidenceText,
                    { color: CONFIDENCE_COLOR[analysis.confidence] },
                  ]}
                >
                  {CONFIDENCE_LABEL[analysis.confidence]}
                </Text>
              </View>
            </View>

            {/* Totals */}
            <View style={styles.totalsRow}>
              {[
                [`${Math.round(analysis.total.calories)}`, "kcal"],
                [`${Math.round(analysis.total.protein_g)}g`, "protein"],
                [`${Math.round(analysis.total.carbs_g)}g`, "carbs"],
                [`${Math.round(analysis.total.fat_g)}g`, "fat"],
              ].map(([value, label]) => (
                <View key={label} style={styles.totalCell}>
                  <Text style={styles.totalValue}>{value}</Text>
                  <Text style={styles.totalLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Items */}
            {analysis.items.length > 0 && (
              <Card style={{ paddingVertical: spacing.xs }}>
                {analysis.items.map((item, i) => (
                  <View
                    key={`${item.name}-${i}`}
                    style={[styles.itemRow, i > 0 && styles.itemBorder]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPortion}>{item.portion}</Text>
                    </View>
                    <Text style={styles.itemCalories}>
                      {Math.round(item.calories)} kcal
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Clarifying question — never pretend certainty */}
            {analysis.clarifying_question && (
              <Card style={styles.questionCard}>
                <Text style={styles.questionText}>
                  {analysis.clarifying_question}
                </Text>
                <TextInput
                  style={styles.correctionInput}
                  value={correction}
                  onChangeText={setCorrection}
                  placeholder="Type your answer…"
                  placeholderTextColor={colors.textTertiary}
                />
                <Button
                  label="Update estimate"
                  variant="secondary"
                  disabled={!correction.trim()}
                  onPress={() => runAnalysis(imageUri!, correction.trim())}
                />
              </Card>
            )}

            <View style={styles.resultActions}>
              <Button
                label="Log this meal"
                onPress={handleLog}
                loading={phase === "logging"}
                disabled={analysis.items.length === 0}
              />
              <Button label="Start over" variant="ghost" onPress={reset} />
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  idleContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...type.title,
    color: colors.text,
    textAlign: "center",
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  idleActions: {
    alignSelf: "stretch",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  resultContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
  },
  analyzing: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  analyzingText: {
    ...type.body,
    color: colors.textSecondary,
  },
  analysisBlock: {
    gap: spacing.md,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  mealName: {
    ...type.title,
    color: colors.text,
    flex: 1,
  },
  confidenceBadge: {
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
  },
  confidenceText: {
    ...type.captionMedium,
  },
  totalsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  totalCell: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    alignItems: "center",
    paddingVertical: spacing.sm + 4,
  },
  totalValue: {
    ...type.heading,
    color: colors.text,
  },
  totalLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemName: {
    ...type.bodyMedium,
    color: colors.text,
  },
  itemPortion: {
    ...type.caption,
    color: colors.textSecondary,
  },
  itemCalories: {
    ...type.bodyMedium,
    color: colors.textSecondary,
  },
  questionCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "transparent",
    gap: spacing.sm,
  },
  questionText: {
    ...type.bodyMedium,
    color: colors.text,
  },
  correctionInput: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...type.body,
    color: colors.text,
  },
  resultActions: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
