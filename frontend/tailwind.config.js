/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#183B62',
        accent: '#2563EB',
        card: '#FFFFFF',
        success: '#16A34A',
        error: '#DC2626',
        // 기존 코드가 쓰는 이름 (text-text, text-sub, bg-bg)
        bg: '#F5F7FA',
        text: '#1F2937',
        sub: '#6B7280',
        // 새 코드에서 권장하는 이름 (같은 값)
        surface: '#F5F7FA',
        ink: { DEFAULT: '#1F2937', sub: '#6B7280' },
      },
    },
  },
  plugins: [],
};
