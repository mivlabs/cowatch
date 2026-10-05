import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NightSkyProps {
  /** Same seed, same sky: the painting doesn't change between visits. */
  seed?: number;
  stars?: number;
  /** Share of the height (from the top) where stars may appear. */
  starZone?: number;
  /** Shorter, denser strokes for small surfaces like posters. */
  dense?: boolean;
  /**
   * Keeps the big glowing stars out from behind text: they only appear to the
   * right of `x` and below `y` (shares of the width and height). Narrow screens,
   * where text runs the full width, get no glowing stars at all.
   */
  glowFrom?: { x: number; y: number };
  className?: string;
}

const BLUES = ['#0d1638', '#14215a', '#1f2f78', '#2b3f94', '#0a1230', '#3a50a8'];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/**
 * Paints a Van Gogh-style night sky: short brush strokes that follow a smooth
 * flow field, then a scatter of cream stars, a few of them gold with halos.
 * Stands in for a hand-painted texture until there is one.
 */
function paintSky(
  canvas: HTMLCanvasElement,
  seed: number,
  stars: number,
  starZone: number,
  dense: boolean,
  glowFrom?: { x: number; y: number },
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  if (!c) return;
  c.scale(dpr, dpr);

  const r = rng(seed);
  c.fillStyle = '#070a1c';
  c.fillRect(0, 0, w, h);

  const angle = (x: number, y: number) =>
    Math.sin(x * 0.006 + seed) * 1.6 + Math.cos(y * 0.009 - seed * 0.5) * 1.2 + Math.sin((x + y) * 0.002) * 0.8;
  const strokes = Math.round((w * h) / (dense ? 55 : 90));
  c.lineCap = 'round';
  for (let i = 0; i < strokes; i++) {
    let x = r() * w;
    let y = r() * h;
    c.strokeStyle = BLUES[Math.floor(r() * BLUES.length)];
    c.globalAlpha = 0.25 + r() * 0.5;
    c.lineWidth = 1 + r() * 3.5;
    c.beginPath();
    c.moveTo(x, y);
    const len = 6 + r() * 14;
    for (let k = 0; k < len; k++) {
      const a = angle(x, y);
      x += Math.cos(a) * 2.2;
      y += Math.sin(a) * 2.2;
      c.lineTo(x, y);
    }
    c.stroke();
  }

  c.globalAlpha = 1;
  for (let i = 0; i < stars; i++) {
    const x = r() * w;
    const y = r() * h * starZone;
    const glowAllowed = !glowFrom || (w >= 1024 && x >= w * glowFrom.x && y >= h * glowFrom.y);
    const big = r() < 0.18 && glowAllowed;
    const rad = big ? 2.5 + r() * 3 : 0.8 + r() * 1.4;
    if (big) {
      const glow = c.createRadialGradient(x, y, 0, x, y, rad * 9);
      glow.addColorStop(0, 'rgba(242,193,78,.55)');
      glow.addColorStop(1, 'rgba(242,193,78,0)');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(x, y, rad * 9, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(239,228,200,.35)';
      c.lineWidth = 1;
      for (let k = 1; k <= 3; k++) {
        c.beginPath();
        c.arc(x, y, rad * (2 + k * 1.6), r() * 6, r() * 6 + 4);
        c.stroke();
      }
    }
    c.fillStyle = big ? '#f6dc8f' : '#efe4c8';
    c.beginPath();
    c.arc(x, y, rad, 0, Math.PI * 2);
    c.fill();
  }
}

/** Painted sky with film grain on top. Fills its positioned parent. */
export function NightSky({ seed = 5, stars = 36, starZone = 0.8, dense = false, glowFrom, className }: NightSkyProps) {
  const glowX = glowFrom?.x;
  const glowY = glowFrom?.y;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const glow = glowX === undefined || glowY === undefined ? undefined : { x: glowX, y: glowY };
    let frame = 0;
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => paintSky(canvas, seed, stars, starZone, dense, glow));
    };
    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [seed, stars, starZone, dense, glowX, glowY]);

  return (
    <div className={cn('pointer-events-none absolute inset-0 bg-ink', className)} aria-hidden>
      <canvas ref={canvasRef} className="block size-full" />
      <div className="cw-grain absolute inset-0" />
    </div>
  );
}
