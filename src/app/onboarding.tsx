import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import {
  ActivityLevel,
  computeTargets,
  GoalDirection,
  Sex,
} from "@/engines/targets";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import {
  cmToFeetInches,
  feetInchesToCm,
  UnitSystem,
  weightInSystem,
  weightToKg,
  weightUnit,
} from "@/lib/units";
import { colors, radius, spacing, type } from "@/theme";

// ---------------------------------------------------------------------------
// One question at a time. The AI should do the work; the user should just live.
// Storage is always metric; unit_system only controls display + parsing.
// ---------------------------------------------------------------------------

interface Answers {
  unit_system: UnitSystem;
  display_name: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  goal_direction: GoalDirection;
  goal_weight_kg: number;
  weekly_pace_kg: string; // choice value: kg magnitude as string
  activity_level: ActivityLevel;
  food_preference: string;
  goals: string[];
  sleep_time: string;
  wake_time: string;
  medical_conditions: string;
  allergies: string;
}

type StepId = keyof Answers;

type Kind =
  | "text"
  | "number"
  | "measureWeight"
  | "measureHeight"
  | "choice"
  | "multi"
  | "sleep"
  | "note";

interface Option {
  value: string;
  label: string;
}

interface Step {
  id: StepId;
  kind: Kind;
  question: (a: Partial<Answers>) => string;
  placeholder?: string;
  options?: (a: Partial<Answers>) => Option[];
  optional?: boolean;
  /** Validates a value already normalized to metric (cm / kg / years). */
  validateMetric?: (value: number) => string | null;
}

const GOAL_OPTIONS: Option[] = [
  { value: "lose_fat", label: "Lose fat" },
  { value: "build_muscle", label: "Build muscle" },
  { value: "improve_energy", label: "Improve energy" },
  { value: "improve_sleep", label: "Improve sleep" },
  { value: "healthy_eating", label: "Eat healthier" },
  { value: "general_wellness", label: "General wellness" },
];

// Weekly-pace choices, worded by direction and shown in the user's unit.
const PACE_LB_LABEL: Record<string, string> = {
  "0.25": "0.5 lb",
  "0.5": "1 lb",
  "0.75": "1.5 lb",
  "1": "2 lb",
};

function paceOptions(a: Partial<Answers>): Option[] {
  const system = a.unit_system ?? "metric";
  const rows: [string, string][] =
    a.goal_direction === "gain"
      ? [
          ["0.25", "lean"],
          ["0.5", "standard"],
          ["0.75", "fast"],
        ]
      : [
          ["0.25", "steady"],
          ["0.5", "recommended"],
          ["0.75", "aggressive"],
          ["1", "very aggressive"],
        ];
  return rows.map(([kg, tag]) => {
    const amount = system === "imperial" ? PACE_LB_LABEL[kg] : `${kg} kg`;
    return { value: kg, label: `${amount} / week · ${tag}` };
  });
}

// --- Step catalogue (assembled per-answers by buildSteps) ------------------

const UNIT_STEP: Step = {
  id: "unit_system",
  kind: "choice",
  question: () =>
    "Hi, I'm your NutritiScan AI. First — which units feel natural to you?",
  options: () => [
    { value: "metric", label: "Metric (kg, cm)" },
    { value: "imperial", label: "Imperial (lb, ft·in)" },
  ],
};

const CORE_STEPS: Step[] = [
  {
    id: "display_name",
    kind: "text",
    question: () =>
      "Let's understand your body so I can personalize everything.\n\nWhat should I call you?",
    placeholder: "Your name",
  },
  {
    id: "age",
    kind: "number",
    question: (a) => `Nice to meet you, ${a.display_name}. How old are you?`,
    placeholder: "28",
    validateMetric: (v) =>
      v >= 13 && v <= 120 ? null : "Please enter an age between 13 and 120.",
  },
  {
    id: "sex",
    kind: "choice",
    question: () =>
      "What's your biological sex? I use this to estimate your energy needs.",
    options: () => [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Prefer not to say" },
    ],
  },
  {
    id: "height_cm",
    kind: "measureHeight",
    question: () => "How tall are you?",
    placeholder: "175",
    validateMetric: (v) =>
      v >= 90 && v <= 250 ? null : "Please enter a height between 90 and 250 cm.",
  },
  {
    id: "weight_kg",
    kind: "measureWeight",
    question: () => "And your current weight?",
    placeholder: "70",
    validateMetric: (v) =>
      v >= 25 && v <= 350 ? null : "Please enter a weight between 25 and 350 kg.",
  },
  {
    id: "goal_direction",
    kind: "choice",
    question: () => "What's the plan for your weight?",
    options: () => [
      { value: "lose", label: "Lose weight" },
      { value: "maintain", label: "Maintain weight" },
      { value: "gain", label: "Gain weight" },
    ],
  },
];

const GOAL_WEIGHT_STEP: Step = {
  id: "goal_weight_kg",
  kind: "measureWeight",
  question: () => "What weight do you want to reach?",
  placeholder: "65",
  validateMetric: (v) =>
    v >= 25 && v <= 350 ? null : "Please enter a weight between 25 and 350 kg.",
};

const PACE_STEP: Step = {
  id: "weekly_pace_kg",
  kind: "choice",
  question: (a) =>
    a.goal_direction === "gain"
      ? "How fast do you want to gain? Slower means more muscle, less fat."
      : "How fast do you want to lose it? Steady is the most sustainable.",
  options: paceOptions,
};

const TAIL_STEPS: Step[] = [
  {
    id: "activity_level",
    kind: "choice",
    question: () => "How active is a typical day for you?",
    options: () => [
      { value: "sedentary", label: "Mostly sitting" },
      { value: "light", label: "Light activity" },
      { value: "moderate", label: "Moderately active" },
      { value: "active", label: "Active most days" },
      { value: "very_active", label: "Very active / athlete" },
    ],
  },
  {
    id: "food_preference",
    kind: "choice",
    question: () => "How do you eat?",
    options: () => [
      { value: "vegetarian", label: "Vegetarian" },
      { value: "eggetarian", label: "Eggetarian" },
      { value: "vegan", label: "Vegan" },
      { value: "non_vegetarian", label: "Non-vegetarian" },
    ],
  },
  {
    id: "goals",
    kind: "multi",
    question: () => "What else matters to you? Pick everything that fits.",
    options: () => GOAL_OPTIONS,
  },
  // --- Health context (all skippable) ---
  {
    id: "sleep_time",
    kind: "sleep",
    question: () =>
      "When do you usually sleep and wake? This helps me time your day. (Optional)",
    optional: true,
  },
  {
    id: "medical_conditions",
    kind: "note",
    question: () =>
      "Any medical conditions I should keep in mind? (Optional — e.g. diabetes, PCOS, hypertension)",
    placeholder: "Type anything, or skip",
    optional: true,
  },
  {
    id: "allergies",
    kind: "note",
    question: () =>
      "Last one — any food allergies or intolerances? (Optional)",
    placeholder: "e.g. peanuts, lactose",
    optional: true,
  },
];

function buildSteps(a: Partial<Answers>): Step[] {
  const hasTarget = a.goal_direction && a.goal_direction !== "maintain";
  return [
    UNIT_STEP,
    ...CORE_STEPS,
    ...(hasTarget ? [GOAL_WEIGHT_STEP, PACE_STEP] : []),
    ...TAIL_STEPS,
  ];
}

export default function Onboarding() {
  const { session, refreshProfile } = useSession();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [textValue, setTextValue] = useState("");
  const [textValue2, setTextValue2] = useState(""); // inches / wake time
  const [multiValue, setMultiValue] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const steps = buildSteps(answers);
  const step = steps[stepIndex];
  const system = answers.unit_system ?? "metric";
  const progress = (stepIndex + 1) / steps.length;
  const isLast = stepIndex === steps.length - 1;
  const question = useMemo(() => step.question(answers), [step, answers]);

  // Prefill the input fields for a step from stored answers, so moving Back
  // (or forward) always shows what was entered. Called from the nav handlers
  // rather than an effect to avoid cascading renders.
  function syncInputs(index: number, ans: Partial<Answers>) {
    const s = buildSteps(ans)[index];
    if (!s) return;
    const sys = ans.unit_system ?? "metric";
    if (s.kind === "multi") {
      setMultiValue((ans[s.id] as string[]) ?? []);
    } else if (s.kind === "measureHeight") {
      if (sys === "imperial" && ans.height_cm) {
        const { feet, inches } = cmToFeetInches(ans.height_cm);
        setTextValue(String(feet));
        setTextValue2(String(inches));
      } else {
        setTextValue(ans.height_cm ? String(ans.height_cm) : "");
        setTextValue2("");
      }
    } else if (s.kind === "measureWeight") {
      const kg = ans[s.id] as number | undefined;
      setTextValue(kg ? String(weightInSystem(kg, sys)) : "");
    } else if (s.kind === "sleep") {
      setTextValue(ans.sleep_time ?? "");
      setTextValue2(ans.wake_time ?? "");
    } else {
      const v = ans[s.id];
      setTextValue(v != null ? String(v) : "");
    }
  }

  function advance(updated: Partial<Answers>) {
    setAnswers(updated);
    const nextSteps = buildSteps(updated);
    if (stepIndex + 1 >= nextSteps.length) {
      finish(updated);
    } else {
      const next = stepIndex + 1;
      setStepIndex(next);
      syncInputs(next, updated);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      const prev = stepIndex - 1;
      setStepIndex(prev);
      syncInputs(prev, answers);
    }
  }

  function handleTextNext() {
    if (step.kind === "number") {
      const value = Number(textValue.trim().replace(",", "."));
      if (!Number.isFinite(value)) return;
      const error = step.validateMetric?.(value);
      if (error) return Alert.alert("Hmm", error);
      return advance({ ...answers, [step.id]: value });
    }

    if (step.kind === "measureWeight") {
      const raw = Number(textValue.trim().replace(",", "."));
      if (!Number.isFinite(raw)) return;
      const kg = weightToKg(raw, system);
      const error = step.validateMetric?.(kg);
      if (error) return Alert.alert("Hmm", error);
      return advance({ ...answers, [step.id]: kg });
    }

    if (step.kind === "measureHeight") {
      let cm: number;
      if (system === "imperial") {
        const feet = Number(textValue.trim());
        const inches = Number(textValue2.trim() || "0");
        if (!Number.isFinite(feet) || !Number.isFinite(inches)) return;
        cm = feetInchesToCm(feet, inches);
      } else {
        cm = Number(textValue.trim().replace(",", "."));
        if (!Number.isFinite(cm)) return;
      }
      const error = step.validateMetric?.(cm);
      if (error) return Alert.alert("Hmm", error);
      return advance({ ...answers, height_cm: cm });
    }

    if (step.kind === "note") {
      return advance({ ...answers, [step.id]: textValue.trim() });
    }

    if (step.kind === "sleep") {
      return advance({
        ...answers,
        sleep_time: textValue.trim(),
        wake_time: textValue2.trim(),
      });
    }

    // plain text
    const raw = textValue.trim();
    if (!raw) return;
    advance({ ...answers, [step.id]: raw });
  }

  async function finish(final: Partial<Answers>) {
    if (!session?.user) return;
    setSaving(true);

    const direction = (final.goal_direction ?? "maintain") as GoalDirection;
    const pace = direction === "maintain" ? 0 : Number(final.weekly_pace_kg ?? 0);

    const targets = computeTargets({
      age: final.age!,
      sex: final.sex!,
      heightCm: final.height_cm!,
      weightKg: final.weight_kg!,
      activityLevel: final.activity_level!,
      goalDirection: direction,
      weeklyPaceKg: pace,
    });

    const toNull = (s?: string) => (s && s.trim() ? s.trim() : null);

    const { error } = await supabase
      .from("profiles")
      .update({
        unit_system: final.unit_system ?? "metric",
        display_name: final.display_name,
        age: final.age,
        sex: final.sex,
        height_cm: final.height_cm,
        weight_kg: final.weight_kg,
        goal_direction: direction,
        goal_weight_kg: direction === "maintain" ? null : final.goal_weight_kg,
        weekly_pace_kg: direction === "maintain" ? null : pace,
        activity_level: final.activity_level,
        food_preference: final.food_preference,
        goals: final.goals ?? [],
        sleep_time: toNull(final.sleep_time),
        wake_time: toNull(final.wake_time),
        medical_conditions: toNull(final.medical_conditions),
        allergies: toNull(final.allergies),
        target_calories: targets.calories,
        target_protein_g: targets.proteinG,
        target_water_ml: targets.waterMl,
        target_sleep_min: targets.sleepMin,
        onboarding_completed: true,
      })
      .eq("id", session.user.id);

    setSaving(false);
    if (error) {
      Alert.alert("Couldn't save your profile", error.message);
      return;
    }
    await refreshProfile();
    // Root layout redirects to (tabs) once onboarding_completed is true.
  }

  const weightLabel = weightUnit(system);
  const textLikeReady = textValue.trim().length > 0;

  return (
    <Screen keyboardAvoiding>
      {/* Progress + Back */}
      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          disabled={stepIndex === 0 || saving}
          hitSlop={12}
          style={{ opacity: stepIndex === 0 ? 0 : 1 }}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.stepCount}>
          {stepIndex + 1} / {steps.length}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.questionBubble}>
          <Text style={styles.questionText}>{question}</Text>
        </View>

        {(step.kind === "text" ||
          step.kind === "number" ||
          step.kind === "measureWeight") && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={textValue}
              onChangeText={setTextValue}
              placeholder={step.placeholder}
              placeholderTextColor={colors.textTertiary}
              keyboardType={step.kind === "text" ? "default" : "numeric"}
              autoFocus
              onSubmitEditing={handleTextNext}
              returnKeyType="next"
            />
            {step.kind === "measureWeight" && (
              <Text style={styles.unit}>{weightLabel}</Text>
            )}
            {step.kind === "number" && <Text style={styles.unit}>years</Text>}
          </View>
        )}

        {step.kind === "measureHeight" && system === "metric" && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={textValue}
              onChangeText={setTextValue}
              placeholder={step.placeholder}
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={handleTextNext}
              returnKeyType="next"
            />
            <Text style={styles.unit}>cm</Text>
          </View>
        )}

        {step.kind === "measureHeight" && system === "imperial" && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={textValue}
              onChangeText={setTextValue}
              placeholder="5"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              autoFocus
              returnKeyType="next"
            />
            <Text style={styles.unit}>ft</Text>
            <TextInput
              style={styles.input}
              value={textValue2}
              onChangeText={setTextValue2}
              placeholder="11"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              onSubmitEditing={handleTextNext}
              returnKeyType="next"
            />
            <Text style={styles.unit}>in</Text>
          </View>
        )}

        {step.kind === "sleep" && (
          <View style={{ gap: spacing.sm }}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={textValue}
                onChangeText={setTextValue}
                placeholder="23:00 (bedtime)"
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={textValue2}
                onChangeText={setTextValue2}
                placeholder="07:00 (wake)"
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={handleTextNext}
                returnKeyType="done"
              />
            </View>
          </View>
        )}

        {step.kind === "note" && (
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={textValue}
            onChangeText={setTextValue}
            placeholder={step.placeholder}
            placeholderTextColor={colors.textTertiary}
            autoFocus
            multiline
          />
        )}

        {step.kind === "choice" && (
          <View style={styles.options}>
            {step.options!(answers).map((option) => (
              <Pressable
                key={option.value}
                style={({ pressed }) => [
                  styles.option,
                  pressed && { backgroundColor: colors.primarySoft },
                ]}
                onPress={() => advance({ ...answers, [step.id]: option.value })}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {step.kind === "multi" && (
          <View style={styles.options}>
            {step.options!(answers).map((option) => {
              const selected = multiValue.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() =>
                    setMultiValue(
                      selected
                        ? multiValue.filter((v) => v !== option.value)
                        : [...multiValue, option.value],
                    )
                  }
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      selected && { color: colors.primary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {(step.kind === "text" ||
          step.kind === "number" ||
          step.kind === "measureWeight" ||
          step.kind === "measureHeight") && (
          <Button
            label={isLast ? "Finish" : "Next"}
            onPress={handleTextNext}
            disabled={!textLikeReady || saving}
            loading={saving}
          />
        )}

        {(step.kind === "note" || step.kind === "sleep") && (
          <View style={{ gap: spacing.sm }}>
            <Button
              label={isLast ? "Finish" : "Save & continue"}
              onPress={handleTextNext}
              loading={saving}
              disabled={saving}
            />
            <Button
              label={isLast ? "Skip & finish" : "Skip"}
              variant="ghost"
              onPress={() => advance(answers)}
              disabled={saving}
            />
          </View>
        )}

        {step.kind === "multi" && (
          <Button
            label={isLast ? "Finish" : "Next"}
            onPress={() => advance({ ...answers, goals: multiValue })}
            disabled={multiValue.length === 0 || saving}
            loading={saving}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    minHeight: 24,
  },
  back: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  stepCount: {
    ...type.caption,
    color: colors.textTertiary,
  },
  progressTrack: {
    flexDirection: "row",
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  content: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  questionBubble: {
    backgroundColor: colors.bubbleAssistant,
    borderRadius: radius.xl,
    borderBottomLeftRadius: radius.sm,
    padding: spacing.md,
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  questionText: {
    ...type.body,
    color: colors.text,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...type.body,
    color: colors.text,
  },
  noteInput: {
    height: 96,
    paddingTop: spacing.sm,
    textAlignVertical: "top",
  },
  unit: {
    ...type.bodyMedium,
    color: colors.textSecondary,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionLabel: {
    ...type.bodyMedium,
    color: colors.text,
  },
  footer: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
});
