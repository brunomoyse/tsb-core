import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'hero-pattern': "url('/main-bg.jpg')",
      },
      colors: {
        'charcoal': '#302b2c',
        'coralPink': {
          DEFAULT: '#e96c74',
          darker: '#d25660' // Darkened version of coralPink.
        },
        'offWhite': '#f5f0f0',
        'softPink': '#e9b3bc'
      },
    },
  },
  plugins: [],
}
export default config
