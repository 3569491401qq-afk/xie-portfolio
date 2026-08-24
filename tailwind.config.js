/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        surface: "#121212",
        border: "#262626",
        primary: "#ffffff",
        secondary: "#a3a3a3",
        accent: "#d4d4d4",
      },
      maxWidth: {
        custom: "1700px",
      },
      fontFamily: {
        sans: ['"Inter"', '"SF Pro Display"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};