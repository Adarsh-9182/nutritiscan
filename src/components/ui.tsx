// ============================================================
// UI PRIMITIVES
//
// Variants are semantic ("attention", "steady", "evidence"),
// never chromatic ("amber", "green", "blue"). A component that
// names a colour cannot be re-themed — see src/theme/index.ts.
//
// Every one of these reads its colours from `usePalette()` at
// render, so the light/dark flip is a re-render rather than a
// re-layout.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { radius, spacing, type, type Palette } from "@/theme";
import { usePalette } from "@/theme/context";

export type Tone = "neutral" | "accent" | "attention" | "steady" | "evidence";

/** One lookup table, so a new tone is a single edit. */
export function toneColors(p: Palette, tone: Tone) {
  switch (tone) {
    case "accent":
      return { fg: p.accentText, bg: p.accentSoft, line: p.accentLine, solid: p.accent };
    case "attention":
      return { fg: p.attentionText, bg: p.attentionSoft, line: p.attentionLine, solid: p.attention };
    case "steady":
      return { fg: p.steadyText, bg: p.steadySoft, line: p.steadyLine, solid: p.steady };
    case "evidence":
      return { fg: p.evidenceText, bg: p.evidenceSoft, line: p.evidenceLine, solid: p.evidence };
    default:
      return { fg: p.text2, bg: p.surface2, line: p.border, solid: p.text3 };
  }
}

// ------------------------------------------------------------
// Text
// ------------------------------------------------------------

type TxtProps = { style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number };

export function Display({ style, children, ...r }: TxtProps) {
  const p = usePalette();
  return <Text style={[type.display, { color: p.text }, style]} {...r}>{children}</Text>;
}
export function H1({ style, children, ...r }: TxtProps) {
  const p = usePalette();
  return <Text style={[type.h1, { color: p.text }, style]} {...r}>{children}</Text>;
}
export function H2({ style, children, ...r }: TxtProps) {
  const p = usePalette();
  return <Text style={[type.h2, { color: p.text }, style]} {...r}>{children}</Text>;
}
export function H3({ style, children, ...r }: TxtProps) {
  const p = usePalette();
  return <Text style={[type.h3, { color: p.text }, style]} {...r}>{children}</Text>;
}
/** Body prose. Secondary ink by default — headings carry primary. */
export function Body({ style, children, ...r }: TxtProps) {
  const p = usePalette();
  return <Text style={[type.body, { color: p.text2 }, style]} {...r}>{children}</Text>;
}
export function Meta({ style, children, ...r }: TxtProps) {
  const p = usePalette();
  return <Text style={[type.meta, { color: p.text3 }, style]} {...r}>{children}</Text>;
}

/** The uppercase micro-heading above a group. */
export function Eyebrow({ tone = "neutral", style, children }: { tone?: Tone } & TxtProps) {
  const p = usePalette();
  const c = toneColors(p, tone);
  return (
    <Text style={[type.eyebrow, { color: tone === "neutral" ? p.text3 : c.fg }, style]}>
      {children}
    </Text>
  );
}

/** Eyebrow with a leading status dot, where the tone is the point. */
export function DotLabel({ tone = "accent", children }: { tone?: Tone; children: ReactNode }) {
  const p = usePalette();
  const c = toneColors(p, tone);
  return (
    <View style={styles.dotRow}>
      <View style={[styles.dot, { backgroundColor: c.solid }]} />
      <Text style={[type.eyebrow, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

// ------------------------------------------------------------
// Card
// ------------------------------------------------------------

export function Card({
  tone = "neutral",
  style,
  children,
}: {
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const p = usePalette();
  const c = toneColors(p, tone);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone === "neutral" ? p.surface : c.bg,
          borderColor: tone === "neutral" ? p.border : c.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ------------------------------------------------------------
// Badge & Chip
//
// A BADGE states a status and is not interactive. A CHIP is a
// control. Keeping them separate stops a status badge quietly
// acquiring an onPress and becoming an invisible affordance.
// ------------------------------------------------------------

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const p = usePalette();
  const c = toneColors(p, tone);
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.line }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

export function Chip({
  selected,
  tone = "accent",
  onPress,
  children,
  style,
}: {
  selected?: boolean;
  tone?: Tone;
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const c = toneColors(p, tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.bg : "transparent",
          borderColor: selected ? c.line : p.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? c.fg : p.text2, fontWeight: selected ? "600" : "400" },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

// ------------------------------------------------------------
// Button
// ------------------------------------------------------------

export function Button({
  title,
  onPress,
  variant = "secondary",
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "quiet";
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const bg =
    variant === "primary" ? p.accent : variant === "secondary" ? p.surface2 : "transparent";
  const fg =
    variant === "primary" ? p.accentInk : variant === "quiet" ? p.accentText : p.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: variant === "secondary" ? p.borderStrong : "transparent",
          borderWidth: variant === "secondary" ? 1 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={17} color={fg} />}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------
// Rows
// ------------------------------------------------------------

export function Row({
  icon,
  tone = "neutral",
  title,
  detail,
  value,
  onPress,
  chevron,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  title: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const p = usePalette();
  const c = toneColors(p, tone);
  const showChevron = chevron ?? !!onPress;

  const inner = (
    <>
      {icon && (
        <View style={[styles.rowIcon, { backgroundColor: c.bg, borderColor: c.line }]}>
          <Ionicons name={icon} size={16} color={c.fg} />
        </View>
      )}
      <View style={styles.flex}>
        <Text style={[type.body, { color: p.text, fontWeight: "600" }]}>{title}</Text>
        {detail && <Text style={[type.meta, { color: p.text3, marginTop: 2 }]}>{detail}</Text>}
      </View>
      {value && (
        <Text style={[type.meta, { color: p.text3, maxWidth: 150 }]} numberOfLines={1}>
          {value}
        </Text>
      )}
      {showChevron && <Ionicons name="chevron-forward" size={16} color={p.text3} />}
    </>
  );

  if (!onPress) return <View style={styles.row}>{inner}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: p.surface2 }]}
    >
      {inner}
    </Pressable>
  );
}

/** Hairline between rows inside a card. Inset so it doesn't touch the radius. */
export function Divider() {
  const p = usePalette();
  return <View style={[styles.divider, { backgroundColor: p.border }]} />;
}

/**
 * The educational-not-medical line.
 *
 * A component rather than a copied string so it cannot drift
 * between screens, and so removing it anywhere is a visible
 * deletion in review rather than a quietly dropped paragraph.
 */
export function Disclaimer({ children, icon }: { children: ReactNode; icon?: keyof typeof Ionicons.glyphMap }) {
  const p = usePalette();
  return (
    <View style={styles.disclaimer}>
      {icon && <Ionicons name={icon} size={14} color={p.text3} style={{ marginTop: 2 }} />}
      <Text style={[type.meta, { color: p.text3, flex: 1 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: { borderRadius: radius.lg, borderWidth: 1 },
  dotRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11.5, fontWeight: "600" },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipText: { fontSize: 13 },
  button: {
    height: 50,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: spacing.base,
  },
  buttonText: { fontSize: 15, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, marginHorizontal: spacing.base },
  disclaimer: { flexDirection: "row", gap: 8, marginTop: spacing.base },
});
