import animate from 'tailwindcss-animate'

/** Brand orange. GUIDELINES.md says #F58220; the franchisor's design kit uses #EB6100 and is awaiting a decision, so the
 *  value stays this one. It is spelled once here for Tailwind; brand.css (--ygf-orange) and the theme-color meta in
 *  nuxt.config.ts are the only other places, and the loading bar reads the CSS variable. See layers/engine/TOKENS.md. */
const YGF_ORANGE = '#F58220'

/** Yangguofu Malatang Liège theme. Palette, fonts, radii and warm shadows come
 *  from the official brand guide (malatang GUIDELINES.md). The shadcn tokens,
 *  keyframes and container settings are shared scaffolding (same as the other
 *  brand apps).
 *  @type {import('tailwindcss').Config} */
module.exports = {
  /* No dark theme: neither brand defines one (the page declares color-scheme: only light) and no `dark:` utility is used.
       `hoverOnlyWhenSupported` wraps every `hover:` in @media (hover: hover), so a lift or tint does not stick after a tap. */
  future: { hoverOnlyWhenSupported: true },
  prefix: '',

  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1200px',
      },
    },
    extend: {
      // YGF brand tokens. `ygf` = primary orange scale + supporting
      // Neutrals; class names stay stable if hex values evolve.
      colors: {
        ygf: {
          DEFAULT: YGF_ORANGE,
          light: '#FDBA74',
          dark: '#D96A10',
          bg: '#FFF7ED',
          black: '#1A1A1A',
          cream: '#FDF5EC',
          wood: '#C49A6C',
          red: '#D42B2B',
          white: '#FFFFFF',
          success: '#2E8B57',
          // Success text/fill that passes AA: 5.33:1 on white, 4.65+ on the
          // Orange tints; #2E8B57 is 4.25 on white.
          'success-dark': '#1F7A4A',
          error: '#D32F2F',
          // Warm border tint, same value as --border-default.
          border: 'rgba(242, 123, 32, 0.12)',
        },
        // Warm neutrals replace Tailwind's default cool `gray` scale, so a stray gray-* utility reads as part of the brand.
        // 400 is decor only (about 2.7:1 on white); 500 passes on white (4.8:1) but not on cream (4.43:1); use 600 and up for text.
        gray: {
          50: '#FAF8F5',
          100: '#F5F1EC',
          200: '#E8E2DA',
          300: '#D6CEC4',
          400: '#A39A90',
          500: '#7A7168',
          600: '#5F574F',
          700: '#4A433D',
          800: '#332E29',
          900: '#1A1A1A',
        },
        // Neutral text/surface grays, matching --ygf-gray-* in brand.css
        // (intermediate steps interpolated).
        'ygf-gray': {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#999999',
          500: '#808080',
          600: '#666666',
          700: '#4D4D4D',
        },
        'ygf-orange': {
          // Bare `ygf-orange` utilities (ring-ygf-orange, etc.) need
          // This DEFAULT; without it they silently emit nothing.
          DEFAULT: YGF_ORANGE,
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: YGF_ORANGE,
          600: '#D96A10',
          700: '#C2570C',
          800: '#9A3412',
          900: '#7C2D12',
          bg: '#FFF7ED',
          light: '#FDBA74',
          // Accessibility fills/text, same values as brand.css vars.
          'on-white': '#C2570C',
          'on-white-hover': '#9A3412',
          text: '#9A3412',
        },
        // `border-subtle` — faintest warm hairline (--border-subtle).
        subtle: 'rgba(242, 123, 32, 0.08)',
        // Theme contract shared with every brand app: the engine layer's
        // Components only use these names (primary-N accent scale,
        // Neutral-N neutrals, tsb-one..four surfaces) and each brand
        // Maps them. red-* stays reserved for errors.
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#999999',
          500: '#666666',
          600: '#666666',
          700: '#1A1A1A',
          800: '#1A1A1A',
          900: '#1A1A1A',
        },
        tsb: {
          one: { DEFAULT: '#FFF7ED' }, // Page background
          two: { DEFAULT: '#FDF5EC' }, // Container surface (cream)
          three: { DEFAULT: '#FDBA74' }, // Decorative
          four: { DEFAULT: '#FFEDD5' }, // Selected / active
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: YGF_ORANGE,
          600: '#D96A10',
          700: '#C2570C',
          800: '#9A3412',
          900: '#7C2D12',
          // Bare `primary` (bg-primary, border-primary, ring-primary) is the
          // AA-safe orange: white on #F58220 is 2.59:1. The brand orange
          // Stays `ygf` / --ygf-orange (decor).
          DEFAULT: '#C2570C', // --ygf-orange-on-white
          foreground: 'hsl(var(--primary-foreground))',
          hover: '#9A3412',
          soft: '#FFEDD5',
        },
      },
      // Contract overrides where the raw orange scale fails contrast: solid
      // Fills and text use the AA-safe "on-white" oranges (see brand.css),
      // And neutral hairlines stay warm-tinted per the guide.
      backgroundColor: {
        primary: { 500: '#C2570C', 600: '#C2570C', 700: '#9A3412' },
      },
      textColor: {
        // 700 is the orange text (6.9:1 on cream); 800 is one step darker so
        // `text-primary-700 hover:text-primary-800` links still react on hover.
        primary: { 500: '#C2570C', 600: '#C2570C', 700: '#9A3412', 800: '#7C2D12' },
      },
      borderColor: {
        neutral: {
          100: 'rgba(242, 123, 32, 0.08)',
          200: 'rgba(242, 123, 32, 0.12)',
          300: 'rgba(242, 123, 32, 0.18)',
        },
      },
      fontFamily: {
        // Headings: Inter for Latin (as ygfliege.be), Noto Sans SC for the CJK glyphs; zh headings switch to
        // Noto Serif SC through the `:lang(zh)` rule in main.css.
        display: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        // Body text.
        body: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        // Chinese calligraphy accents (杨国福麻辣烫).
        serifzh: ['"Noto Serif SC"', 'serif'],
      },
      /* One container width (the vitrine's --container-max, 1200px) for header, footer, menu and marketing sections:
               the shared `max-w-7xl` / `max-w-6xl` wrappers resolve to it in this brand. */
      maxWidth: {
        '6xl': '1200px',
        '7xl': '1200px',
      },
      /* 14px floor for secondary text (GUIDELINES.md §3.3): `text-xs` is 14px in this brand, so no engine or app template
               can set body-adjacent text smaller. Logo compositions, legal footnotes and the like opt out with an explicit
               rem value (e.g. text-[0.75rem]). The arbitrary 10/11px sizes are lifted in main.css. */
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.25rem' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Brand radii per guide: cards 12px, large surfaces 24px,
        // Pill buttons 48px.
        'ygf-sm': '6px',
        'ygf-card': '12px',
        'ygf-lg': '24px',
        'ygf-btn': '48px',
      },
      // Warm orange-tinted shadows — the guide forbids cold gray shadows.
      boxShadow: {
        // Tailwind's default scale, re-tinted warm: a stray `shadow-md` inherits the brand, never a grey shadow.
        DEFAULT: '0 2px 8px rgba(242, 123, 32, 0.08)',
        sm: '0 1px 4px rgba(242, 123, 32, 0.06)',
        md: '0 4px 20px rgba(242, 123, 32, 0.08)',
        lg: '0 8px 30px rgba(242, 123, 32, 0.10)',
        xl: '0 12px 40px rgba(242, 123, 32, 0.12)',
        '2xl': '0 20px 60px rgba(242, 123, 32, 0.16)',
        'ygf-sm': '0 2px 8px rgba(242, 123, 32, 0.06)',
        'ygf-md': '0 4px 20px rgba(242, 123, 32, 0.08)',
        'ygf-lg': '0 8px 40px rgba(242, 123, 32, 0.12)',
        'ygf-glow': '0 0 60px rgba(245, 130, 32, 0.08)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'cart-flash': {
          '0%': { backgroundColor: '#FFEDD5' },
          '100%': { backgroundColor: '#ffffff' },
        },
        'cart-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'number-bounce': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-6px)' },
          '30%': { transform: 'translateX(6px)' },
          '45%': { transform: 'translateX(-4px)' },
          '60%': { transform: 'translateX(4px)' },
          '75%': { transform: 'translateX(-2px)' },
          '90%': { transform: 'translateX(2px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'check-bounce': {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(46, 139, 87, 0)' },
          '50%': { boxShadow: '0 0 8px 2px rgba(46, 139, 87, 0.3)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'cart-flash': 'cart-flash 1.5s ease-out forwards',
        'cart-pulse': 'cart-pulse 0.3s ease-in-out',
        'number-bounce': 'number-bounce 0.2s ease-out',
        shake: 'shake 0.4s ease-out',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'check-bounce': 'check-bounce 0.2s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
}
