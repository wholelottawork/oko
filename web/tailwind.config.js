/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'oko-gold': {
          DEFAULT: 'var(--oko-gold)',
          dim: 'var(--oko-border)',
          glow: 'var(--panel-border-hover)',
          highlight: 'var(--accent-primary-hover)',
        },
        'oko-bg': {
          DEFAULT: 'var(--background)',
          deeper: 'var(--oko-bg)',
          lighter: 'var(--surface-secondary)',
        },
        'oko-accent': 'var(--oko-accent)',
        'logo-blue': 'var(--logo-blue)',
        'accent': {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          active: 'var(--accent-primary-active)',
          bg: 'var(--accent-primary-bg)',
          border: 'var(--accent-primary-border)',
          'border-strong': 'var(--accent-primary-border-strong)',
        },
        'oko-text': {
          DEFAULT: 'var(--text-primary)',
          main: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
        },
        'oko-success': 'var(--binance-green)',
        'oko-danger': 'var(--binance-red)',

        white: 'var(--color-white)',
        black: 'var(--color-black)',

        zinc: {
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
          950: 'var(--neutral-950)',
        },
        gray: {
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
          950: 'var(--neutral-950)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon': 'var(--glow-primary)',
        'neon-blue': 'var(--glow-accent)',
      },
    },
  },
  plugins: [],
}
