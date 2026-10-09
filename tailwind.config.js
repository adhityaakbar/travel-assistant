/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2563EB',
          lightBlue: '#EFF6FF',
          dark: '#0F172A',
          muted: '#64748B',
          bg: '#F8FAFC',
          border: '#E2E8F0',
          emerald: '#10B981',
          lightEmerald: '#ECFDF5'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
        heading: ['Plus Jakarta Sans', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
