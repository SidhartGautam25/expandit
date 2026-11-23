import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Image, Animated } from "react-native";

export type CliboExpression =
  | "happy"
  | "explaining"
  | "cheering"
  | "thinking"
  | "warning"
  | "shocked";

const CLIBO_IMAGES: Record<CliboExpression, any> = {
  happy: require("../../assets/game/clibo/happy.png"),
  explaining: require("../../assets/game/clibo/explaining.png"),
  cheering: require("../../assets/game/clibo/cheering.png"),
  thinking: require("../../assets/game/clibo/thinking.png"),
  warning: require("../../assets/game/clibo/warning.png"),
  shocked: require("../../assets/game/clibo/warning.png"),
};

interface CliboMascotProps {
  expression?: CliboExpression;
  size?: number;
}

export function CliboMascot({
  expression = "happy",
  size = 84,
}: CliboMascotProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle floating bounce on step/expression change
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: -8,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 0,
        friction: 4,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expression, bounceAnim]);

  const source = CLIBO_IMAGES[expression] ?? CLIBO_IMAGES.happy;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          transform: [{ translateY: bounceAnim }],
        },
      ]}
    >
      <Image
        source={source}
        style={styles.image}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
