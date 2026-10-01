import animate from 'tailwindcss-animate'
import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    safelist: ["dark"],
    prefix: "",

    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            // Brand theme tokens (tsb-* palette + `channel` display font). A
            // second brand app redefines these hex values / display font; the
            // tsb-* class names stay stable across brands.
            fontFamily: {
                sans: ['Montserrat', 'Arial', 'Helvetica', 'sans-serif'],
                channel: ['Channel', 'sans-serif'],
            },
            colors: {
                'tsb': {
                    'one': { DEFAULT: '#F6F5F2' },
                    'two': { DEFAULT: '#F0EBE3' },
                    'three': { DEFAULT: '#F2A9BD' },
                    'four': { DEFAULT: '#FFEFEF' },
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring) / <alpha-value>)",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                // Theme contract shared with every brand app (the engine layer's
                // components only use these names, never a literal hue):
                //   primary-50..900  brand accent scale (red here)
                //   neutral-50..900  text/surface/border neutrals (gray here)
                //   tsb-one..four    page, container, decorative, selected
                // red-* stays reserved for errors and destructive actions.
                primary: {
                    ...colors.red,
                    DEFAULT: "hsl(var(--primary) / <alpha-value>)",
                    foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
                    hover: "hsl(var(--primary-hover) / <alpha-value>)",
                    soft: "hsl(var(--primary-soft) / <alpha-value>)",
                },
                neutral: colors.gray,
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
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                // The two radii for comparable surfaces: controls and cards
                // (xl), containers and modals (2xl). Overridable per brand.
                xl: "var(--radius-control, 0.75rem)",
                "2xl": "var(--radius-container, 1rem)",
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
                    "0%": {backgroundColor: "#fef3c7"},
                    "100%": {backgroundColor: "#ffffff"},
                },
                "cart-pulse": {
                    "0%, 100%": {transform: "scale(1)"},
                    "50%": {transform: "scale(1.02)"},
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
                    "0%, 100%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
                    "50%": { boxShadow: "0 0 8px 2px rgba(34, 197, 94, 0.3)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "cart-flash": "cart-flash 1.5s ease-out forwards",
                "cart-pulse": "cart-pulse 0.3s ease-in-out",
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
