module.exports = {
  content: [
    './src/**/*.{html,ts,scss}',
  ],
  theme: {
    extend: {
      fontFamily: {
        grim: ['"Cinzel"', 'Georgia', 'serif'],
      },
      colors: {
        grim: {
          bg: '#0b0906',
          panel: '#181310',
          panel2: '#221b15',
          border: '#4a3a24',
          gold: '#c9a34d',
          blood: '#7a1f1f',
          parchment: '#e8dfc8',
        },
      },
      boxShadow: {
        grim: 'inset 0 0 0 1px rgba(201,163,77,0.25), 0 4px 16px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
