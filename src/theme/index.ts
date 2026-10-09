// NutritiScan shared web/mobile visual language. Semantic states remain separate.

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
// Shared with nutritiscan.com: midnight ground, lime actions, mint evidence.
export const dark: Palette = {
  bg: "#05080a", bgElevated: "#090e0c", surface: "#0e1613", surface2: "#14201b", surface3: "#1c2c24",
  border: "rgba(203,235,215,0.12)", borderStrong: "rgba(203,235,215,0.23)",
  text: "#e9f2ec", text2: "#a3b5a9", text3: "#869b8d",
  accent: "#c9fa63", accentPressed: "#b5e74f", accentInk: "#102015", accentText: "#c9fa63",
  accentSoft: "rgba(201,250,99,0.09)", accentLine: "rgba(201,250,99,0.25)",
  attention: "#eac095", attentionText: "#edc9a4", attentionSoft: "rgba(234,192,149,0.10)", attentionLine: "rgba(234,192,149,0.28)",
  steady: "#6fe8b4", steadyText: "#8be9be", steadySoft: "rgba(111,232,180,0.09)", steadyLine: "rgba(111,232,180,0.23)",
  evidence: "#6fe8b4", evidenceText: "#8cebc3", evidenceSoft: "rgba(111,232,180,0.09)", evidenceLine: "rgba(111,232,180,0.23)",
  chartLine: "#c9fa63", chartAlt: "#6fe8b4", chartGrid: "rgba(203,235,215,0.10)",
  overlay: "rgba(5,8,10,0.7)", overlayText: "#e9f2ec",
};
export const light: Palette = {
  bg: "#f6faf5", bgElevated: "#edf3ed", surface: "#ffffff", surface2: "#edf3ed", surface3: "#e1eae1",
  border: "rgba(16,32,21,0.12)", borderStrong: "rgba(16,32,21,0.23)",
  text: "#102015", text2: "#445b4b", text3: "#5f7565",
  accent: "#c9fa63", accentPressed: "#b5e74f", accentInk: "#102015", accentText: "#3b6017",
  accentSoft: "rgba(141,193,45,0.12)", accentLine: "rgba(94,133,25,0.30)",
  attention: "#b07835", attentionText: "#7d4d15", attentionSoft: "rgba(176,120,53,0.09)", attentionLine: "rgba(176,120,53,0.28)",
  steady: "#237a52", steadyText: "#1c6041", steadySoft: "rgba(35,122,82,0.09)", steadyLine: "rgba(35,122,82,0.23)",
  evidence: "#237a52", evidenceText: "#1c6041", evidenceSoft: "rgba(35,122,82,0.09)", evidenceLine: "rgba(35,122,82,0.23)",
  chartLine: "#547f1d", chartAlt: "#237a52", chartGrid: "rgba(16,32,21,0.10)",
  overlay: "rgba(5,8,10,0.7)", overlayText: "#e9f2ec",
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
    shadowColor: "#c9fa63",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  accent: {
    shadowColor: "#c9fa63",
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
