/** Tokyo Sushi Bar brand theme tokens. Merged with the base Tailwind config by
 *  @nuxtjs/tailwindcss (each layer's tailwind.config is merged). A second brand
 *  redefines these hex values / display font; the tsb-* class names stay stable.
 *  @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {
            backgroundColor: {
                'tsb': {
                    'one': { DEFAULT: '#F6F5F2' },
                    'two': { DEFAULT: '#F0EBE3' },
                    'three': { DEFAULT: '#F2A9BD' },
                    'four': { DEFAULT: '#FFEFEF' },
                },
            },
            colors: {
                'tsb': {
                    'one': { DEFAULT: '#F6F5F2' },
                    'two': { DEFAULT: '#F0EBE3' },
                    'three': { DEFAULT: '#F2A9BD' },
                    'four': { DEFAULT: '#FFEFEF' },
                },
            },
            fontFamily: {
                channel: ['Channel', 'sans-serif'],
            },
        },
    },
}
