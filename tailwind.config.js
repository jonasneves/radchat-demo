/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        duke: {
          navy: '#012169',
          royal: '#00539B',
          'royal-light': '#E8F1F8',
          copper: '#C84E00',
          persimmon: '#E89923',
          piedmont: '#A1B70D',
          shale: '#0577B1',
          whisper: '#F3F2F1',
          hatteras: '#E2E6ED',
          graphite: '#666666',
          granite: '#B5B5B5',
        }
      }
    },
  },
  plugins: [],
}
