/** @type {import('tailwindcss').Config} */
/**
 * Brand palette for Gold + Blue. Runtime styling uses CSS variables in `src/styles/globals.css`
 * (imported after `index.css`). Regenerate `index.css` from Tailwind source when a PostCSS pipeline is added.
 */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /** Brand hex palette (use semantic `primary` / `background` in components when possible). */
        brand: {
          primary: "#1E3A8A",
          secondary: "#3B82F6",
          gold: "#D4AF37",
          "bg-light": "#F9FAFB",
          "bg-dark": "#0F172A",
          "text-light": "#111827",
          "text-dark": "#F9FAFB",
          /** Alias for older `primary-light` references */
          "primary-light": "#3B82F6",
        },
      },
      borderRadius: {
        xl: "calc(0.75rem + 4px)",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
