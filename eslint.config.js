// Flat config (ESLint 9). Expo-anbefalte regler + Prettier deaktiverer
// formateringsregler som ellers krasjer med Prettier.
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*", "babel.config.js"],
  },
  {
    rules: {
      // Fetch-på-mount setter loading-state synkront i en effekt. Idiomatisk her;
      // fjernes skikkelig når data-henting flyttes til React Query (PROJECT-PLAN Phase 4).
      // Advarsel (ikke error) slik at CI ikke feiler på et bevisst mønster.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
