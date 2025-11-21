/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f97316', // Orange-500
          hover: '#ea580c',   // Orange-600
          light: '#fdba74',   // Orange-300
        },
        background: {
          DEFAULT: '#0f172a', // Slate-900
          paper: '#1e293b',   // Slate-800
          lighter: '#334155', // Slate-700
        },
        text: {
          primary: '#f8fafc', // Slate-50
          secondary: '#cbd5e1', // Slate-300
          muted: '#94a3b8',   // Slate-400
        }
      }
    },
  },
  plugins: [],
}






