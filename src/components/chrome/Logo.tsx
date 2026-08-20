import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
}

/**
 * Brand mark — the licensed "A" monogram (/public/brand/mark.png, cut from the
 * partner's logo art) + "Aesthisis" (the agency) in upright Cormorant Garamond +
 * small-caps "Explore Cruise" sub-line. The cruise product itself stays branded
 * "Explora Journeys" everywhere it's discussed in page copy — only the agency's
 * own identity (header/footer lockup, admin, copyright) uses Aesthisis.
 */
export function Logo({ className = '', variant = 'dark' }: LogoProps) {
  const color = variant === 'light' ? 'text-cream' : 'text-accent-goldText';
  const subColor = variant === 'light' ? 'text-cream/75' : 'text-accent-goldText/75';
  return (
    <Link
      to="/"
      aria-label="Aesthisis"
      className={`inline-flex items-center gap-2.5 leading-none ${color} ${className}`}
    >
      <img
        src="/brand/mark.png"
        alt=""
        aria-hidden
        className="h-8 w-8 shrink-0 object-contain"
      />

      <span className="flex flex-col leading-[0.95]">
        <span className="font-serif text-[1.4rem] tracking-tight font-normal">
          Aesthisis
        </span>
        <span className={`font-sans text-[0.52rem] tracking-[0.34em] uppercase mt-1 ${subColor}`}>
          Explore Cruise
        </span>
      </span>
    </Link>
  );
}
