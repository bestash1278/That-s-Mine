/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#183B62',
        accent: '#2563EB',
        bg: '#F5F7FA',
        card: '#FFFFFF',
        text: '#1F2937',
        sub: '#6B7280',
        success: '#16A34A',
        error: '#DC2626',
      },
    },
  },
  plugins: [],
}
