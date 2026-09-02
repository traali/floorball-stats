/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        salibandy: {
          dark: '#0B132B',
          navy: '#1C2541',
          teal: '#3A506B',
          cyan: '#5BC0BE',
          bright: '#6FFFE9',
          gold: '#F59E0B'
        }
      }
    },
  },
  plugins: [],
}
