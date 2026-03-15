/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', '"Cascadia Code"', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#faf8f5',
          100: '#f0ebe3',
          200: '#ddd5c8',
          300: '#c4b8a7',
          400: '#a89880',
          500: '#8c7d68',
          600: '#726453',
          700: '#5a4f42',
          800: '#3d3530',
          900: '#221e1a',
        },
        accent: {
          50:  '#fdf6ee',
          100: '#fae8d0',
          200: '#f5ce9c',
          300: '#eeab5a',
          400: '#e88c2a',
          500: '#d4711a',
          600: '#b05a14',
          700: '#8b4412',
          800: '#6e3510',
          900: '#4a2309',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#3d3530',
            a: { color: '#d4711a' },
            'h1,h2,h3': { fontFamily: 'Georgia, serif' },
          },
        },
      },
    },
  },
  plugins: [],
}
