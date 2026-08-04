// ============================================================
// GROCERY PLANNER
//
// "Grouped by aisle because that's how shopping happens. Swaps
// state both what they save and what they cost — never a silent
// substitution."
//
// AISLE, NOT RECIPE. A list ordered by recipe sends you back
// across the shop four times. Aisle order is the only grouping
// that matches the physical task, and it is derived — the user
// never files anything.
//
// SWAPS ARE LABELLED, ALWAYS. The planner will put tofu in the
// basket instead of paneer because it serves the LDL goal and
// costs less. What it will not do is put it there quietly. A
// silent substitution is the fastest way to lose trust in a list:
// you find out at the till, and then you wonder what else was
// changed without telling you.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenBody, ScreenFooter, ScreenHeader, Section } from "@/components/Screen";
import { EmptyState } from "@/components/states";
import { Button, Card } from "@/components/ui";
import { buildGrocery, buildWeek } from "@/domain/plan";
import { useConstraints } from "@/lib/planStore";
import { spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

const rupees = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function Grocery() {
  const p = usePalette();
  const [active] = useConstraints();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState(false);

  const list = useMemo(() => buildGrocery(buildWeek(active)), [active]);

  // Only count what is still to buy — a total that includes ticked
  // items is the wrong number the moment you start shopping.
  const remaining = list.items.filter((i) => !checked[i.item]);
  const remainingTotal = remaining.reduce((a, i) => a + i.price, 0);
  const doneCount = list.items.length - remaining.length;

  const toggle = (item: string) => setChecked((c) => ({ ...c, [item]: !c[item] }));

  if (!list.items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <ScreenHeader backTo="/plan" title="Shopping list" />
        <EmptyState
          icon="basket-outline"
          title="Nothing to buy yet"
          body="Your week has no meals in it, so there's nothing to shop for. Set a constraint or two and the plan — and this list — will build themselves."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader
        backTo="/plan"
        title="Shopping list"
        trailing={<Text style={[type.h3, type.num, { color: p.text }]}>{rupees(remainingTotal)}</Text>}
      />

      <ScreenBody extraBottom={70}>
        <Text style={[type.meta, { color: p.text3, marginTop: spacing.md }]}>
          {list.items.length} items · {list.days} days of meals
          {doneCount > 0 ? " · " + doneCount + " in the basket" : ""}
        </Text>

        {/* Swaps, stated. Never silent. */}
        {list.swaps.map((s) => (
          <Card key={s.from} tone="steady" style={{ padding: spacing.md, marginTop: spacing.base }}>
            <Text style={[type.body, { color: p.text2 }]}>
              Swapped <Text style={{ color: p.text, fontWeight: "600" }}>{s.from}</Text> for{" "}
              <Text style={{ color: p.text, fontWeight: "600" }}>{s.to}</Text> — saves {rupees(s.saves)} and{" "}
              {s.benefit}.
            </Text>
          </Card>
        ))}

        {list.byAisle.map((group) => (
          <Section key={group.aisle} title={group.aisle}>
            <Card>
              {group.items.map((item, i) => {
                const on = !!checked[item.item];
                return (
                  <Pressable
                    key={item.item}
                    onPress={() => toggle(item.item)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => [
                      styles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                      pressed && { backgroundColor: p.surface2 },
                    ]}
                  >
                    <View
                      style={[
                        styles.box,
                        on
                          ? { backgroundColor: p.accent, borderColor: p.accent }
                          : { borderColor: p.borderStrong },
                      ]}
                    >
                      {on && <Ionicons name="checkmark" size={13} color={p.accentInk} />}
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          type.body,
                          {
                            color: on ? p.text3 : p.text,
                            textDecorationLine: on ? "line-through" : "none",
                          },
                        ]}
                      >
                        {item.item}
                        <Text style={[type.meta, { color: p.text3 }]}>  {item.qty}</Text>
                      </Text>
                      {item.swappedFrom && (
                        <Text style={[type.meta, { color: p.steadyText, marginTop: 2 }]}>
                          swapped from {item.swappedFrom}
                        </Text>
                      )}
                    </View>

                    <Text style={[type.meta, type.num, { color: on ? p.text3 : p.text2 }]}>
                      {rupees(item.price)}
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
          </Section>
        ))}

        <View style={styles.footRow}>
          <Text style={[type.meta, { color: p.text3, flex: 1 }]}>
            Prices are estimates and vary by shop.
          </Text>
          {doneCount > 0 && (
            <Pressable onPress={() => setChecked({})}>
              <Text style={{ color: p.accentText, fontSize: 13, fontWeight: "600" }}>Clear ticks</Text>
            </Pressable>
          )}
        </View>
      </ScreenBody>

      <ScreenFooter>
        <Button
          variant="primary"
          icon={sent ? "checkmark" : "basket-outline"}
          title={sent ? "Sent — open your delivery app" : "Send to delivery"}
          onPress={() => setSent(true)}
          disabled={sent}
        />
      </ScreenFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
});
