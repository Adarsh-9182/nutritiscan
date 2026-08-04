import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { dark, light, type Palette } from "./index";

// ============================================================
// THEME
//
// Dark by default, with an explicit Light and a System option —
// matching the vision's "Same structure, daylight surfaces".
//
// The stored choice wins over the OS in BOTH directions: a user
// who picked Light on a dark-mode phone gets light. Deferring to
// the OS whenever it disagrees is the bug that makes a theme
// toggle feel broken.
// ============================================================

export type ThemeChoice = "dark" | "light" | "system";

const KEY = "ns2-theme";

type ThemeState = {
  choice: ThemeChoice;
  /** The palette actually in effect, after resolving "system". */
  palette: Palette;
  scheme: "dark" | "light";
  setChoice: (c: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeState>({
  choice: "dark",
  palette: dark,
  scheme: "dark",
  setChoice: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>("dark");

  // Restore the stored preference. Until it lands we render dark,
  // which is the default anyway — so there is no flash, just a
  // late correction for the minority who chose light.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        if (raw === "dark" || raw === "light" || raw === "system") setChoiceState(raw);
      })
      .catch(() => {
        // Storage unavailable — the default is still correct.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c);
    AsyncStorage.setItem(KEY, c).catch(() => {
      // Persistence failed; the session still honours the choice.
    });
  }, []);

  const value = useMemo<ThemeState>(() => {
    const scheme: "dark" | "light" =
      choice === "system" ? (system === "light" ? "light" : "dark") : choice;
    return { choice, scheme, palette: scheme === "light" ? light : dark, setChoice };
  }, [choice, system, setChoice]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** The common case: a screen only needs the colours. */
export const usePalette = () => useContext(ThemeContext).palette;
