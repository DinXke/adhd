import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--bg-primary)',
        card: 'var(--bg-card)',
        'card-surface': 'var(--bg-surface)',
        sidebar: 'var(--bg-sidebar)',
        accent: {
          DEFAULT: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          success: 'var(--accent-success)',
          token: 'var(--accent-token)',
          warning: 'var(--accent-warning)',
          danger: 'var(--accent-danger)',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          muted: 'var(--text-muted)',
        },
        border: 'var(--border-color)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        'body': 'var(--font-size-body)',
        'heading': 'var(--font-size-heading)',
        'big': 'var(--font-size-big)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        pill: '999px',
        soft: 'var(--radius-soft)',
      },
      minHeight: {
        tap: '48px',
      },
      minWidth: {
        tap: '48px',
      },
    },
  },
  plugins: [],
} satisfies Config
