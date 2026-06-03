/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gm: {
          bg:        '#F5F4F2',
          surface:   '#FFFFFF',
          dark:      '#0B0B0D',
          dark2:     '#141418',
          dark3:     '#1C1C22',
          red:       '#E11428',
          'red-lt':  '#FF2E43',
          'red-dk':  '#9E0E1B',
          'red-bg':  '#FCEAEC',
          text:      '#16161A',
          muted:     '#6B6B73',
          border:    '#E4E1DC',
          success:   '#2D7D52',
          danger:    '#C0392B',
          info:      '#2C5F8A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover':'0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        modal:      '0 20px 60px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.10)',
      },
      borderRadius: {
        xl:  '12px',
        '2xl':'16px',
        '3xl':'24px',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        fadeIn:  { from:{ opacity:'0' }, to:{ opacity:'1' } },
        slideUp: {
          from: { opacity:'0', transform:'translateY(16px)' },
          to:   { opacity:'1', transform:'translateY(0)' },
        },
      },
      animation: {
        shimmer:   'shimmer 1.6s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up':'slideUp 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
