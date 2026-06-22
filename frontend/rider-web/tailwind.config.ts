import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0F1E', // Deep navy black
        surface: '#111827', // Slate 900
        surfaceLight: '#1A2235',
        primary: '#00FF87', // Electric green
        secondary: '#00D4FF', // Cyan
        danger: '#EF4444', // Red
        warning: '#F59E0B', // Amber
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(0, 255, 135, 0.4)',
        'glow-secondary': '0 0 20px rgba(0, 212, 255, 0.4)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(150%)' },
        }
      }
    },
  },
  plugins: [],
}
export default config
