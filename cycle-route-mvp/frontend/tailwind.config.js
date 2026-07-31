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
      },
      backgroundImage: {
        'gradient-conic': 'conic-gradient(var(--conic-position), var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
