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
        background: '#0F172A', // Slate 900
        surface: '#1E293B', // Slate 800
        primary: '#3B82F6', // Blue 500
        accent: '#10B981', // Emerald 500
        danger: '#EF4444', // Red 500
        warning: '#F59E0B', // Amber 500
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(to right bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.01))'
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
export default config
