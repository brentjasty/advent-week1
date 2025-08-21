/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}", // scan all your src files for classes
      "./public/index.html"
    ],
    theme: {
      extend: {
        fontFamily: {
          cinzel: ["Cinzel", "serif"],     // for ADVENT title
          poppins: ["Poppins", "sans-serif"], // for body, sidebar, etc.
        },
        colors: {
          sidebar: "#2c3e50", // your sidebar background
        }
      },
    },
    plugins: [],
  };
  