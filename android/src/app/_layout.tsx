import { useEffect } from "react";
import { Stack } from "expo-router";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Fredoka_700Bold, Fredoka_600SemiBold } from "@expo-google-fonts/fredoka";
import { COLORS } from "../constants/theme";
import { useGameSounds } from "../hooks/useGameSounds";
import { GameConfigProvider, useGameConfig } from "../context/GameConfigContext";
import { AppLoadingScreen } from "../components/ui/AppLoadingScreen";

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell() {
  useGameSounds();
  const { loading } = useGameConfig();
  const [fontsLoaded] = useFonts({
    Fredoka_700Bold,
    Fredoka_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (loading || !fontsLoaded) {
    return <AppLoadingScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GameConfigProvider>
      <AppShell />
    </GameConfigProvider>
  );
}
