'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/** Gentle multi-layer parallax for [data-parallax] children. Disabled when the
 *  user prefers reduced motion. Uses transforms only (no layout thrash). */
export function HeroMotion({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layers = [...root.querySelectorAll<SVGGElement | HTMLElement>('[data-parallax]')];
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.min(window.scrollY, window.innerHeight);
      for (const l of layers) {
        const speed = Number(l.getAttribute('data-parallax')) || 0;
        l.style.transform = `translate3d(0, ${y * speed * -1.6}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

/** Adds .is-visible to [data-reveal] elements as they enter the viewport. */
export function RevealObserver() {
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-reveal]')];
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
  return null;
}

/** Counts up to a real value once visible (skipped for reduced motion). */
export function CountUp({ value, format }: { value: number; format?: 'plain' }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || value === 0) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1100);
        el.textContent = String(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  void format;
  return <span ref={ref}>{value}</span>;
}
