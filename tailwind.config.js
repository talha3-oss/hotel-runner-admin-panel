/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#B47A3A', // Main brand color
          600: '#a0692e',
          700: '#8b5a26',
          800: '#744b1f',
          900: '#5d3c19',
        },
        maroon: {
          50: '#fdf2f2',
          100: '#fce7e7',
          200: '#f9d5d5',
          300: '#f4b5b5',
          400: '#ec8888',
          500: '#e15d5d',
          600: '#cd3f3f',
          700: '#ab2f2f',
          800: '#8d2828',
          900: '#742626',
        }
      },
    },
  },
  plugins: [],
}