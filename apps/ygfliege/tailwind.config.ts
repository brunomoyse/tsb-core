import animate from 'tailwindcss-animate'

/** Yangguofu Malatang Liège theme. Palette, fonts, radii and warm shadows come
 *  from the official brand guide (malatang GUIDELINES.md). The shadcn tokens,
 *  keyframes and container settings are shared scaffolding (same as the other
 *  brand apps).
 *  @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    safelist: ["dark"],
    prefix: "",

    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1200px",
            },
        },
        extend: {
            // YGF brand tokens. `ygf` = primary orange scale + supporting
            // neutrals; class names stay stable if hex values evolve.
            colors: {
                'ygf': {
                    DEFAULT: '#F58220',
                    'light': '#FDBA74',
                    'dark': '#D96A10',
                    'bg': '#FFF7ED',
                    'black': '#1A1A1A',
                    'cream': '#FDF5EC',
                    'wood': '#C49A6C',
                    'red': '#D42B2B',
                    'white': '#FFFFFF',
                    'success': '#2E8B57',
                    'error': '#D32F2F',
                    // Warm border tint, same value as --border-default.
                    'border': 'rgba(242, 123, 32, 0.12)',
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
                    50: '#FFF7ED',
                    100: '#FFEDD5',
                    200: '#FED7AA',
                    300: '#FDBA74',
                    400: '#FB923C',
                    500: '#F58220',
                    600: '#D96A10',
                    700: '#C2570C',
                    800: '#9A3412',
                    900: '#7C2D12',
                    'bg': '#FFF7ED',
                    'light': '#FDBA74',
                    // Accessibility fills/text, same values as brand.css vars.
                    'on-white': '#C2570C',
                    'on-white-hover': '#9A3412',
                    'text': '#9A3412',
                },
                // `border-subtle` — faintest warm hairline (--border-subtle).
                'subtle': 'rgba(242, 123, 32, 0.08)',
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            fontFamily: {
                // Headings + CJK display (700/900 per guide).
                display: ['"Noto Sans SC"', 'Inter', 'system-ui', 'sans-serif'],
                // Body text.
                body: ['Inter', '"Noto Sans"', 'system-ui', 'sans-serif'],
                // Chinese calligraphy accents (杨国福麻辣烫).
                serifzh: ['"Noto Serif SC"', 'serif'],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                // Brand radii per guide: cards 12px, large surfaces 24px,
                // pill buttons 48px.
                'ygf-sm': '6px',
                'ygf-card': '12px',
                'ygf-lg': '24px',
                'ygf-btn': '48px',
            },
            // Warm orange-tinted shadows — the guide forbids cold gray shadows.
            boxShadow: {
                'ygf-sm': '0 2px 8px rgba(242, 123, 32, 0.06)',
                'ygf-md': '0 4px 20px rgba(242, 123, 32, 0.08)',
                'ygf-lg': '0 8px 40px rgba(242, 123, 32, 0.12)',
                'ygf-glow': '0 0 60px rgba(245, 130, 32, 0.08)',
            },
            keyframes: {
                "accordion-down": {
                    from: {height: '0'},
                    to: {height: "var(--radix-accordion-content-height)"},
                },
                "accordion-up": {
                    from: {height: "var(--radix-accordion-content-height)"},
                    to: {height: '0'},
                },
                "cart-flash": {
                    "0%": {backgroundColor: "#FFEDD5"},
                    "100%": {backgroundColor: "#ffffff"},
                },
                "cart-pulse": {
                    "0%, 100%": {transform: "scale(1)"},
                    "50%": {transform: "scale(1.02)"},
                },
                "fade-in-up": {
                    "0%": { opacity: "0", transform: "translateY(12px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "number-bounce": {
                    "0%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.3)" },
                    "100%": { transform: "scale(1)" },
                },
                "shake": {
                    "0%, 100%": { transform: "translateX(0)" },
                    "15%": { transform: "translateX(-6px)" },
                    "30%": { transform: "translateX(6px)" },
                    "45%": { transform: "translateX(-4px)" },
                    "60%": { transform: "translateX(4px)" },
                    "75%": { transform: "translateX(-2px)" },
                    "90%": { transform: "translateX(2px)" },
                },
                "shimmer": {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "check-bounce": {
                    "0%": { transform: "scale(0)" },
                    "50%": { transform: "scale(1.2)" },
                    "100%": { transform: "scale(1)" },
                },
                "glow-pulse": {
                    "0%, 100%": { boxShadow: "0 0 0 0 rgba(46, 139, 87, 0)" },
                    "50%": { boxShadow: "0 0 8px 2px rgba(46, 139, 87, 0.3)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "cart-flash": "cart-flash 1.5s ease-out forwards",
                "cart-pulse": "cart-pulse 0.3s ease-in-out",
                "fade-in-up": "fade-in-up 0.35s ease-out both",
                "number-bounce": "number-bounce 0.2s ease-out",
                "shake": "shake 0.4s ease-out",
                "shimmer": "shimmer 1.5s ease-in-out infinite",
                "check-bounce": "check-bounce 0.2s ease-out",
                "glow-pulse": "glow-pulse 2s ease-in-out infinite",
            },
        },
    },
    plugins: [animate],
}
