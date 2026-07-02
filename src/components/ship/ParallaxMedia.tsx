import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

export interface ParallaxMediaProps {
  /** Image source URL. */
  src: string;
  /** Real, descriptive alt text for the image. */
  alt: string;
  /** Classes for the OUTER clipping box — caller supplies aspect ratio, rounding, and background. */
  className?: string;
  /** Optional extra classes applied to the image itself. */
  imgClassName?: string;
}

/**
 * ParallaxMedia — a tiny reusable wrapper that adds subtle vertical
 * parallax drift to a still image (a guide cover, a portrait) as it
 * scrolls through the viewport.
 *
 * The image is rendered taller than its box (h-[112%]) so the drift
 * never reveals a bare edge. When the user prefers reduced motion the
 * drift is disabled entirely: no transform is applied and the image
 * fills the box exactly (h-full).
 */
export function ParallaxMedia({ src, alt, className, imgClassName }: ParallaxMediaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Hooks must run unconditionally — we always CALL useTransform and
  // only choose whether to USE its value via the reduced-motion flag.
  const yRange = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);

  return (
    <div ref={ref} className={'relative overflow-hidden ' + (className ?? '')}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ y: reduce ? undefined : yRange }}
        className={
          (reduce ? 'h-full' : 'h-[112%]') +
          ' w-full object-cover ' +
          (imgClassName ?? '')
        }
      />
    </div>
  );
}
