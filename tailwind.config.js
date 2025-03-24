/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#1e293b",
        input: "#1e293b",
        ring: "#1e293b",
        background: "#0f172a",
        foreground: "#f8fafc",
        primary: {
          DEFAULT: "#4f46e5",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#475569",
          foreground: "#f8fafc",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#1e293b",
          foreground: "#94a3b8",
        },
        accent: {
          DEFAULT: "#1e293b",
          foreground: "#f8fafc",
        },
        popover: {
          DEFAULT: "#0f172a",
          foreground: "#f8fafc",
        },
        card: {
          DEFAULT: "#1e293b",
          foreground: "#f8fafc",
        },
        success: {
          DEFAULT: "#22c55e",
          foreground: "#ffffff",
        },
        violet: {
          DEFAULT: "#7c3aed",
          foreground: "#ffffff",
        },
        lime: {
          DEFAULT: "#ccff00",
          foreground: "#0f172a",
        },
        brand: {
          DEFAULT: "#7c3aed",
          secondary: "#4f46e5",
          accent: "#ccff00",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
