import type { Config } from 'tailwindcss';
const token = (name: string) => `rgb(from var(--color-${name}) r g b / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: token('ink'), secondary: token('ink-2'), muted: token('muted'),
        surface: token('paper-2'), 'surface-deep': token('paper'), elevated: token('paper-3'),
        line: token('rule'), dark: token('accent-ink'),
        accent: token('accent'), 'accent-soft': token('accent-deep'),
        open: token('accent-2'), 'open-soft': token('open-soft'),
        brand: { dark: token('paper'), card: token('paper-2'), border: token('rule'), accent: token('accent'), cyan: token('accent'), mint: token('accent'), amber: token('accent-2'), rose: token('accent-2') },
      },
      fontFamily: { sans: ['var(--font-body)'], mono: ['var(--font-body)'] },
      boxShadow: { 'glow-cyan': 'none', 'glow-mint': 'none', 'card-dark': 'var(--shadow-card)' },
    },
  },
  plugins: [],
} satisfies Config;
