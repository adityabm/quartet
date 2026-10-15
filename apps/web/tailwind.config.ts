import type { Config } from 'tailwindcss';

/**
 * Tokens desain mengikuti AGENTS.md §1.4 (CSS variables `:root` di src/styles/index.css).
 * Nilai hex di bawah adalah mirror dari variabel CSS tersebut — jaga tetap sinkron.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        batik: {
          cream: '#FAF6EF',
          primary: '#C53030',
          accent: '#1F4E5F',
          text: '#1A1A1A',
          muted: '#6B6B6B',
          success: '#2F855A',
          danger: '#C53030',
        },
      },
      fontFamily: {
        display: ['Caveat', 'Plus Jakarta Sans', 'cursive'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;