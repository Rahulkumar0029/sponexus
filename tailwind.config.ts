import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-base': '#020617',
        'dark-layer': '#0F172A',
        'accent-orange': '#F59E0B',
        'text-light': '#FFFFFF',
        'text-muted': '#9CA3AF',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #020617 0%, #0F172A 100%)',
        'gradient-orange': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      },
      boxShadow: {
        'glow-orange': '0 0 30px rgba(245, 158, 11, 0.3)',
        'glow-blue': '0 0 30px rgba(59, 130, 246, 0.2)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
export default config
