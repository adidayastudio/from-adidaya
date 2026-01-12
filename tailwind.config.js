/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ============================
       * COLOR TOKENS (from :root)
       * ============================ */
      colors: {
        // BRAND
        "brand-red": "var(--brand-red)",
        "brand-red-soft": "var(--brand-red-soft)",
        "brand-red-fade": "var(--brand-red-fade)",
        "brand-blue": "var(--brand-blue)",
        "brand-green": "var(--brand-green)",
        "brand-yellow": "var(--brand-yellow)",

        // ACTION
        "action-primary": "var(--action-primary)",
        "action-primary-hover": "var(--action-primary-hover)",
        "action-primary-pressed": "var(--action-primary-pressed)",
        "action-danger": "var(--action-danger)",
        "action-warning": "var(--action-warning)",
        "action-success": "var(--action-success)",
        "action-info": "var(--action-info)",

        // TEXT
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-muted": "var(--text-muted)",
        "text-inverse": "var(--text-inverse)",

        // BACKGROUND
        "bg-0": "var(--bg-0)",
        "bg-100": "var(--bg-100)",
        "bg-200": "var(--bg-200)",
        "bg-300": "var(--bg-300)",
        "bg-400": "var(--bg-400)",
        "bg-surface": "var(--bg-surface)",
        "bg-raised": "var(--bg-raised)",
        "bg-overlay": "var(--bg-overlay)",
        "bg-soft": "var(--bg-soft)", // Pillar specific soft background

        // BORDER
        "border-light": "var(--border-light)",
        "border-default": "var(--border-default)",
        "border-strong": "var(--border-strong)",
        "border-soft": "var(--border-soft)", // Pillar specific soft border
        // SYSTEM STATE BACKGROUNDS
        "state-success-bg": "var(--success-bg)",
        "state-warning-bg": "var(--warning-bg)",
        "state-danger-bg": "var(--danger-bg)",
        "state-info-bg": "var(--info-bg)",
      },

      /* ============================
       * RADIUS TOKENS
       * ============================ */
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
        card: "var(--radius-lg)",      // alias buat kartu
        pill: "var(--radius-full)",    // alias buat chip / button pill
      },

      /* ============================
       * SHADOW TOKENS
       * ============================ */
      boxShadow: {
        "soft": "var(--shadow-soft)",
        "card": "var(--shadow-card)",
        "glow": "var(--shadow-glow)",
      },

      /* ============================
       * TYPOGRAPHY SCALE
       * ============================ */
      fontSize: {
        h1: [
          "var(--h1-size)",
          { lineHeight: "1.1" },
        ],
        h2: [
          "var(--h2-size)",
          { lineHeight: "1.15" },
        ],
        h3: [
          "var(--h3-size)",
          { lineHeight: "1.2" },
        ],
        h4: [
          "var(--h4-size)",
          { lineHeight: "1.3" },
        ],
        h5: [
          "var(--h5-size)",
          { lineHeight: "1.4" },
        ],
        body: [
          "var(--body-size)",
          { lineHeight: "1.8" },
        ],
        small: [
          "var(--small-size)",
          { lineHeight: "1.5" },
        ],
      },

      /* (opsional) kalau mau spacing token dipakai via class
         misal p-space-4 → padding: var(--space-4)
         tinggal aktifkan block ini dan pakai nama custom,
         biar gak nabrak scale default Tailwind
      */
      spacing: {
        "space-1": "var(--space-1)",
        "space-2": "var(--space-2)",
        "space-3": "var(--space-3)",
        "space-4": "var(--space-4)",
        "space-5": "var(--space-5)",
        "space-6": "var(--space-6)",
        "space-7": "var(--space-7)",
        "space-8": "var(--space-8)",
        "space-10": "var(--space-10)",
        "space-12": "var(--space-12)",
        "space-16": "var(--space-16)",
      },

      fontFamily: {
        sans: ["var(--font-family)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
