import { useRef, useState } from 'react';

interface ImageMagnifierProps {
  src: string;
  alt: string;
  /** Classes for the WRAPPER (controls width / max-width / margin / cursor). The
   *  <img> always fills the wrapper (w-full) so the loupe coordinates line up. */
  className?: string;
  /** Magnification factor inside the loupe. */
  zoom?: number;
  /** Diameter of the circular loupe, in px. */
  lensSize?: number;
}

/**
 * ImageMagnifier — a cursor-following circular "loupe" that magnifies the area
 * under the pointer, so a dense image (a deck plan with tiny cabin numbers) can
 * be read in place without leaving the page. On move, the lens paints the SAME
 * image as a background, scaled by `zoom` and offset so the point under the
 * cursor sits at the lens centre; the offset is clamped so the lens never shows
 * past the image edges. Fine-pointer only (no touch hover); decorative overlay
 * (pointer-events-none, aria-hidden) — the underlying <img> keeps its alt.
 *
 * The width constraint lives on the WRAPPER and the <img> is `w-full`, so the
 * image origin equals the wrapper origin and the lens (positioned relative to
 * the wrapper) tracks the cursor exactly.
 */
export function ImageMagnifier({ src, alt, className, zoom = 2.5, lensSize = 200 }: ImageMagnifierProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [lens, setLens] = useState({ show: false, x: 0, y: 0, bgX: 0, bgY: 0, bw: 0, bh: 0 });

  const hide = () => setLens((l) => (l.show ? { ...l, show: false } : l));

  const move = (e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img) return;
    // Loupe is a fine-pointer affordance; skip touch/coarse pointers.
    if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) return;

    const r = img.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return hide();

    const bw = r.width * zoom;
    const bh = r.height * zoom;
    // Centre the zoomed point under the cursor, clamped to the image bounds.
    const bgX = Math.max(Math.min(lensSize / 2 - x * zoom, 0), lensSize - bw);
    const bgY = Math.max(Math.min(lensSize / 2 - y * zoom, 0), lensSize - bh);
    setLens({ show: true, x, y, bgX, bgY, bw, bh });
  };

  return (
    <div className={`relative ${className ?? ''}`} onMouseMove={move} onMouseLeave={hide}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        loading="lazy"
        className="block h-auto w-full select-none"
      />
      {lens.show && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 rounded-full border-2 border-cream shadow-2xl ring-1 ring-ink/25"
          style={{
            width: lensSize,
            height: lensSize,
            left: lens.x - lensSize / 2,
            top: lens.y - lensSize / 2,
            backgroundImage: `url("${src}")`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${lens.bw}px ${lens.bh}px`,
            backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
          }}
        />
      )}
    </div>
  );
}
