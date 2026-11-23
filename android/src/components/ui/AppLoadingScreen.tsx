import React from "react";
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, GAME_TYPOGRAPHY } from "../../constants/theme";

const LOADING_IMAGE = require("../../../assets/images/loading.png");

interface AppLoadingScreenProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function AppLoadingScreen({ message, style }: AppLoadingScreenProps) {
  return (
    <ImageBackground
      source={LOADING_IMAGE}
      style={[styles.container, style]}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.contentContainer}>
        {message ? (
          <View style={styles.pillContainer}>
            <ActivityIndicator size="small" color={COLORS.accentGold} style={styles.spinner} />
            <Text style={styles.message}>{message}</Text>
          </View>
        ) : (
          <View style={styles.pillContainer}>
            <ActivityIndicator size="small" color={COLORS.accentGold} />
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#5499E7",
  },
  contentContainer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 251, 245, 0.92)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowStrong,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  spinner: {
    marginRight: 10,
  },
  message: {
    ...GAME_TYPOGRAPHY.body,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
