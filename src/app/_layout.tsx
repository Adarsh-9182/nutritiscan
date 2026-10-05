import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PhoneFrame } from "@/components/PhoneFrame";
import { dark } from "@/theme";
import { ThemeProvider, useTheme } from "@/theme/context";
import { LocalHealthProvider } from "@/lib/localHealth";

// Local-first journal. Cloud AI and the legacy Supabase layer are not active.
function RootNavigator() {
  const { palette, scheme } = useTheme();

  return (
    <>
      {/* The status bar has to invert with the theme, or light mode
          renders white glyphs on a cream background. */}
      <StatusBar style={scheme === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        {/* Meal entry presents above the journal tabs. */}
        <Stack.Screen name="scan" options={{ presentation: "fullScreenModal", animation: "fade" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocalHealthProvider>
          <View style={{ flex: 1, backgroundColor: dark.bg }}>
            {/* On a wide browser window this centres the app in a
                phone-width column. On a device it's a passthrough. */}
            <PhoneFrame>
              <RootNavigator />
            </PhoneFrame>
          </View>
        </LocalHealthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
