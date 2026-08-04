// ============================================================
// NUTRITISCAN — DESIGN SYSTEM v2
// "The AI Health Operating System"
//
// This product's job is to LOWER THE PULSE. A person opening a
// blood report is already anxious; a person scanning a meal is
// already a little guilty. Every token here is chosen so the
// interface never adds to that load.
//
// Three rules govern the palette. They are enforced here, at the
// token, rather than left to each screen's judgement:
//
// 1. NO RED. Anywhere. Not for out-of-range labs, not for "high"
//    markers, not for form errors. Red is the colour of
//    emergency and this is not an emergency room. "Worth
//    attention" gets amber; "danger" is a sentence a human
//    writes, not a colour we paint. There is deliberately no red
//    token below, so a component has nothing to reach for.
//
// 2. ONE ACCENT ON RESULTS. Amber/orange is the only accent that
//    appears on a result surface. Green appears solely to say
//    "this is fine, it needs nothing from you". Blue appears
//    solely on evidence provenance.
//
// 3. SEMANTIC NAMES ONLY. Screens reference `attention`,
//    `steady`, `evidence` — never a hue. Light mode is then a
//    palette swap, not a re-layout.
// ============================================================

/**
 * Warm neutral ramp, not blue-grey.
 *
 * A pure #000/#111 grey reads clinical and cold; shifting the
 * neutrals a few degrees toward amber makes the dark theme feel
 * like a dimmed room rather than a piece of medical equipment.
 */
const n = {
  0: "#ffffff",
  25: "#fdfaf7",
  50: "#f7f2ec",
  100: "#ece5dc",
  200: "#d9d0c4",
  300: "#b8ada0",
  400: "#8f857a",
  500: "#6b625a",
  600: "#4e463f",
  700: "#35302b",
  800: "#1f1b17",
  850: "#171410",
  900: "#12100d",
  950: "#0b0908",
} as const;

export interface Palette {
  bg: string;
  bgElevated: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;

  text: string;
  text2: string;
  text3: string;

  accent: string;
  accentPressed: string;
  /** Text/icon colour that sits ON an accent fill. */
  accentInk: string;
  /** The accent used AS text — contrast-corrected per theme. */
  accentText: string;
  accentSoft: string;
  accentLine: string;

  attention: string;
  attentionText: string;
  attentionSoft: string;
  attentionLine: string;

  steady: string;
  steadyText: string;
  steadySoft: string;
  steadyLine: string;

  evidence: string;
  evidenceText: string;
  evidenceSoft: string;
  evidenceLine: string;

  /** Chart ink. Deliberately few: the line, a comparison, the grid. */
  chartLine: string;
  chartAlt: string;
  chartGrid: string;

  /** Scrims used over the camera viewfinder. */
  overlay: string;
  overlayText: string;
}

/**
 * Dark. Hierarchy is carried by SURFACE CONTRAST — each layer is
 * a little lighter than the one behind it. Shadows are nearly
 * invisible on near-black and do almost no work here.
 */
export const dark: Palette = {
  bg: n[950],
  bgElevated: n[900],
  surface: "#17130f",
  surface2: "#1e1915",
  surface3: "#262019",
  border: "rgba(255,244,232,0.09)",
  borderStrong: "rgba(255,244,232,0.17)",

  text: "#f5efe8", // 16.8:1 on bg
  text2: "#b6aca1", //  7.9:1 — secondary prose
  text3: "#8b8177", //  4.9:1 — metadata, still AA

  accent: "#f97316",
  accentPressed: "#e35d07",
  accentInk: "#23130a",
  accentText: "#ff8f45", // 7.2:1 on bg
  accentSoft: "rgba(249,115,22,0.14)",
  accentLine: "rgba(249,115,22,0.32)",

  attention: "#f6bb51",
  attentionText: "#fbd38d",
  attentionSoft: "rgba(246,187,81,0.13)",
  attentionLine: "rgba(246,187,81,0.30)",

  steady: "#3fa981",
  steadyText: "#5cc79a",
  steadySoft: "rgba(63,169,129,0.13)",
  steadyLine: "rgba(63,169,129,0.28)",

  evidence: "#5b8def",
  evidenceText: "#7aa7f5",
  evidenceSoft: "rgba(91,141,239,0.15)",
  evidenceLine: "rgba(91,141,239,0.30)",

  chartLine: "#f97316",
  chartAlt: "#f6bb51",
  chartGrid: "rgba(255,244,232,0.10)",

  overlay: "rgba(0,0,0,0.55)",
  overlayText: "rgba(255,255,255,0.92)",
};

/**
 * Light.
 *
 * Two real differences from dark:
 *  - ELEVATION carries hierarchy. On cream, a lighter surface is
 *    invisible, so cards separate with shadow + a hairline.
 *  - ACCENT-AS-TEXT DARKENS. #f97316 on cream is ~2.9:1 and fails
 *    WCAG AA outright. Every "colour as text" token steps down two
 *    stops so badges and links clear 4.5:1. This is the single most
 *    common accessibility failure in a themed design system, and it
 *    is fixed once here rather than per screen.
 */
export const light: Palette = {
  bg: n[25],
  bgElevated: n[50],
  surface: "#ffffff",
  surface2: n[50],
  surface3: n[100],
  border: "rgba(53,48,43,0.11)",
  borderStrong: "rgba(53,48,43,0.20)",

  text: "#1c1815", // 15.9:1 on bg
  text2: "#57504a", //  7.6:1
  text3: "#7b736b", //  4.7:1 — AA for metadata

  accent: "#e35d07",
  accentPressed: "#c2410c",
  accentInk: "#ffffff",
  accentText: "#c2410c", // 5.6:1 on cream
  accentSoft: "rgba(249,115,22,0.11)",
  accentLine: "rgba(226,93,7,0.28)",

  attention: "#eaa131",
  attentionText: "#86530c", // 5.9:1 on cream
  attentionSoft: "rgba(234,161,49,0.16)",
  attentionLine: "rgba(234,161,49,0.38)",

  steady: "#3fa981",
  steadyText: "#175942", // 6.4:1 on the soft green card
  steadySoft: "rgba(63,169,129,0.14)",
  steadyLine: "rgba(63,169,129,0.34)",

  evidence: "#5b8def",
  evidenceText: "#24488f", // 6.8:1
  evidenceSoft: "rgba(91,141,239,0.13)",
  evidenceLine: "rgba(91,141,239,0.32)",

  chartLine: "#e35d07",
  chartAlt: "#eaa131",
  chartGrid: "rgba(53,48,43,0.12)",

  overlay: "rgba(0,0,0,0.55)",
  overlayText: "rgba(255,255,255,0.92)",
};

/** 4pt base. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const radius = {
  xs: 8,
  sm: 11,
  md: 15,
  /** The card. */
  lg: 20,
  xl: 26,
  full: 999,
} as const;

/**
 * Motion. Durations are tokens because "how fast the app feels"
 * must be one decision, not fifty.
 *
 * Nothing in this product uses a bouncy spring — overshoot reads
 * as playful, and playful is wrong when the content is a
 * cholesterol trend.
 */
export const duration = {
  /** state flips: toggle, press */
  fast: 120,
  /** element enter/exit, chips */
  base: 200,
  /** cards, sheets, list stagger */
  slow: 320,
  /** screen transitions, hero reveals */
  screen: 520,
  /** data drawing: charts, range bars, rings */
  draw: 900,
} as const;

/**
 * Type scale, named by ROLE not size, so a screen can be re-tuned
 * without hunting `fontSize: 13` across forty files.
 *
 * Body is 15, not 14. This is a health product read by people
 * over 50 and by anyone anxious enough to be re-reading a
 * sentence. One point costs nothing and buys real legibility.
 * Nothing renders below 11, and 11 is eyebrows only — never
 * content.
 */
const tnum = { fontVariant: ["tabular-nums" as const] };

export const type = {
  /** The one sentence that matters. One per screen. */
  display: { fontSize: 30, fontWeight: "700" as const, letterSpacing: -0.8, lineHeight: 35 },
  h1: { fontSize: 25, fontWeight: "700" as const, letterSpacing: -0.6, lineHeight: 30 },
  h2: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.4, lineHeight: 26 },
  h3: { fontSize: 16, fontWeight: "600" as const, letterSpacing: -0.2, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 23 },
  bodyMedium: { fontSize: 15, fontWeight: "600" as const, lineHeight: 23 },
  meta: { fontSize: 13, fontWeight: "400" as const, lineHeight: 19 },
  metaMedium: { fontSize: 13, fontWeight: "600" as const, lineHeight: 19 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
  },
  /**
   * A measured number: the 38 in "38 µg/L".
   *
   * PROPORTIONAL figures, deliberately — tabular gives every digit
   * the width of a zero, which makes a standalone number look
   * gappy at display size. Tabular is for columns that align
   * vertically; see `num` below.
   */
  numeral: { fontSize: 46, fontWeight: "700" as const, letterSpacing: -1.8, lineHeight: 48 },
  /** Columns of figures, and any digit that changes in place. */
  num: tnum,

  // ---- Legacy aliases, for the pre-v2 auth/onboarding screens. ----
  hero: { fontSize: 46, fontWeight: "700" as const, letterSpacing: -1.8, ...tnum },
  largeTitle: { fontSize: 30, fontWeight: "700" as const, letterSpacing: -0.8 },
  title: { fontSize: 25, fontWeight: "700" as const, letterSpacing: -0.6 },
  heading: { fontSize: 16, fontWeight: "600" as const, letterSpacing: -0.2 },
  caption: { fontSize: 13, fontWeight: "400" as const },
  captionMedium: { fontSize: 13, fontWeight: "600" as const },
} as const;

/**
 * Elevation. Meaningful in light mode, nearly invisible in dark —
 * which is correct: dark separates with surface contrast.
 */
export const elevation = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  /** Legacy alias for the pre-v2 Button. */
  glow: {
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  accent: {
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
} as const;

export const layout = {
  tabBarHeight: 62,
  /** Minimum touch target the HIG asks for. */
  tapTarget: 44,
} as const;

/**
 * Legacy compatibility.
 *
 * The auth and onboarding screens predate v2 and still reference
 * the old emerald token names. Rather than rewrite screens that
 * are outside this redesign's scope, the old names are mapped
 * onto the new palette — so they compile, and they render in the
 * v2 colours instead of a stale emerald.
 *
 * Note `danger` maps to ATTENTION, not to a red. The no-red rule
 * is a product rule, not a v2-screens rule: a legacy screen must
 * not be able to reintroduce alarm colour through the back door.
 */
export const colors = {
  ...dark,
  primary: dark.accent,
  primaryBright: dark.accentText,
  primaryDeep: dark.accentPressed,
  primarySoft: dark.accentSoft,
  primaryPressed: dark.accentPressed,
  onAccent: dark.accentInk,
  textInverse: dark.accentInk,
  textSecondary: dark.text2,
  textTertiary: dark.text3,
  background: dark.bg,
  backgroundElevated: dark.bgElevated,
  surfaceMuted: dark.surface2,
  surfaceHover: dark.surface3,
  success: dark.steady,
  warning: dark.attention,
  danger: dark.attention,
  glow: dark.accentSoft,
  protein: dark.evidence,
  carbs: dark.attention,
  fat: dark.accent,
  fiber: dark.steady,
  bubbleUser: dark.accent,
  bubbleAssistant: dark.surface2,
} as const;
