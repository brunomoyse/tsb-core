import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundColor: {
        'tsb': {
          'red': {
            lightest: '#FFc7CA',
            lighter: '#FF8F95',
            DEFAULT: '#ED1C24',
            darker: '#a6141c'
          },
          'gray': {
            lightest: '#EDEDED',
            lighter: '#808D88',
            DEFAULT: '#132D24'
          },
        },
        'off-white': '#f5f0f0',
      },
      colors: {
        'tsb': {
          'red': {
            lightest: '#FFc7CA',
            lighter: '#FF8F95',
            DEFAULT: '#ED1C24',
            darker: '#B30F14'
          },
          'gray': {
            lightest: '#EDEDED',
            lighter: '#808D88',
            DEFAULT: '#132D24'
          },
        },
        'off-white': '#f5f0f0',
        //'charcoal': '#302b2c',
        //'coralPink': {
        //  DEFAULT: '#e96c74',
        //  darker: '#d25660' // Darkened version of coralPink.
        //},
        //'offWhite': '#f5f0f0',
        //'softPink': '#e9b3bc'
      },
      fontFamily: {
        'logo': 'Channel',
      }
    },
  },
  plugins: [],
}
export default config
