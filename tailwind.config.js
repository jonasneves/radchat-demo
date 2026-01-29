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
          'light-blue': '#0577B1',
          copper: '#C84E00',
          persimmon: '#E89923',
          eno: '#339898',
          piedmont: '#A1B70D',
          shale: '#0577B1',
          whisper: '#F3F2F1',
          hatteras: '#E2E6ED',
          graphite: '#666666',
          granite: '#B5B5B5',
        },
        gray: {
          50: '#F8F9FA',
          100: '#E9ECEF',
          200: '#DEE2E6',
          300: '#CED4DA',
          400: '#ADB5BD',
          500: '#6C757D',
          600: '#495057',
          700: '#343A40',
          800: '#212529',
          900: '#1A1D20',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.06)',
        'lg': '0 4px 12px rgba(1, 33, 105, 0.1)',
        'xl': '0 8px 24px rgba(1, 33, 105, 0.12)',
        'focus': '0 0 0 3px rgba(0, 83, 155, 0.3)',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      maxWidth: {
        'prose': '65ch',
        'content': '800px',
        'wide': '1000px',
      },
    },
  },
  plugins: [],
}
