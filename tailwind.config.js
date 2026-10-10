/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['var(--font-pixel)', 'cursive'],
        hud: ['var(--font-hud)', 'monospace'],
      },
      colors: {
        retro: {
          purple: '#2e2157',
          gold: '#ffd700',
          green: '#39ff14',
          black: '#000000',
          // Warm RPG palette
          oak: '#8B6914',
          walnut: '#5C4033',
          cream: '#F5F0E1',
          felt: '#1B5E3B',
          'felt-dark': '#0D3D24',
          burgundy: '#722F37',
          brass: '#B5A642',
          slate: '#6B7B8D',
          tan: '#D2B48C',
          sand: '#C4A76C',
          mahogany: '#4E2728',
        },
        rpg: {
          floor: '#C4A76C',
          'floor-dark': '#A8904E',
          wall: '#64748B',
          'wall-top': '#8B9BB4',
          'wall-wood': '#8B6914',
          'wall-wood-dark': '#5C4033',
          room: '#1B5E3B',
          'room-border': '#0D3D24',
          door: '#8B6914',
          'door-open': '#FFD700',
        },
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px #000000',
        'retro': '0 3px 0 rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)',
        'retro-lg': '0 4px 0 rgba(0,0,0,0.4), 0 6px 12px rgba(0,0,0,0.3)',
        'furniture': '0 3px 0 rgba(0,0,0,0.4), 0 5px 10px rgba(0,0,0,0.2)',
        'warm-glow': '0 0 15px rgba(255,215,0,0.2), 0 0 30px rgba(255,215,0,0.1)',
        'tag': '0 1px 3px rgba(0,0,0,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'avatar-bob': 'avatarBob 2.5s ease-in-out infinite',
        'avatar-walk': 'avatarWalk 0.3s ease-in-out',
        'float': 'float 2s ease-in-out infinite',
        'door-glow': 'doorGlow 2s ease-in-out infinite',
        'badge-pop': 'badgePop 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        avatarBob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        avatarWalk: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-3px) scale(1.05)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        doorGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(255,215,0,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.2)' },
        },
        badgePop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '70%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}