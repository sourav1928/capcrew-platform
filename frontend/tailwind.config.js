const colors = require('tailwindcss/colors')

// CapCrew theme: every `blue-*` class in the shop and admin now renders as orange.
// To change the brand colour, swap `colors.orange` below (e.g. colors.rose, colors.emerald, colors.indigo).
module.exports = {
  content: ['./index.html', './admin-site/index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: colors.orange,
        primary: {
          50: colors.orange[50],
          100: colors.orange[100],
          500: colors.orange[500],
          600: colors.orange[600],
          700: colors.orange[700],
        },
        secondary: {
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        success: {
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
}
