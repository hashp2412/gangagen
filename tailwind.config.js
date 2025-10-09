/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'arca': ['Arca Majora 3', 'sans-serif'],
        'space': ['Space Grotesk', 'sans-serif'],
        'bricolage': ['Bricolage Grotesque', 'sans-serif'],
        'manrope': ['Manrope', 'sans-serif'],
        'jakarta': ['Plus Jakarta Sans', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
        'display': ['Space Grotesk', 'Bricolage Grotesque', 'sans-serif'],
        'heading': ['Bricolage Grotesque', 'Manrope', 'sans-serif'],
        'body': ['Plus Jakarta Sans', 'Manrope', 'sans-serif'],
        'ui': ['Manrope', 'Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        // Linear theme colors
        'linear-white': {
          DEFAULT: '#ffffff',
          soft: '#fafafa',
          muted: '#f5f5f5',
        },
        'linear-green': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          DEFAULT: '#22c55e',
        },
        'linear-orange': {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          DEFAULT: '#f97316',
        },
        'linear-text': {
          primary: '#1a1a1a',
          secondary: '#4a4a4a',
        },
        'linear-border': '#e5e5e5',
      },
      backgroundImage: {
        'linear-gradient': 'linear-gradient(135deg, #f0fdf4 0%, #fff7ed 50%, #ffffff 100%)',
        'linear-button': 'linear-gradient(135deg, #fdba74, #f97316)',
        'linear-button-hover': 'linear-gradient(135deg, #fb923c, #ea580c)',
        'linear-accent': 'linear-gradient(90deg, #86efac, #fdba74)',
        'linear-card': 'linear-gradient(90deg, #f0fdf4, #fff7ed)',
        'green-orange': 'linear-gradient(45deg, #dcfce7, #ffedd5)',
        'green-orange-light': 'linear-gradient(135deg, #f0fdf4, #fff7ed)',
      },
      boxShadow: {
        'linear': '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'linear-hover': '0 8px 16px rgba(0, 0, 0, 0.08), 0 3px 6px rgba(0, 0, 0, 0.05)',
        'linear-focus': '0 0 0 3px rgba(34, 197, 94, 0.1)',
        'linear-orange': '0 4px 12px rgba(249, 115, 22, 0.2)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.2)',
          },
          '50%': {
            boxShadow: '0 0 16px rgba(249, 115, 22, 0.3)',
          },
        },
      },
    },
  },
  plugins: [],
}