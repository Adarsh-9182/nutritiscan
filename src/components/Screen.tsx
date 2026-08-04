// ============================================================
// SCREEN CHROME
//
// One header for the whole product, so back navigation, the
// title and the trailing action can never drift between screens.
//
// The back button uses `router.back()` only when there is
// something to go back to, and falls back to an explicit
// destination otherwise. Half these screens are reachable by deep
// link (a lab summary from a notification, a medicine from a
// record), where a bare `back()` either does nothing or drops the
// user out of the app.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

/** Bottom padding every scrolling surface owes the tab bar. */
export function useScrollPadding(extra = 0) {
  const insets = useSafeAreaInsets();
  return layout.tabBarHeight + insets.bottom + spacing.xxl + extra;
}

export function ScreenHeader({
  title,
  eyebrow,
  backTo,
  trailing,
}: {
  title?: string;
  /** Small label above/instead of the title — "PANEL · 12 JULY". */
  eyebrow?: string;
  /** Provide to show a back button; also the fallback destination. */
  backTo?: string;
  trailing?: ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (backTo) router.replace(backTo as never);
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + spacing.sm, backgroundColor: p.bg, borderBottomColor: p.border },
      ]}
    >
      {backTo !== undefined && (
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={24} color={p.text2} />
        </Pressable>
      )}

      <View style={styles.headerBody}>
        {eyebrow && <Text style={[type.eyebrow, { color: p.text3 }]}>{eyebrow}</Text>}
        {title && (
          <Text style={[type.h3, { color: p.text }]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>

      {trailing}
    </View>
  );
}

/** The scrolling body of a screen. Owns the tab bar's height. */
export function ScreenBody({
  children,
  style,
  extraBottom = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  extraBottom?: number;
}) {
  const p = usePalette();
  const pad = useScrollPadding(extraBottom);
  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: p.bg }, style]}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: pad }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

/** A footer pinned above the tab bar for a screen's single primary action. */
export function ScreenFooter({ children }: { children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: p.bg,
          borderTopColor: p.border,
          bottom: layout.tabBarHeight + insets.bottom,
        },
      ]}
    >
      {children}
    </View>
  );
}

/** A titled block with consistent vertical rhythm. */
export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  return (
    <View style={[{ marginTop: spacing.xxl }, style]}>
      {(title || action) && (
        <View style={styles.sectionHead}>
          {title && <Text style={[type.eyebrow, { color: p.text3 }]}>{title}</Text>}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { marginLeft: -6 },
  headerBody: { flex: 1, minWidth: 0 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: spacing.md,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

/**
 * Legacy wrapper, kept for the auth and onboarding screens.
 *
 * Those predate v2 and are outside this redesign's scope, but
 * they must keep compiling and must not render in stale colours —
 * so this re-implements the old API on the v2 palette rather than
 * being deleted.
 */
export function Screen({
  children,
  keyboardAvoiding,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  keyboardAvoiding?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();

  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[
        { padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        { flex: 1, padding: spacing.lg, paddingTop: insets.top + spacing.lg },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  if (!keyboardAvoiding) return <View style={{ flex: 1, backgroundColor: p.bg }}>{inner}</View>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {inner}
    </KeyboardAvoidingView>
  );
}
