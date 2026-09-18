/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core neutrals - warm light theme
        background: "var(--background)",
        "background-secondary": "var(--background-secondary)",
        "background-tertiary": "var(--background-tertiary)",
        "background-elevated": "var(--background-elevated)",
        foreground: "var(--foreground)",
        "foreground-muted": "var(--foreground-muted)",
        "foreground-subtle": "var(--foreground-subtle)",
        // Primary - restrained indigo/purple
        primary: "var(--primary)",
        "primary-dark": "var(--primary-dark)",
        "primary-light": "var(--primary-light)",
        "primary-foreground": "var(--primary-foreground)",
        // Card surfaces
        card: "var(--card-bg)",
        "card-border": "var(--card-border)",
        "card-border-hover": "var(--card-border-hover)",
        border: "var(--border-color)",
        // Sidebar
        sidebar: "var(--sidebar-bg)",
        // Semantic colors - restrained usage
        success: "var(--success)",
        "success-light": "var(--success-light)",
        warning: "var(--warning)",
        "warning-light": "var(--warning-light)",
        error: "var(--error)",
        "error-light": "var(--error-light)",
        muted: "var(--muted)",
        // Accent colors - for specific educational contexts only
        teal: "var(--teal)",
        "teal-light": "var(--teal-light)",
        "teal-soft": "var(--teal-soft)",
        indigo: "var(--indigo)",
        "indigo-subtle": "var(--indigo-subtle)",
        "indigo-soft": "var(--indigo-soft)",
        // Glass effects
        "glass-bg": "var(--glass-bg)",
        "glass-border": "var(--glass-border)",
        "glass-shadow": "var(--glass-shadow)",
        "glass-strong-bg": "var(--glass-strong-bg)",
        "glass-strong-border": "var(--glass-strong-border)",
        "glass-strong-shadow": "var(--glass-strong-shadow)",
        // Form inputs
        input: "var(--input-bg)",
        "input-border": "var(--input-border)",
        "input-border-focus": "var(--input-border-focus)",
        // Overlay
        "overlay-bg": "var(--overlay-bg)",
        // Focus ring
        "focus-ring": "var(--focus-ring)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Monospace"],
      },
      fontSize: {
        // Refined type scale
        "display-xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-lg": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-md": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-sm": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
        "heading-xl": ["1.875rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-lg": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-md": ["1.25rem", { lineHeight: "1.35", letterSpacing: "-0.005em", fontWeight: "600" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.4", letterSpacing: "-0.005em", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" }],
        "body": ["1rem", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55", letterSpacing: "0", fontWeight: "400" }],
        "caption": ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0.005em", fontWeight: "400" }],
        "caption-sm": ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.01em", fontWeight: "400" }],
        "micro": ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "500" }],
      },
      spacing: {
        // Refined spacing scale
        "0": "0",
        "0.5": "0.125rem",   // 2px
        "1": "0.25rem",      // 4px
        "1.5": "0.375rem",   // 6px
        "2": "0.5rem",       // 8px
        "2.5": "0.625rem",   // 10px
        "3": "0.75rem",      // 12px
        "3.5": "0.875rem",   // 14px
        "4": "1rem",         // 16px
        "5": "1.25rem",      // 20px
        "6": "1.5rem",       // 24px
        "7": "1.75rem",      // 28px
        "8": "2rem",         // 32px
        "9": "2.25rem",      // 36px
        "10": "2.5rem",      // 40px
        "11": "2.75rem",     // 44px
        "12": "3rem",        // 48px
        "14": "3.5rem",      // 56px
        "16": "4rem",        // 64px
        "20": "5rem",        // 80px
        "24": "6rem",        // 96px
        "28": "7rem",        // 112px
        "32": "8rem",        // 128px
      },
      borderRadius: {
        none: "0",
        "xs": "0.1875rem",   // 3px
        "sm": "0.25rem",     // 4px
        "md": "0.375rem",    // 6px
        "lg": "0.5rem",      // 8px
        "xl": "0.75rem",     // 12px
        "2xl": "1rem",       // 16px
        "3xl": "1.25rem",    // 20px
        "4xl": "1.5rem",     // 24px
        full: "9999px",
      },
      boxShadow: {
        // Refined shadow scale - subtle, premium
        "xs": "0 1px 2px 0 rgba(26, 26, 46, 0.02)",
        "sm": "0 1px 3px 0 rgba(26, 26, 46, 0.04), 0 1px 2px -1px rgba(26, 26, 46, 0.04)",
        "md": "0 4px 12px -2px rgba(26, 26, 46, 0.06), 0 2px 4px -2px rgba(26, 26, 46, 0.03)",
        "lg": "0 12px 24px -6px rgba(26, 26, 46, 0.08), 0 4px 6px -4px rgba(26, 26, 46, 0.04)",
        "xl": "0 20px 40px -12px rgba(26, 26, 46, 0.1), 0 8px 16px -8px rgba(26, 26, 46, 0.05)",
        "2xl": "0 28px 56px -16px rgba(26, 26, 46, 0.12), 0 12px 24px -12px rgba(26, 26, 46, 0.06)",
        // Glass shadows
        glass: "0 4px 16px 0 rgba(26, 26, 46, 0.04)",
        "glass-strong": "0 8px 32px 0 rgba(26, 26, 46, 0.06)",
        // Focus
        focus: "0 0 0 3px var(--focus-ring)",
        // Colored shadows for primary actions
        "primary-sm": "0 4px 14px 0 rgba(109, 87, 224, 0.25)",
        "primary-md": "0 6px 20px 0 rgba(109, 87, 224, 0.3)",
        "primary-lg": "0 12px 28px 0 rgba(109, 87, 224, 0.35)",
      },
      animation: {
        // Refined animations - fast, purposeful
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.15s ease-in",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-left": "slide-left 0.3s ease-out",
        "slide-right": "slide-right 0.3s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "scale-out": "scale-out 0.1s ease-in",
        "shimmer": "shimmer 1.5s infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "bounce-soft": "bounce-soft 0.5s ease-out",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-left": {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-right": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.96)" },
        },
        "shimmer": {
          "0%": { "background-position": "-200% 0" },
          "100%": { "background-position": "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      transitionDuration: {
        "0": "0ms",
        "50": "50ms",
        "75": "75ms",
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "250": "250ms",
        "300": "300ms",
        "400": "400ms",
        "500": "500ms",
        "700": "700ms",
        "1000": "1000ms",
      },
      transitionTimingFunction: {
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
        "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};