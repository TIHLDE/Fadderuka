import type { Config } from 'tailwindcss';

import tailwindcss_animate from "tailwindcss-animate";

const config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    extend: {
      /* Tokenene i globals.css holder hele fargeverdien (oklch/hex), ikke bare
         HSL-kanalene, så de leses direkte som `var(--x)`. Tailwind lager selv
         color-mix() for /opacity-modifiers (bg-primary/90, ring-foreground/10). */
      colors: {
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        logo: 'var(--logo)',
        link: 'var(--link)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        /* Tillegg utover Photon — se kommentar i globals.css. */
        success: 'var(--success)',
        warning: 'var(--warning)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
          border: 'var(--card-border)',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) * 1.8)',
        '3xl': 'calc(var(--radius) * 2.2)',
        '4xl': 'calc(var(--radius) * 2.6)',
      },
      fontFamily: {
        /* Photon aliaser font-heading til font-sans — samme snitt, egen token
           så de kan skilles senere uten å røre kall-stedene. */
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        heading: ['var(--font-sans)', 'Inter', 'sans-serif'],
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
        'glow-breathe': {
          '0%, 100%': { opacity: '0.45', transform: 'translateX(-50%) scale(1)' },
          '50%': { opacity: '0.75', transform: 'translateX(-50%) scale(1.06)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s var(--ease-out)',
        'accordion-up': 'accordion-up 0.2s var(--ease-out)',
        'glow-breathe': 'glow-breathe 7s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcss_animate],
} satisfies Config;

export default config;
