/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "media",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Bakgrunn
        surface: {
          DEFAULT: "#FFFFFF",   // kort, header, tab-bar
          secondary: "#F2F1EF", // app-bakgrunn, tomme flater
          dark: "#292524",      // stone-800 — kort/header mørk
          "dark-secondary": "#1C1917", // stone-900 — app-bakgrunn mørk
        },
        // Kanter
        border: {
          DEFAULT: "#E7E5E4",   // stone-200 — subtile kanter
          secondary: "#D6D3D1", // stone-300 — tydeligere kanter
          dark: "#44403C",      // stone-700 — kanter mørk
          "dark-secondary": "#57534E", // stone-600 — tydeligere kanter mørk
        },
        // Tekst
        content: {
          DEFAULT: "#1C1917",   // stone-900 — primærtekst
          secondary: "#78716C", // stone-500 — sekundærtekst
          tertiary: "#A8A29E",  // stone-400 — plassholdertekst
          dark: "#FAFAF9",      // stone-50  — primærtekst mørk
          "dark-secondary": "#A8A29E", // stone-400 — sekundærtekst mørk
          "dark-tertiary": "#57534E",  // stone-600 — plassholdertekst mørk
        },
        // Aksent — grønn
        // #1D9E75 på hvit: ~4.6:1 ✓ WCAG AA
        // #34D399 på stone-800 (#292524): ~7.2:1 ✓ WCAG AA
        accent: {
          DEFAULT: "#1D9E75", // lys modus
          dark: "#34D399",    // mørk modus — lysere for kontrast
        },
      },
    },
  },
  plugins: [],
};
