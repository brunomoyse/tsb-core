import animate from "tailwindcss-animate"

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
            backgroundColor: {
                'tsb': {
                    'one': {
                        DEFAULT: '#F6F5F2',
                    },
                    'two': {
                        DEFAULT: '#F0EBE3'
                    },
                    'three': {
                        DEFAULT: '#F3D0D7'
                    },
                    'four': {
                        DEFAULT: '#FFEFEF'
                    },
                },
            },
            colors: {
                'tsb': {
                    'one': {
                        DEFAULT: '#F6F5F2',
                    },
                    'two': {
                        DEFAULT: '#F0EBE3'
                    },
                    'three': {
                        DEFAULT: '#F3D0D7'
                    },
                    'four': {
                        DEFAULT: '#FFEFEF'
                    },
                },
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
                channel: ['Channel', 'sans-serif'],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
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
                    "0%, 100%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
                    "50%": { boxShadow: "0 0 8px 2px rgba(34, 197, 94, 0.3)" },
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
