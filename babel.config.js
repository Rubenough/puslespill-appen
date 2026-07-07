module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated/worklets-pluginen må ligge sist i lista.
    plugins: ["react-native-reanimated/plugin"],
  };
};
