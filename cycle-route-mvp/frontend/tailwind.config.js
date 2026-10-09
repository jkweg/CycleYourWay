/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'burnt-orange': {
          DEFAULT: '#FC6C26',
          dark: '#E05518',
          deeper: '#C94A12',
        },
        vanilla: {
          DEFAULT: '#FFF4D6',
          deep: '#F5E6C0',
        },
        ink: {
          DEFAULT: '#2A1A12',
          muted: '#4F3728',
        },
        // Redesign 2026-10 ("atlas trasy"): rust = orange text on vanilla (contrast),
        // sage = nature/success accent, cream = warm off-white surfaces, water = map rivers.
        rust: '#B8410F',
        sage: {
          DEFAULT: '#2F6F57',
          soft: '#E1EFE6',
          light: '#8FC6A8',
        },
        cream: '#FFFBF0',
        sand: '#D9C79C',
        water: '#BFD9E3',
      },
      backgroundImage: {
        'gradient-conic': 'conic-gradient(var(--conic-position), var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
