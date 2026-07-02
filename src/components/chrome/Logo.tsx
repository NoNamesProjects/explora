import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
}

/**
 * Placeholder wordmark — small circular brand mark + "Explora" in upright
 * Cormorant Garamond + small-caps "Journeys" sub-line. Partner replaces with the
 * licensed brand wordmark .svg at /public/brand/wordmark.svg when assets arrive.
 */
export function Logo({ className = '', variant = 'dark' }: LogoProps) {
  const color = variant === 'light' ? 'text-cream' : 'text-accent-gold';
  const subColor = variant === 'light' ? 'text-cream/75' : 'text-accent-gold/75';
  return (
    <Link
      to="/"
      aria-label="Explora Journeys"
      className={`inline-flex items-center gap-2.5 leading-none ${color} ${className}`}
    >
      {/* Generic brand mark — concentric circles with a horizon line through the centre.
          Replace with /public/brand/wordmark.svg when partner provides the asset. */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="0.75" opacity="0.6" />
        <circle cx="14" cy="14" r="8" stroke="currentColor" strokeWidth="0.75" opacity="0.85" />
        <line x1="2" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="0.75" opacity="0.45" />
        <circle cx="14" cy="14" r="1.4" fill="currentColor" />
      </svg>

      <span className="flex flex-col leading-[0.95]">
        <span className="font-serif text-[1.4rem] tracking-tight font-normal">
          Explora
        </span>
        <span className={`font-sans text-[0.52rem] tracking-[0.34em] uppercase mt-1 ${subColor}`}>
          Journeys
        </span>
      </span>
    </Link>
  );
}
