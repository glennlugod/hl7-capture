/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
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
        // shadcn/ui semantic colors (using CSS variables)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand colors from UX spec
        brand: {
          blue: "#1e3a5f",
          teal: "#00bcd4",
          light: "#e3f2fd",
        },
        // Semantic colors from UX spec
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",
        // Data visualization colors for HL7 protocol
        hl7: {
          outbound: "#ff6b35", // Device → LIS
          inbound: "#9333ea", // LIS → Device
          start: "#10b981", // Start marker (0x05)
          message: "#00bcd4", // Message content
          ack: "#3b82f6", // Acknowledgment (0x06)
          end: "#64748b", // End marker (0x04)
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      fontSize: {
        // Type scale from UX spec
        display: ["2rem", { lineHeight: "1.2", fontWeight: "700" }],
        h1: ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        h2: ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        h3: ["1rem", { lineHeight: "1.5", fontWeight: "600" }],
        body: ["0.875rem", { lineHeight: "1.6", fontWeight: "400" }],
        small: ["0.75rem", { lineHeight: "1.5", fontWeight: "400" }],
        tiny: ["0.6875rem", { lineHeight: "1.4", fontWeight: "400" }],
      },
      spacing: {
        // 4px base unit spacing scale
        xs: "0.25rem", // 4px
        sm: "0.5rem", // 8px
        md: "1rem", // 16px
        lg: "1.5rem", // 24px
        xl: "2rem", // 32px
        "2xl": "3rem", // 48px
        "3xl": "4rem", // 64px
      },
      boxShadow: {
        // Subtle shadows from UX spec
        sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px rgba(0, 0, 0, 0.07)",
        lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
        xl: "0 20px 25px rgba(0, 0, 0, 0.15)",
      },
      borderRadius: {
        // Border radius from UX spec
        none: "0px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        full: "9999px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
