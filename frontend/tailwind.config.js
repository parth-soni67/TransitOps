import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A", // Deep Navy
        accent: "#14B8A6",  // Teal
        warning: "#F59E0B", // Amber
        danger: "#EF4444",  // Red
        success: "#22C55E", // Green
        surface: "#FFFFFF",
        bg: "#F8FAFC",
        muted: "#64748B",
        border: "#E2E8F0",
        // Supporting colors from Stitch Landing Page config
        "on-secondary-fixed": "#00201c",
        "on-error-container": "#93000a",
        "tertiary-container": "#2a1700",
        "secondary-container": "#6df5e1",
        "secondary-fixed": "#71f8e4",
        "secondary-fixed-dim": "#4fdbc8",
        "surface-container": "#e5eeff",
        "surface-container-low": "#eff4ff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "surface-container-lowest": "#ffffff",
        "on-surface-variant": "#45464d",
        "on-primary-container": "#7c839b",
        "on-primary-fixed": "#131b2e",
        "on-primary-fixed-variant": "#3f465c",
        "on-secondary-container": "#006f64",
        "inverse-on-surface": "#eaf1ff",
        "inverse-surface": "#213145",
        "surface-bright": "#f8f9ff",
        "surface-dim": "#cbdbf5",
        "outline-variant": "#c6c6cd",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        "container-margin": "24px",
        "stack-md": "12px",
        base: "8px",
        "section-gap": "32px",
        "card-padding": "24px",
        gutter: "16px",
        "stack-sm": "4px"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [
    forms,
    containerQueries,
  ],
}
