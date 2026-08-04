// ============================================================
// EMPTY, LOADING & ERROR STATES
//
// These are not edge cases in a health product — they are most
// of the first-run experience and all of the anxious moments.
//
// EMPTY says what will appear and how to make it appear. Never
//   "No data" — that tells the user they did something wrong.
//
// LOADING names the step. "Comparing to your March panel" makes
//   a four-second wait feel like work being done; a spinner
//   makes the same four seconds feel like a hang.
//
// ERROR says what happened, whether anything was lost, and what
//   to do — in that order, in plain words, with no red. A failed
//   request is not a medical emergency and must not borrow the
//   visual language of one.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { duration, radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";
import { Button } from "./ui";

// ------------------------------------------------------------
// Empty
// ------------------------------------------------------------

export function EmptyState({
  icon = "search-outline",
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const p = usePalette();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: p.surface2, borderColor: p.border }]}>
        <Ionicons name={icon} size={22} color={p.text3} />
      </View>
      <Text style={[type.h3, { color: p.text, textAlign: "center" }]}>{title}</Text>
      <Text style={[type.body, { color: p.text2, textAlign: "center", marginTop: 6 }]}>{body}</Text>
      {actionLabel && (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.lg, paddingHorizontal: 20 }} />
      )}
    </View>
  );
}

// ------------------------------------------------------------
// Error
// ------------------------------------------------------------

export function ErrorState({
  title = "That didn't go through",
  body,
  onRetry,
}: {
  title?: string;
  body: string;
  onRetry?: () => void;
}) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.error, { backgroundColor: p.attentionSoft, borderColor: p.attentionLine }]}
    >
      <Ionicons name="alert-circle-outline" size={18} color={p.attentionText} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: p.text, fontWeight: "600" }]}>{title}</Text>
        <Text style={[type.meta, { color: p.text2, marginTop: 4 }]}>{body}</Text>
        {onRetry && <Button title="Try again" onPress={onRetry} style={{ marginTop: spacing.md, height: 40 }} />}
      </View>
    </View>
  );
}

// ------------------------------------------------------------
// Process steps
//
// Used by the lab reader and the scanner. Named steps, ticked as
// they complete, with the active one breathing so a slow step
// never reads as a freeze.
// ------------------------------------------------------------

export type Step = { id: string; label: string; status: "pending" | "active" | "done" };

export function ProcessSteps({ steps }: { steps: Step[] }) {
  const p = usePalette();
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: spacing.md }}>
      {steps.map((s) => (
        <View key={s.id} style={styles.step}>
          <View
            style={[
              styles.stepDot,
              s.status === "done" && { backgroundColor: p.steadySoft, borderColor: p.steadyLine },
              s.status === "active" && { backgroundColor: p.accentSoft, borderColor: p.accentLine },
              s.status === "pending" && { borderColor: p.border },
            ]}
          >
            {s.status === "done" && <Ionicons name="checkmark" size={12} color={p.steadyText} />}
            {s.status === "active" && <Breathing><View style={[styles.tinyDot, { backgroundColor: p.accent }]} /></Breathing>}
          </View>
          <Text
            style={[
              type.body,
              {
                color: s.status === "pending" ? p.text3 : p.text,
                fontWeight: s.status === "active" ? "600" : "400",
              },
            ]}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Advance a step list immutably. Shared by the scanner and the lab reader. */
export function advanceSteps(steps: Step[], index: number): Step[] {
  return steps.map((s, i) => ({
    ...s,
    status: i < index ? "done" : i === index ? "active" : "pending",
  }));
}

export const completeSteps = (steps: Step[]): Step[] => steps.map((s) => ({ ...s, status: "done" }));

// ------------------------------------------------------------
// Motion helpers
// ------------------------------------------------------------

/** "Is it still working?" — the breathing pulse. */
export function Breathing({ children }: { children: React.ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/** "Is it thinking?" — three dots, shown only before the first token lands. */
export function ThinkingDots({ label = "Thinking" }: { label?: string }) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
    >
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 160} color={p.accent} />
      ))}
    </View>
  );
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const [v] = useState(() => new Animated.Value(0.25));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.25, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(500 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);

  return <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: v }} />;
}

/**
 * A status pill that narrates what the system is doing.
 *
 * The scanner's "Reading the label" uses it. A live region so the
 * narration reaches a screen reader too.
 */
export function StatusPill({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  const p = usePalette();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.pill,
        {
          backgroundColor: onDark ? "rgba(255,255,255,0.12)" : p.surface2,
          borderColor: onDark ? "rgba(255,255,255,0.18)" : p.border,
        },
      ]}
    >
      <Breathing>
        <View style={[styles.tinyDot, { backgroundColor: p.accent }]} />
      </Breathing>
      <Text style={{ fontSize: 12.5, color: onDark ? p.overlayText : p.text2 }}>{children}</Text>
    </View>
  );
}

/** A shimmering placeholder. Promises arrival in a way a grey block does not. */
export function Skeleton({ height = 16, width = "100%" as number | string, style }: { height?: number; width?: number | string; style?: object }) {
  const p = usePalette();
  const [v] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.4, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return (
    <Animated.View
      style={[
        { height, width: width as number, backgroundColor: p.surface2, borderRadius: radius.sm, opacity: v },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingVertical: 48 },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
  },
  error: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.base,
  },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tinyDot: { width: 6, height: 6, borderRadius: 3 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});

export { duration };
