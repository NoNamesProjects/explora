import type { Config } from 'tailwindcss';

/**
 * Brand-accurate palette + display/sans pairing.
 * Hex codes sampled from the live explorajourneys.com stylesheet on
 * 2026-05-24. Partner can swap fonts to licensed brand serif/sans by
 * dropping .woff2 files into public/fonts/ and updating the stacks below.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        md: '2rem',
        lg: '3rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        // Cream surfaces — confirmed from live CSS.
        cream: {
          DEFAULT: '#F4F2EF',
          soft: '#FAF8F4',  // alias of 50 — the established `bg-cream-soft` surface token used site-wide
          50:  '#FAF8F4',
          100: '#F4F2EF',
          200: '#EDE9E4',
          300: '#CBC4BC',
          400: '#B5ACA0',
        },
        // Ink — confirmed navy (#0C2340) + dark blue-gray (#243953).
        ink: {
          DEFAULT: '#0C2340',
          soft: '#243953',  // hover tint for ink-filled controls (= --ink-soft)
          900: '#0C2340',
          800: '#162E48',
          700: '#243953',
          600: '#4F6573',
          500: '#73859F',  // muted blue-gray (live: --color-muted-blue)
          400: '#9CA9B5',
        },
        // Accent — muted olive-gold (#96845E) + warm tan (#866D4B) + mist blue (#73859F).
        accent: {
          ocean:    '#243953',
          mist:     '#73859F',
          patina:   '#3D6963',
          gold:     '#96845E',
          goldSoft: '#B5A684',
          tan:      '#866D4B',
        },
      },
      fontFamily: {
        // Free-tier substitutes for the brand's licensed display + sans.
        // Cormorant Garamond = calm, classical display serif (quiet-luxury /
        // One&Only feel; upright, gentle italic for accents only) — GT Sectra alt.
        // Inter = humanist grotesque (GT America / Suisse Int'l alt).
        serif: ['"Cormorant Garamond"', '"EB Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        // Garamond has a smaller x-height and wants relaxed (~0) tracking,
        // unlike Bodoni's tight negative tracking — sizes nudged up a touch.
        eyebrow: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.14em' }],
        'hero-2xl': ['clamp(3.5rem, 7.5vw, 7.5rem)', { lineHeight: '1.04', letterSpacing: '0' }],
        'hero-xl': ['clamp(2.75rem, 6vw, 6rem)', { lineHeight: '1.06', letterSpacing: '0' }],
        display: ['clamp(2.25rem, 3.8vw, 3.75rem)', { lineHeight: '1.12', letterSpacing: '0' }],
        'display-sm': ['clamp(1.625rem, 2.6vw, 2.4rem)', { lineHeight: '1.18', letterSpacing: '0.005em' }],
      },
      letterSpacing: {
        ui: '0.08em',
        eyebrow: '0.14em',
        nav: '0.18em',
      },
      maxWidth: {
        prose: '720px',
        page: '1280px',
        wide: '1440px',
        editorial: '880px',
      },
      spacing: {
        'section-y': 'clamp(4rem, 9vw, 9rem)',
        'section-y-sm': 'clamp(2.5rem, 5vw, 5rem)',
      },
      borderRadius: {
        button: '1px',
        card: '2px',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slowZoom: {
          '0%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        cinematicIn: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.94)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        softBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(4px)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 800ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slow-zoom': 'slowZoom 12s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'cinematic-in': 'cinematicIn 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'soft-bounce': 'softBounce 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backgroundImage: {
        // Brand-accurate ocean horizon — ink-soft → ink → mist → tan.
        'ocean-horizon':
          'linear-gradient(180deg, #0C2340 0%, #162E48 32%, #243953 60%, #73859F 80%, #CBC4BC 100%)',
        'hero-vignette':
          'linear-gradient(180deg, rgba(12,35,64,0.35) 0%, rgba(12,35,64,0.05) 35%, rgba(12,35,64,0.0) 60%, rgba(12,35,64,0.7) 100%)',
        grain:
          'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"160\\" height=\\"160\\"><filter id=\\"n\\"><feTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.9\\" numOctaves=\\"2\\" stitchTiles=\\"stitch\\"/><feColorMatrix values=\\"0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0\\"/></filter><rect width=\\"100%\\" height=\\"100%\\" filter=\\"url(%23n)\\" opacity=\\"0.32\\"/></svg>")',
      },
    },
  },
  plugins: [],
};

export default config;
