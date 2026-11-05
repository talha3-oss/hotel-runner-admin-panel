/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // The brand colour, which the customer site has used since 2026-11-03.
        // The panel was on Tailwind's own orange, so an admin looking at both
        // saw two different oranges and neither was the hotel's. 600 is
        // #A56D35 exactly; the rest of the ramp is that hue lightened and
        // darkened around it.
        primary: {
          50:  '#faf6f1',
          100: '#f2e9dc',
          200: '#e4d0b4',
          300: '#d2b088',
          400: '#bd8d5c',
          500: '#b17a44',
          600: '#a56d35',
          700: '#88592c',
          800: '#6c4724',
          900: '#58391e',
        },
      },
    },
  },
  plugins: [],
};
