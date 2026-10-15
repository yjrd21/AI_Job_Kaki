/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      colors: {
        ink: "var(--color-ink)",
        forest: "var(--color-forest)",
        muted: "var(--color-muted)",
        rust: "var(--color-rust)",
        paper: "var(--color-paper)",
        line: "var(--color-line)",
        surface: "var(--color-surface)",
      },
      borderRadius: { sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)" },
    },
  },
  plugins: [],
};
