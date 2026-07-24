import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../theme";

interface Entry {
  date: string;
  weightKg: number;
}

const PLOT_HEIGHT = 96;
const DOT = 8;

/**
 * Dot trend for weight. Bars would lie here (weight has no zero baseline),
 * so each entry is a point on a padded min–max scale. First and last points
 * carry direct labels; the rest stay quiet.
 */
export function WeightTrend({ entries }: { entries: Entry[] }) {
  const [width, setWidth] = useState(0);

  if (entries.length < 2) {
    return (
      <Text style={styles.placeholder}>
        Log your weight a few times and the trend appears here.
      </Text>
    );
  }

  const values = entries.map((e) => e.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Pad the scale so a stable weight doesn't render as wild swings.
  const pad = Math.max((max - min) * 0.25, 1);
  const lo = min - pad;
  const span = max + pad - lo;

  const usableWidth = Math.max(width - DOT, 0);
  const step = entries.length > 1 ? usableWidth / (entries.length - 1) : 0;

  return (
    <View
      style={styles.plot}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 &&
        entries.map((entry, i) => {
          const bottom = ((entry.weightKg - lo) / span) * (PLOT_HEIGHT - DOT);
          const left = i * step;
          const labeled = i === 0 || i === entries.length - 1;
          return (
            <View key={entry.date}>
              <View style={[styles.dot, { left, bottom }]} />
              {labeled ? (
                <Text
                  style={[
                    styles.dotLabel,
                    {
                      bottom: bottom + DOT + 2,
                      left: Math.min(Math.max(left - 16, 0), width - 44),
                    },
                  ]}
                >
                  {entry.weightKg.toFixed(1)}
                </Text>
              ) : null}
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    height: PLOT_HEIGHT,
    marginTop: spacing.md,
  },
  dot: {
    position: "absolute",
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.primary,
  },
  dotLabel: {
    position: "absolute",
    width: 44,
    textAlign: "center",
    ...type.caption,
    color: colors.textSecondary,
  },
  placeholder: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
