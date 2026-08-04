// ============================================================
// CHARTS
//
// Every chart in this product is SINGLE-SERIES. That is a
// product decision before it is a chart decision: the vision
// says "a sentence beats a sparkline", so the written summary
// carries the meaning and the chart only has to show shape. One
// series means no legend (the title names it) and no categorical
// palette to get wrong.
//
// Fixed specs, applied everywhere:
//   - 2px lines, round cap/join
//   - end markers r=4.5 with a 2px surface ring, so the dot stays
//     legible where it crosses the line
//   - hairline SOLID gridlines one step off the surface
//   - labels wear TEXT tokens, never the series colour — a light
//     amber is illegible as text; identity comes from the mark
//   - selective direct labels only; never a number on every point
//   - the container height includes the axis band, so labels are
//     never clipped
//
// The one intentional exception to "no dashed lines": the
// comfortable-floor rule on a biomarker trend. There, dashing IS
// the meaning — it marks a threshold, not a grid — and it carries
// a visible label saying so.
//
// Charts measure their own width via onLayout and draw in TRUE
// PIXEL SPACE. The shortcut (a fixed viewBox stretched to fit)
// distorts every mark that should be round: a 100-unit sparkline
// across 330px scales x by 6.6 and y by 2, flattening end-dots
// into ovals.
// ============================================================

import { useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export type Point = { t: string; v: number };

// ------------------------------------------------------------
// Geometry
// ------------------------------------------------------------

type Box = { w: number; h: number; pad: number };

function scale(points: Point[], box: Box, padFraction = 0.12) {
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series would divide by zero and collapse to a single
  // row of pixels; give it a nominal span so the line renders
  // mid-height instead of vanishing.
  const span = max - min || Math.max(1, Math.abs(max) * 0.1);
  const lo = min - span * padFraction;
  const hi = max + span * padFraction;

  const x = (i: number) => box.pad + (i / Math.max(1, points.length - 1)) * (box.w - box.pad * 2);
  const y = (v: number) => box.h - box.pad - ((v - lo) / (hi - lo)) * (box.h - box.pad * 2);
  return { x, y, lo, hi };
}

/** Catmull-Rom → cubic Bézier. Smooth without overshooting the data. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    // Tension 1/6 keeps the curve inside the data envelope. A
    // higher tension would draw an energy dip lower than the
    // lowest reading, which in a health chart is a fabrication.
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** Measure the container so the SVG can draw at real pixel size. */
function useWidth(fallback: number) {
  const [w, setW] = useState(fallback);
  const onLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next > 0 && Math.abs(next - w) > 0.5) setW(next);
  };
  return { width: w, onLayout };
}

// ------------------------------------------------------------
// LineChart
// ------------------------------------------------------------

export function LineChart({
  label,
  unit = "",
  points,
  markAt,
  threshold,
  height = 130,
  showAxis = true,
  footnote,
}: {
  label: string;
  unit?: string;
  points: Point[];
  /** Emphasise one point by name — the extreme the story is about. */
  markAt?: string;
  /** A horizontal threshold rule, e.g. the floor of the comfortable range. */
  threshold?: { value: number; label: string };
  height?: number;
  showAxis?: boolean;
  footnote?: string;
}) {
  const p = usePalette();
  const { width, onLayout } = useWidth(300);

  // The plot box excludes the axis band. Sizing the container to
  // the plot alone is what crops the x labels.
  const axisBand = showAxis ? 22 : 0;
  const box: Box = { w: width, h: height - axisBand, pad: 12 };

  const withThreshold = threshold ? [...points, { t: "__t", v: threshold.value }] : points;
  const geo = scale(withThreshold, box, 0.14);

  const coords = points.map((pt, i) => ({ x: geo.x(i), y: geo.y(pt.v), ...pt }));
  const path = smoothPath(coords);
  const markIndex = markAt ? points.findIndex((pt) => pt.t === markAt) : -1;
  const active = markIndex >= 0 ? markIndex : coords.length - 1;
  const activePoint = coords[active];

  const areaPath =
    coords.length > 1
      ? `${path} L${coords[coords.length - 1].x},${box.h - box.pad} L${coords[0].x},${box.h - box.pad} Z`
      : "";

  const axisStep = Math.ceil(points.length / 4);

  return (
    <View onLayout={onLayout}>
      <Text style={[type.eyebrow, { color: p.text3, marginBottom: spacing.sm }]}>{label}</Text>

      <Svg width={width} height={height} accessibilityLabel={`${label} chart`}>
        {threshold && (
          <>
            {/* Dashed ON PURPOSE — a threshold, not a grid. It
                carries a label so it can't read as noise. */}
            <Line
              x1={box.pad}
              x2={width - box.pad}
              y1={geo.y(threshold.value)}
              y2={geo.y(threshold.value)}
              stroke={p.chartGrid}
              strokeWidth={1}
              strokeDasharray="3,4"
            />
            <SvgText
              x={width - box.pad}
              y={geo.y(threshold.value) - 6}
              textAnchor="end"
              fill={p.text3}
              fontSize={9.5}
            >
              {threshold.label}
            </SvgText>
          </>
        )}

        {/* Area wash at ~9% — never a saturated block. */}
        {areaPath ? <Path d={areaPath} fill={p.chartLine} opacity={0.09} /> : null}

        <Path d={path} fill="none" stroke={p.chartLine} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {activePoint && (
          <>
            <Line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={box.pad * 0.5}
              y2={box.h - box.pad}
              stroke={p.chartGrid}
              strokeWidth={1}
            />
            {/* r=4.5 with a 2px surface ring. */}
            <Circle cx={activePoint.x} cy={activePoint.y} r={6.5} fill={p.surface} />
            <Circle cx={activePoint.x} cy={activePoint.y} r={4.5} fill={p.chartLine} />
          </>
        )}

        {showAxis &&
          points.map((pt, i) => {
            // Thin the axis so labels can't collide on a narrow phone.
            if (i % axisStep !== 0 && i !== points.length - 1) return null;
            return (
              <SvgText
                key={pt.t}
                x={geo.x(i)}
                y={height - 5}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                fill={p.text3}
                fontSize={10}
              >
                {pt.t}
              </SvgText>
            );
          })}
      </Svg>

      {/* The readout lives outside the SVG so it wears real text
          tokens and the app's font metrics. */}
      {activePoint && (
        <Text style={[type.meta, { color: p.text3, marginTop: 2 }]}>
          <Text style={{ color: p.text2 }}>{activePoint.t}</Text>{" "}
          <Text style={[{ color: p.text }, type.num]}>
            {activePoint.v}
            {unit}
          </Text>
        </Text>
      )}

      {footnote && <Text style={[type.meta, { color: p.text3, marginTop: 6 }]}>{footnote}</Text>}
    </View>
  );
}

// ------------------------------------------------------------
// RangeBar
//
// The most important chart in the product, because it is the one
// that replaces a red "HIGH" flag. It shows POSITION, never
// pass/fail: the comfortable band is drawn as a region you would
// rather be in, not a boundary you failed to clear.
// ------------------------------------------------------------

export function RangeBar({
  value,
  axis,
  comfortable,
  unit,
  label,
}: {
  value: number;
  axis: [number, number];
  comfortable: [number, number];
  unit: string;
  label: string;
}) {
  const p = usePalette();
  const [lo, hi] = axis;
  const span = hi - lo || 1;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));

  const pos = clamp((value - lo) / span);
  const bandStart = clamp((comfortable[0] - lo) / span);
  const bandEnd = clamp((comfortable[1] - lo) / span);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label}: ${value} ${unit}. Reference range ${lo} to ${hi}. Comfortable range ${comfortable[0]} to ${comfortable[1]}.`}
    >
      <View style={[styles.track, { backgroundColor: p.surface3 }]}>
        {/* Below the comfortable band, tinted amber — the region
            the value is actually in. */}
        {pos < bandStart && (
          <View
            style={[
              styles.bandAbs,
              { left: 0, width: `${bandStart * 100}%`, backgroundColor: p.attention, opacity: 0.4 },
            ]}
          />
        )}
        {pos > bandEnd && (
          <View
            style={[
              styles.bandAbs,
              { left: `${bandEnd * 100}%`, right: 0, backgroundColor: p.attention, opacity: 0.4 },
            ]}
          />
        )}

        {/* "You'd rather be here", not "you passed". */}
        <View
          style={[
            styles.bandAbs,
            {
              left: `${bandStart * 100}%`,
              width: `${Math.max(0, bandEnd - bandStart) * 100}%`,
              backgroundColor: p.steady,
              opacity: 0.45,
            },
          ]}
        />

        {/* The value marker, with a surface ring either side so it
            reads against whichever band it lands on. */}
        <View
          style={[
            styles.marker,
            { left: `${pos * 100}%`, backgroundColor: p.text, borderColor: p.surface },
          ]}
        />
      </View>

      <View style={styles.rangeLabels}>
        <Text style={[type.meta, type.num, { color: p.text3 }]}>{lo}</Text>
        <Text style={[type.meta, { color: p.text3 }]}>
          Comfortable: {comfortable[0]}–{comfortable[1]}
        </Text>
        <Text style={[type.meta, type.num, { color: p.text3 }]}>{hi}</Text>
      </View>
    </View>
  );
}

// ------------------------------------------------------------
// ScoreRing
// ------------------------------------------------------------

export function ScoreRing({ score, size = 58, label }: { score: number; size?: number; label: string }) {
  const p = usePalette();
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  // Tone by band, and always beside a text label — colour alone
  // never carries the verdict.
  const stroke = score >= 70 ? p.steady : score >= 45 ? p.attention : p.accent;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label}: ${score} out of 100`}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.surface3} strokeWidth={3} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${c * pct},${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Text style={[{ color: p.text, fontSize: 15, fontWeight: "700" }, type.num]}>{score}</Text>
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------
// Meter
// ------------------------------------------------------------

export function Meter({
  value,
  target,
  label,
  unit = "g",
  tone = "accent",
}: {
  value: number;
  target: number;
  label: string;
  unit?: string;
  tone?: "accent" | "steady";
}) {
  const p = usePalette();
  const pct = Math.max(0, Math.min(1, target > 0 ? value / target : 0));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: target, now: value }}
      accessibilityLabel={label}
    >
      <View style={styles.meterHead}>
        <Text style={[type.meta, { color: p.text2 }]}>{label}</Text>
        <Text style={[type.meta, type.num, { color: p.text }]}>
          {value} / {target} {unit}
        </Text>
      </View>
      <View style={[styles.meterTrack, { backgroundColor: p.surface3 }]}>
        <View
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            borderRadius: radius.full,
            backgroundColor: tone === "steady" ? p.steady : p.accent,
          }}
        />
      </View>
    </View>
  );
}

// ------------------------------------------------------------
// Sparkline — a stat tile's trend. No axis, no labels; the tile's
// own value and delta carry the numbers.
// ------------------------------------------------------------

export function Sparkline({
  points,
  height = 30,
  style,
}: {
  points: Point[];
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const { width, onLayout } = useWidth(120);
  const box: Box = { w: width, h: height, pad: 4 };
  const geo = scale(points, box, 0.2);
  const coords = points.map((pt, i) => ({ x: geo.x(i), y: geo.y(pt.v) }));
  const last = coords[coords.length - 1];

  return (
    <View onLayout={onLayout} style={style}>
      <Svg width={width} height={height}>
        <Path d={smoothPath(coords)} fill="none" stroke={p.chartLine} strokeWidth={2} strokeLinecap="round" />
        {last && (
          <>
            <Circle cx={last.x} cy={last.y} r={4} fill={p.surface} />
            <Circle cx={last.x} cy={last.y} r={2.5} fill={p.chartLine} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
    justifyContent: "center",
  },
  bandAbs: { position: "absolute", top: 0, bottom: 0 },
  marker: {
    position: "absolute",
    width: 7,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    marginLeft: -3.5,
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  meterHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  meterTrack: { height: 6, borderRadius: radius.full, overflow: "hidden" },
});
