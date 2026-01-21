/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    /* ===============================
       KIOSK FONT SCALE (KEEP AS-IS)
    ================================ */
    fontSize: {
      xs:  ['20px', { lineHeight: '1.5' }],
      sm:  ['24px', { lineHeight: '1.5' }],
      base:['28px', { lineHeight: '1.5' }],
      lg:  ['32px', { lineHeight: '1.5' }],
      xl:  ['36px', { lineHeight: '1.4' }],
      '2xl':['42px', { lineHeight: '1.4' }],
      '3xl':['48px', { lineHeight: '1.3' }],
      '4xl':['56px', { lineHeight: '1.3' }],
      '5xl':['64px', { lineHeight: '1.2' }],
      '6xl':['72px', { lineHeight: '1.1' }],
      '7xl':['80px', { lineHeight: '1.1' }],
      '8xl':['96px', { lineHeight: '1.0' }],
      '9xl':['128px',{ lineHeight: '1.0' }],
    },

    extend: {
      /* ===============================
         TOUCH TARGETS (KIOSK)
      ================================ */
      minHeight: {
        touch: '64px',
        'touch-lg': '72px',
        'touch-xl': '80px',
      },
      minWidth: {
        touch: '64px',
        'touch-lg': '72px',
        'touch-xl': '80px',
      },

      /* ===============================
         SPACING SCALE (KIOSK)
      ================================ */
      spacing: {
        18: '4.5rem',  // 72px
        20: '5rem',    // 80px
        22: '5.5rem',  // 88px
        26: '6.5rem',  // 104px
        30: '7.5rem',  // 120px
      },

      /* ===============================
         SEMANTIC COLOR SYSTEM
         (THIS IS THE FIX)
      ================================ */
      colors: {
        /* Brand */
        brand: {
          DEFAULT: 'var(--brand-primary)',
          dim: 'var(--brand-primary-dim)',
          danger: 'var(--brand-danger)',
        },

        /* Surfaces */
        surface: {
          main: 'var(--surface-main)',
          card: 'var(--surface-card)',
          muted: 'var(--surface-muted)',
        },

        /* Text */
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          inverse: 'var(--text-inverse)',
        },

        /* Borders */
        border: {
          DEFAULT: 'var(--border-default)',
        },
      },
    },
  },

  plugins: [],
};
