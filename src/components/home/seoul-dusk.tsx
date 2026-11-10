// Original, art-directed illustration of a generic Seoul-style skyline at
// dusk (mountain ridges, a hilltop tower, river and bridge). It depicts no
// specific immigration office. Rendered server-side as SVG: no image
// download, crisp at any size, and each layer can move independently for a
// gentle parallax. Replace with licensed photography via src/lib/media.ts.

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Building = { x: number; w: number; h: number; windows: { x: number; y: number; o: number }[] };

function buildings(seed: number, count: number, baseline: number, minH: number, maxH: number, x0 = -20, x1 = 1640, litRatio = 0.22): Building[] {
  const r = rng(seed);
  const out: Building[] = [];
  let x = x0;
  while (x < x1 && out.length < count) {
    const w = 22 + Math.floor(r() * 46);
    const h = minH + Math.floor(Math.pow(r(), 1.6) * (maxH - minH));
    const windows: Building['windows'] = [];
    for (let wy = baseline - h + 8; wy < baseline - 6; wy += 9) {
      for (let wx = x + 4; wx < x + w - 5; wx += 7) {
        if (r() < litRatio) windows.push({ x: wx, y: wy, o: 0.35 + r() * 0.6 });
      }
    }
    out.push({ x, w, h, windows });
    x += w + Math.floor(r() * 6);
  }
  return out;
}

const FAR = buildings(7, 80, 742, 30, 150, -20, 1640, 0.12);
const NEAR = buildings(21, 60, 752, 50, 230, -20, 1640, 0.2);

export function SeoulDusk({ className = '' }: { className?: string }) {
  const lights = NEAR.flatMap((b) => b.windows.filter((_, i) => i % 9 === 0).map((w) => ({ x: w.x, o: w.o })));
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1424" />
          <stop offset="0.32" stopColor="#192c47" />
          <stop offset="0.5" stopColor="#36496a" />
          <stop offset="0.6" stopColor="#66698a" />
          <stop offset="0.68" stopColor="#a8868a" />
          <stop offset="0.75" stopColor="#d9a983" />
          <stop offset="0.8" stopColor="#e8bf91" />
        </linearGradient>
        <radialGradient id="glow" cx="0.72" cy="0.7" r="0.5">
          <stop offset="0" stopColor="#f7cf9f" stopOpacity="0.7" />
          <stop offset="0.45" stopColor="#d9a07a" stopOpacity="0.16" />
          <stop offset="1" stopColor="#d9a07a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3346" />
          <stop offset="0.25" stopColor="#141e2d" />
          <stop offset="1" stopColor="#070d16" />
        </linearGradient>
        <linearGradient id="tower" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1c2a3f" />
          <stop offset="0.55" stopColor="#0f1826" />
          <stop offset="1" stopColor="#0b1320" />
        </linearGradient>
        <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f8a92" stopOpacity="0" />
          <stop offset="1" stopColor="#8f8a92" stopOpacity="0.28" />
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.55 0" />
        </filter>
      </defs>

      <rect width="1600" height="1000" fill="url(#sky)" />
      <rect width="1600" height="1000" fill="url(#glow)" />
      <g fill="#fff" opacity="0.5">
        {[[120, 90, 0.9], [340, 160, 0.6], [610, 70, 0.8], [880, 130, 0.5], [1180, 60, 0.7], [1420, 150, 0.6], [1520, 80, 0.5], [760, 210, 0.4], [250, 260, 0.35]].map(([x, y, o], i) => (
          <circle key={i} cx={x} cy={y} r={1.1} opacity={o} />
        ))}
      </g>

      <g data-parallax="0.04">
        <path d="M0 640 L60 610 L120 622 L190 560 L240 590 L300 540 L350 575 L420 520 L470 560 L540 548 L600 590 L700 600 L780 570 L860 600 L960 560 L1040 520 L1090 548 L1160 500 L1220 540 L1300 520 L1380 560 L1460 545 L1540 580 L1600 570 L1600 760 L0 760 Z" fill="#55607a" opacity="0.8" />
        <rect y="560" width="1600" height="200" fill="url(#mist)" />
      </g>
      <g data-parallax="0.08">
        <path d="M0 680 L80 650 L150 668 L230 630 L300 655 L380 640 L470 668 L560 650 L640 676 L720 662 L820 684 L900 660 L980 672 L1080 645 L1180 664 L1260 650 L1340 670 L1440 655 L1520 672 L1600 660 L1600 780 L0 780 Z" fill="#344259" />
        {/* hilltop tower */}
        <path d="M380 712 C430 650 520 618 560 618 C610 618 680 660 720 712 Z" fill="#1d2a3c" />
        <rect x="555.5" y="520" width="9" height="102" fill="#1b2738" />
        <rect x="547" y="548" width="26" height="14" rx="4" fill="#223148" />
        <rect x="551" y="562" width="18" height="6" rx="2" fill="#1b2738" />
        <line x1="560" y1="520" x2="560" y2="472" stroke="#1b2738" strokeWidth="3" />
        <circle cx="560" cy="471" r="2.4" fill="#ff8a7a" />
        <circle cx="560" cy="471" r="7" fill="#ff8a7a" opacity="0.18" />
        <g fill="#f6d39d" opacity="0.7">
          <rect x="550" y="553" width="3" height="2" />
          <rect x="556" y="553" width="3" height="2" />
          <rect x="562" y="553" width="3" height="2" />
          <rect x="567" y="553" width="3" height="2" />
        </g>
      </g>

      <g data-parallax="0.12">
        {FAR.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={742 - b.h} width={b.w} height={b.h} fill="#18233a" />
            {b.windows.map((w, j) => (
              <rect key={j} x={w.x} y={w.y} width={2.6} height={3} fill="#f2cf98" opacity={w.o * 0.65} />
            ))}
          </g>
        ))}
      </g>

      <g data-parallax="0.18">
        {/* supertall tower (generic) */}
        <path d="M1228 752 L1240 452 C1244 410 1250 384 1256 370 C1262 384 1268 410 1272 452 L1284 752 Z" fill="url(#tower)" />
        <path d="M1256 370 L1256 752" stroke="#3b4d68" strokeWidth="1" opacity="0.6" />
        <circle cx="1256" cy="366" r="2" fill="#ff8a7a" />
        <g fill="#f2cf98" opacity="0.55">
          {Array.from({ length: 34 }, (_, i) => (
            <rect key={i} x={1246 + (i % 3) * 7} y={470 + Math.floor(i / 3) * 24} width={3} height={2.2} opacity={((i * 37) % 10) / 12 + 0.15} />
          ))}
        </g>
        {NEAR.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={752 - b.h} width={b.w} height={b.h} fill="#0e1725" />
            <rect x={b.x} y={752 - b.h} width={1} height={b.h} fill="#2b3a52" opacity="0.6" />
            {b.windows.map((w, j) => (
              <rect key={j} x={w.x} y={w.y} width={3} height={3.4} fill="#f6d6a2" opacity={w.o} />
            ))}
          </g>
        ))}
      </g>

      {/* river, bridge and reflections */}
      <g data-parallax="0.22">
        <rect y="752" width="1600" height="248" fill="url(#river)" />
        <g filter="url(#soft)" opacity="0.55">
          {lights.map((l, i) => (
            <rect key={i} x={l.x} y={770 + (i % 5) * 9} width={3} height={30 + (i % 4) * 22} fill="#f2c88f" opacity={l.o * 0.5} />
          ))}
          <rect x="1244" y="770" width="24" height="140" fill="#6c7a94" opacity="0.25" />
        </g>
        <g stroke="#c9d3e0" strokeOpacity="0.07">
          {Array.from({ length: 14 }, (_, i) => (
            <line key={i} x1={(i * 173) % 1600} x2={((i * 173) % 1600) + 120 + (i % 3) * 60} y1={800 + i * 13} y2={800 + i * 13} />
          ))}
        </g>
        <path d="M0 792 L1600 778" stroke="#0a111c" strokeWidth="9" />
        <g fill="none" stroke="#0a111c" strokeWidth="5">
          {Array.from({ length: 9 }, (_, i) => {
            const x = 40 + i * 190;
            const y = 792 - (i * 190 * 14) / 1600;
            return <path key={i} d={`M${x} ${y} Q ${x + 95} ${y - 56} ${x + 190} ${y - 1.7}`} />;
          })}
        </g>
        <g fill="#f6d39d">
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={i * 41 + 10} cy={788 - (i * 41 * 14) / 1600} r={1.3} opacity={0.75} />
          ))}
        </g>
      </g>

      <rect width="1600" height="1000" filter="url(#grain)" opacity="0.09" style={{ mixBlendMode: 'overlay' }} />
    </svg>
  );
}
