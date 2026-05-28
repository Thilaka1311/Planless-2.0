/**
 * Design Tokens - Single Source of Truth for Planless Theme
 * This ensures visual consistency across all AI edits and refactors.
 */

export const theme = {
  colors: {
    brand: {
      orange: "#ff5e3a",
      peach: "#ff8b66",
    },
    surface: {
      dark: "#121214",
      card: "#1c1c1e",
      hover: "#262629",
      background: "#0c0c0e",
    },
    text: {
      primary: "#e4e4e7",
      secondary: "#a1a1aa",
      muted: "#71717a",
    },
    status: {
      success: {
        bg: "rgba(16, 185, 129, 0.1)", // emerald-500/10
        text: "#34d399", // emerald-400
        border: "rgba(16, 185, 129, 0.2)",
      },
      warning: {
        bg: "rgba(245, 158, 11, 0.1)", // amber-500/10
        text: "#fbbf24", // amber-400
        border: "rgba(245, 158, 11, 0.2)",
      },
      error: {
        bg: "rgba(244, 63, 94, 0.1)", // rose-500/10
        text: "#fb7185", // rose-400
        border: "rgba(244, 63, 94, 0.2)",
      },
      hosted: {
        bg: "rgba(255, 255, 255, 0.1)",
        text: "#ffffff",
        border: "rgba(255, 255, 255, 0.2)",
      }
    }
  },
  typography: {
    fonts: {
      sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
      display: '"Space Grotesk", sans-serif',
      mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    }
  },
  animation: {
    spring: {
      bouncy: { type: "spring", stiffness: 400, damping: 25 },
      smooth: { type: "spring", stiffness: 300, damping: 30 },
      gentle: { type: "spring", stiffness: 200, damping: 20 },
    },
    duration: {
      fast: 0.2,
      normal: 0.3,
      slow: 0.5,
    }
  }
};
