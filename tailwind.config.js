/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#146EF5',    // Electric Cobalt Blue
          primaryDark: '#0D63F8',
          accent: '#00D69F',     // Neon Mint / Solana Turquoise
          accentBright: '#14F195',
          base: '#0A1128',       // Deep Midnight Navy
          baseDark: '#060A17',
          surface: '#0F172A',
          card: '#111A36',
          border: 'rgba(20, 110, 245, 0.18)',
        },
        cobalt: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#38bdf8',
          500: '#146EF5',
          600: '#0D63F8',
          700: '#034fd1',
        },
        mint: {
          50: '#f0fdf4',
          400: '#14F195',
          500: '#00D69F',
          600: '#05B083',
        },
        navy: {
          900: '#0F172A',
          950: '#0A1128',
          990: '#060A17',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
          '50%': { opacity: 0.8, transform: 'scale(1.03)' },
        }
      }
    },
  },
  plugins: [],
};
