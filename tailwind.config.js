/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF6F0',
        panel: '#EFE7DC',
        charcoal: '#1F1B18',
        terracotta: '#C4452B',
        'terracotta-soft': '#E2583E',
        blush: '#F6C9C0',
        sage: '#A8BFA3',
        sand: '#E8D5B5',
        y2k: '#D9CCFF',
        muted: '#5E554E',
        line: '#E6DED3',
        'line-strong': '#D9CFC3',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      boxShadow: {
        strip: '0 18px 40px rgba(31,27,24,.15)',
      },
      borderRadius: {
        card: '24px',
        panel: '28px',
      },
    },
  },
  plugins: [],
}
