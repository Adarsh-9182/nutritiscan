import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import {
  analyzeReport,
  Biomarker,
  BiomarkerStatus,
  ReportAnalysis,
  saveReport,
} from "@/lib/ai";
import { colors, radius, spacing, type } from "@/theme";

type Phase = "idle" | "analyzing" | "result" | "saving";

const STATUS_COLOR: Record<BiomarkerStatus, string> = {
  low: colors.warning,
  normal: colors.success,
  high: colors.warning,
  critical: colors.danger,
  unknown: colors.textTertiary,
};

const STATUS_LABEL: Record<BiomarkerStatus, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
  unknown: "—",
};

const CONFIDENCE_COLOR: Record<ReportAnalysis["confidence"], string> = {
  high: colors.success,
  medium: colors.warning,
  low: colors.danger,
};

function referenceLabel(b: Biomarker): string | null {
  const { low, high, text } = b.reference_range;
  if (low != null && high != null) return `${low}–${high}`;
  if (low != null) return `> ${low}`;
  if (high != null) return `< ${high}`;
  return text;
}

export default function Report() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReportAnalysis | null>(null);

  function reset() {
    setPhase("idle");
    setImageUri(null);
    setAnalysis(null);
  }

  async function pickImage(fromCamera: boolean) {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.9,
    };

    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera access needed",
          "Allow camera access in Settings to scan reports.",
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

  async function runAnalysis(uri: string) {
    setPhase("analyzing");
    setImageUri(uri);
    try {
      // Reports are text-dense — keep more resolution than a food photo so the
      // numbers stay legible, but still compress for a reasonable upload.
      const manipulated = await manipulateAsync(
        uri,
        [{ resize: { width: 2000 } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true },
      );
      if (!manipulated.base64) throw new Error("Couldn't read the photo");

      const analysisResult = await analyzeReport(manipulated.base64);
      setAnalysis(analysisResult);
      setPhase("result");
    } catch (err) {
      setPhase(imageUri ? "result" : "idle");
      Alert.alert(
        "Couldn't analyze that report",
        `${err instanceof Error ? err.message : "Something went wrong"}. Try a clearer photo in good lighting.`,
      );
    }
  }

  async function handleSave() {
    if (!analysis) return;
    setPhase("saving");
    try {
      await saveReport(analysis);
      Alert.alert(
        "Saved to your health record ✓",
        `${analysis.report_title} — ${analysis.biomarkers.length} result${
          analysis.biomarkers.length === 1 ? "" : "s"
        } stored.`,
      );
      reset();
    } catch (err) {
      setPhase("result");
      Alert.alert(
        "Couldn't save the report",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  // ── Idle: invite the scan ──────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <Screen>
        <View style={styles.idleContent}>
          <View style={styles.icon}>
            <Ionicons name="document-text-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Analyze a report</Text>
          <Text style={styles.body}>
            Photograph a blood panel or lab report. Your AI reads the values,
            explains each one in plain language, and adds them to your health
            record.
          </Text>
          <View style={styles.idleActions}>
            <Button label="Take a photo" onPress={() => pickImage(true)} />
            <Button
              label="Choose from library"
              variant="secondary"
              onPress={() => pickImage(false)}
            />
          </View>
          <Text style={styles.disclaimerIdle}>
            NutritiScan explains your results — it does not diagnose. Always
            review them with a licensed doctor.
          </Text>
        </View>
      </Screen>
    );
  }

  // ── Analyzing / Result ─────────────────────────────────────────────────────
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.resultContent}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.photo} />}

        {phase === "analyzing" && (
          <View style={styles.analyzing}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.analyzingText}>
              Your AI is reading this report…
            </Text>
          </View>
        )}

        {analysis && phase !== "analyzing" && (
          <View style={styles.analysisBlock}>
            <View style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportTitle}>{analysis.report_title}</Text>
                {analysis.report_date && (
                  <Text style={styles.reportDate}>{analysis.report_date}</Text>
                )}
              </View>
              <View
                style={[
                  styles.confidenceBadge,
                  {
                    backgroundColor: `${CONFIDENCE_COLOR[analysis.confidence]}18`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.confidenceText,
                    { color: CONFIDENCE_COLOR[analysis.confidence] },
                  ]}
                >
                  {analysis.confidence} confidence
                </Text>
              </View>
            </View>

            {/* Summary */}
            {analysis.summary ? (
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryText}>{analysis.summary}</Text>
              </Card>
            ) : null}

            {/* Flags — things to raise with a doctor */}
            {analysis.flags ? (
              <Card style={styles.flagsCard}>
                <View style={styles.flagsHeader}>
                  <Ionicons name="flag" size={14} color={colors.warning} />
                  <Text style={styles.flagsTitle}>Worth discussing</Text>
                </View>
                <Text style={styles.flagsText}>{analysis.flags}</Text>
              </Card>
            ) : null}

            {/* Biomarkers */}
            {analysis.biomarkers.length > 0 && (
              <Card style={{ paddingVertical: spacing.xs }}>
                {analysis.biomarkers.map((b, i) => {
                  const ref = referenceLabel(b);
                  return (
                    <View
                      key={`${b.name}-${i}`}
                      style={[styles.bioRow, i > 0 && styles.bioBorder]}
                    >
                      <View style={styles.bioHeader}>
                        <Text style={styles.bioName}>{b.name}</Text>
                        <View style={styles.bioValueWrap}>
                          <Text style={styles.bioValue}>
                            {b.value}
                            {b.unit ? ` ${b.unit}` : ""}
                          </Text>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: STATUS_COLOR[b.status] },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: STATUS_COLOR[b.status] },
                            ]}
                          >
                            {STATUS_LABEL[b.status]}
                          </Text>
                        </View>
                      </View>
                      {ref && (
                        <Text style={styles.bioRef}>Reference: {ref}</Text>
                      )}
                      {b.explanation ? (
                        <Text style={styles.bioExplanation}>
                          {b.explanation}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </Card>
            )}

            {/* Clarifying question — never pretend certainty */}
            {analysis.clarifying_question && (
              <Card style={styles.questionCard}>
                <Text style={styles.questionText}>
                  {analysis.clarifying_question}
                </Text>
              </Card>
            )}

            {/* Standing safety disclaimer */}
            <View style={styles.disclaimerBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.disclaimerText}>
                This is an explanation of your results, not a diagnosis. Review
                anything concerning with a licensed healthcare professional.
              </Text>
            </View>

            <View style={styles.resultActions}>
              <Button
                label="Save to health record"
                onPress={handleSave}
                loading={phase === "saving"}
                disabled={analysis.biomarkers.length === 0}
              />
              <Button
                label="Done"
                variant="ghost"
                onPress={() => router.back()}
              />
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
  disclaimerIdle: {
    ...type.caption,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: spacing.md,
  },

  resultContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  photo: {
    width: "100%",
    height: 200,
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  reportTitle: {
    ...type.title,
    color: colors.text,
  },
  reportDate: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  confidenceBadge: {
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
  },
  confidenceText: {
    ...type.captionMedium,
    textTransform: "capitalize",
  },
  summaryCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "rgba(52,211,153,0.22)",
  },
  summaryText: {
    ...type.body,
    color: colors.text,
  },
  flagsCard: {
    backgroundColor: "rgba(251,191,36,0.10)",
    borderColor: "rgba(251,191,36,0.28)",
    gap: spacing.xs,
  },
  flagsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  flagsTitle: {
    ...type.captionMedium,
    color: colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  flagsText: {
    ...type.body,
    color: colors.text,
  },
  bioRow: {
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs,
  },
  bioBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  bioName: {
    ...type.bodyMedium,
    color: colors.text,
    flex: 1,
  },
  bioValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  bioValue: {
    ...type.bodyMedium,
    color: colors.text,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: spacing.xs,
  },
  statusText: {
    ...type.captionMedium,
  },
  bioRef: {
    ...type.caption,
    color: colors.textTertiary,
  },
  bioExplanation: {
    ...type.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  questionCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "transparent",
  },
  questionText: {
    ...type.bodyMedium,
    color: colors.text,
  },
  disclaimerBox: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    paddingHorizontal: spacing.xs,
  },
  disclaimerText: {
    ...type.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  resultActions: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
