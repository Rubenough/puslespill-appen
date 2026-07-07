// Reanimated-shared values er laget for å muteres via `.value`; react-hooks/immutability
// gir falske positiver på det mønsteret, så vi slår den av for denne fila.
/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from "react";
import { View, Modal, Pressable, ScrollView, Dimensions, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedKeyboard,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from "react-native-reanimated";

const SCREEN_HEIGHT = Dimensions.get("window").height;
// Arket dekker aldri mer enn dette; resten scroller.
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;
// Hvor langt/raskt man må dra før arket lukkes.
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 800;
const MAX_BACKDROP_OPACITY = 0.5;

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** a11y-etikett på bakteppet (f.eks. "Lukk meny"). */
  closeLabel: string;
  children: React.ReactNode;
  /** Horisontal padding på innholdet. Default `px-4`. */
  contentClassName?: string;
};

/**
 * Delt bunn-ark med dra-for-å-lukke (via håndtaket øverst), bakteppe-trykk,
 * tastatur-heving, høyde-tak med intern scroll, sikker-sone-padding og
 * inn/ut-animasjon. Erstatter de håndrullede `Modal`-arkene rundt i appen.
 */
export default function BottomSheet({
  visible,
  onClose,
  closeLabel,
  children,
  contentClassName = "px-4",
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  // Holder Modal montert til utgangsanimasjonen er ferdig.
  const [rendered, setRendered] = useState(visible);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const keyboard = useAnimatedKeyboard();

  // Monter så snart vi blir synlige. Betinget state-oppdatering under render er
  // det anbefalte mønsteret for å justere state når en prop endrer seg.
  if (visible && !rendered) setRendered(true);

  useEffect(() => {
    if (!rendered) return;
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setRendered)(false);
        },
      );
    }
  }, [rendered, visible, translateY]);

  // Håndtaket øverst lukker arket. Gesten sitter kun på håndtaket, så intern
  // scroll i innholdet ikke kjemper mot dra-for-å-lukke.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
        // La `visible`-effekten kjøre utgangsanimasjonen fra gjeldende posisjon.
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT],
      [MAX_BACKDROP_OPACITY, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Løft arket over tastaturet når det er oppe.
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboard.height.value }],
  }));

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Egen GH-root: gester virker ikke i RN Modal uten dette. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, backdropStyle]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          />
        </Animated.View>

        <Animated.View
          style={[{ position: "absolute", left: 0, right: 0, bottom: 0 }, sheetStyle]}
        >
          <View
            className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-3"
            style={{ paddingBottom: insets.bottom + 24, maxHeight: MAX_SHEET_HEIGHT }}
          >
            {/* Håndtak = dra-sone for å lukke. */}
            <GestureDetector gesture={pan}>
              <View className="pb-3 pt-1">
                <View className="w-10 h-1 bg-border dark:bg-border-dark rounded-full self-center" />
              </View>
            </GestureDetector>

            <ScrollView
              className={contentClassName}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
