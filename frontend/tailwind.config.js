/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#040406",
        surface: "#0a0a0f",
        "surface-light": "rgba(255, 255, 255, 0.07)",
        glass: "rgba(255, 255, 255, 0.04)",
        "glass-border": "rgba(255, 255, 255, 0.08)",
        "glass-hover": "rgba(255, 255, 255, 0.07)",
        border: "rgba(255, 255, 255, 0.08)",
        "border-active": "rgba(0, 255, 136, 0.4)",
        "text-primary": "#ffffff",
        "text-secondary": "#8888aa",
        "text-muted": "#44445a",
        accent: "#00ff88",
        "accent-blue": "#0099ff",
        success: "#00ff88",
        warning: "#ffaa00",
        danger: "#ff4444",
        "glow-green": "rgba(0, 255, 136, 0.15)",
        "glow-blue": "rgba(0, 153, 255, 0.15)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        heading: ["'Space Grotesk'", "Inter", "system-ui", "sans-serif"],
        mono: ["'Space Grotesk'", "'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        glass: "16px",
      },
      boxShadow: {
        "glow-green": "0 0 40px rgba(0, 255, 136, 0.15), 0 0 80px rgba(0, 255, 136, 0.05)",
        "glow-green-lg": "0 0 60px rgba(0, 255, 136, 0.2), 0 0 120px rgba(0, 255, 136, 0.08)",
        "glow-blue": "0 0 40px rgba(0, 153, 255, 0.15), 0 0 80px rgba(0, 153, 255, 0.05)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
        "fade-up-1": "fadeUp 0.6s ease-out 0.1s both",
        "fade-up-2": "fadeUp 0.6s ease-out 0.2s both",
        "fade-up-3": "fadeUp 0.6s ease-out 0.3s both",
        "fade-up-4": "fadeUp 0.6s ease-out 0.4s both",
        "fade-up-5": "fadeUp 0.6s ease-out 0.5s both",
        "fade-up-6": "fadeUp 0.6s ease-out 0.6s both",
        "fade-up-7": "fadeUp 0.6s ease-out 0.7s both",
        "fade-right": "fadeRight 0.6s ease-out 0.4s both",
        "pulse-live": "pulseLive 2s ease-in-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "spin-slow": "spin 1s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseLive: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
