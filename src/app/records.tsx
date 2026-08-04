// ============================================================
// MEDICAL RECORDS
//
// "Never make users organize folders. The AI should organize
// everything."
//
// So there is no folder, no tag editor, no "move to". The only
// organisation is derived: by kind (the filter rail), by year
// (the grouping), and by content (the search).
//
// The detail that makes this an assistant rather than a drive:
// EVERY ROW SAYS WHAT THE APP ALREADY DID WITH THE DOCUMENT —
// "38 markers · summarised · compared to March". A file manager
// tells you a file exists. This tells you it was read.
//
// Search covers the extracted contents, not just titles, which is
// why "ferritin" finds a document called "Full blood panel".
// Title-only search would push the user back into remembering
// their own filing — the exact job this screen removes.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenBody, ScreenHeader, Section } from "@/components/Screen";
import { EmptyState } from "@/components/states";
import { Card, Chip } from "@/components/ui";
import { RECORDS, RECORD_LABEL, formatRecordDate, groupByYear, searchRecords, type RecordKind } from "@/domain/records";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

const ICON: Record<RecordKind, keyof typeof Ionicons.glyphMap> = {
  lab: "document-text-outline",
  prescription: "medkit-outline",
  vaccine: "shield-checkmark-outline",
  imaging: "image-outline",
  note: "document-outline",
};

const KINDS: RecordKind[] = ["lab", "prescription", "vaccine", "imaging"];

export default function Records() {
  const p = usePalette();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<RecordKind | null>(null);

  const groups = useMemo(
    () => groupByYear(searchRecords(RECORDS, query, kind ?? undefined)),
    [query, kind],
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader
        backTo="/you"
        title="Records"
        trailing={
          <Pressable
            onPress={() => router.push({ pathname: "/scan", params: { mode: "report" } })}
            accessibilityLabel="Add a record"
            hitSlop={10}
          >
            <Ionicons name="add" size={22} color={p.accentText} />
          </Pressable>
        }
      />

      <ScreenBody>
        {/* Search first — the primary way in, not a filter of last
            resort. */}
        <View style={[styles.search, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Ionicons name="search" size={17} color={p.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search reports, prescriptions"
            placeholderTextColor={p.text3}
            style={[styles.searchInput, { color: p.text }]}
            accessibilityLabel="Search reports and prescriptions"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
        >
          <Chip selected={kind === null} onPress={() => setKind(null)}>
            All
          </Chip>
          {KINDS.map((k) => (
            <Chip key={k} selected={kind === k} onPress={() => setKind(kind === k ? null : k)}>
              {RECORD_LABEL[k]}
            </Chip>
          ))}
        </ScrollView>

        {groups.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title={query ? "Nothing matches “" + query + "”" : "Nothing filed here yet"}
            body={
              query
                ? "Search looks inside your documents, not just their titles — so if it isn't here, it hasn't been added yet."
                : "Scan a report or a prescription and it appears here already summarised, already compared to what came before."
            }
            actionLabel={query ? "Clear search" : "Scan a document"}
            onAction={() =>
              query ? setQuery("") : router.push({ pathname: "/scan", params: { mode: "report" } })
            }
          />
        ) : (
          groups.map((group) => (
            <Section key={group.year} title={String(group.year)}>
              <Card>
                {group.records.map((r, i) => (
                  <Pressable
                    key={r.id}
                    onPress={() => r.href && router.push(r.href as never)}
                    disabled={!r.href}
                    style={({ pressed }) => [
                      styles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                      pressed && r.href ? { backgroundColor: p.surface2 } : null,
                    ]}
                  >
                    <View style={[styles.icon, { backgroundColor: p.surface2, borderColor: p.border }]}>
                      <Ionicons name={ICON[r.kind]} size={16} color={p.text3} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[type.body, { color: p.text, fontWeight: "600" }]} numberOfLines={1}>
                        {r.title}
                      </Text>
                      {/* What the app already did with it. */}
                      <Text style={[type.meta, { color: p.text3, marginTop: 2 }]} numberOfLines={2}>
                        {formatRecordDate(r.date)} · {r.did}
                      </Text>
                    </View>
                    {r.href && <Ionicons name="chevron-forward" size={16} color={p.text3} />}
                  </Pressable>
                ))}
              </Card>
            </Section>
          ))
        )}

        <Text style={[type.meta, { color: p.text3, marginTop: spacing.xl }]}>
          Everything here is stored on this device. Nothing was filed by you — the app read each document,
          named it, and compared it to what came before.
        </Text>
      </ScreenBody>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginTop: spacing.base,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
