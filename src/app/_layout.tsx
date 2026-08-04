import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PhoneFrame } from "@/components/PhoneFrame";
import { dark } from "@/theme";
import { ThemeProvider, useTheme } from "@/theme/context";

/**
 * The app opens straight onto the question field.
 *
 * There is no sign-in and no account. Everything this product
 * knows lives on the device (src/domain), so there is nothing an
 * account would unlock — and a health app that asks you to
 * register before it will tell you anything is asking for trust
 * it hasn't earned yet.
 *
 * The Supabase session layer is still in src/lib/session.tsx if
 * accounts come back later; nothing imports it today.
 */
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
        {/* The scanner is a full-screen capture surface, so it
            presents modally rather than sliding in as a page. */}
        <Stack.Screen name="scan" options={{ presentation: "fullScreenModal", animation: "fade" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={{ flex: 1, backgroundColor: dark.bg }}>
          {/* On a wide browser window this centres the app in a
              phone-width column. On a device it's a passthrough. */}
          <PhoneFrame>
            <RootNavigator />
          </PhoneFrame>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
