// Sentry sin Expo-metro-config bygger på expo/metro-config sin getDefaultConfig
// (legger til debug-ID i sourcemaps m.m.) og erstatter derfor det direkte
// getDefaultConfig-kallet. NativeWind komponeres utenpå, som før.
// Se docs/sentry-setup.md.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
