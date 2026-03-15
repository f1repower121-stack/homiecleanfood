/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        homie: {
          green: '#2d5a3d',
          lime: '#4a7c59',
          cream: '#faf7f4',
          orange: '#c4704a',
          dark: '#1c1917',
          gray: '#57534e',
        },
      },
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
