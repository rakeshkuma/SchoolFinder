/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce7ff',
          200: '#bfd3ff',
          300: '#93b4fd',
          400: '#608cfa',
          500: '#3b66f5',
          600: '#2448e8',
          700: '#1c38cf',
          800: '#1d31a7',
          900: '#1e2f84',
          950: '#141c4f',
        },
        // Saffron accent: calls to action and highlights.
        accent: {
          50: '#fff8eb',
          100: '#ffecc6',
          200: '#ffd788',
          300: '#ffbd4a',
          400: '#ffa520',
          500: '#f98307',
          600: '#dd5f02',
          700: '#b74006',
        },
        ink: {
          DEFAULT: '#0b1324',
          soft: '#1b2540',
        },
        // Light enough that slate-500 secondary text keeps a 4.5:1 contrast ratio (WCAG AA).
        canvas: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        lift: '0 12px 32px -12px rgba(16, 24, 40, 0.18), 0 4px 8px -4px rgba(16, 24, 40, 0.06)',
        glow: '0 0 0 6px rgba(59, 102, 245, 0.12)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Opacity only, so it composes with translate utilities used to position the element.
        'fade-down': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-down': 'fade-down 0.15s ease-out both',
      },
    },
  },
  plugins: [],
};
