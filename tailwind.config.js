/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f1419',
          elevated: '#151c24',
          card: '#1a232d',
          hover: '#222d39',
        },
        border: {
          DEFAULT: '#2a3847',
          strong: '#374756',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warn: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -4px rgba(0,0,0,0.4)',
        glow: '0 0 0 1px rgba(16,185,129,0.2), 0 4px 24px -4px rgba(16,185,129,0.15)',
      },
    },
  },
  plugins: [],
}
