// Deterministic, abstract "topographic" artwork per office: consistent,
// quiet, and never pretends to be a photo of the actual building.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const PALETTES = [
  ['#101b2a', '#1d2d43', '#54799b'],
  ['#18212b', '#24384c', '#7aa0bf'],
  ['#132131', '#1f3a45', '#5f9a8f'],
  ['#161d2b', '#2c3350', '#8c8fbf'],
  ['#1b1f27', '#3a3b45', '#b49a7a'],
];

export function OfficeArt({ seed, label, sublabel, className = '' }: { seed: string; label?: string; sublabel?: string; className?: string }) {
  const h = hash(seed);
  const [bg, mid, line] = PALETTES[h % PALETTES.length];
  const cx = 120 + (h % 160);
  const cy = 60 + ((h >> 8) % 80);
  const rings = Array.from({ length: 11 }, (_, i) => {
    const r = 18 + i * 17;
    const wobble = ((h >> (i % 24)) % 9) - 4;
    return `M ${cx - r} ${cy} C ${cx - r} ${cy - r * 0.8 + wobble}, ${cx + r} ${cy - r * 0.9 - wobble}, ${cx + r} ${cy} S ${cx - r * 0.6} ${cy + r * 0.95 + wobble}, ${cx - r} ${cy}`;
  });
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${bg}, ${mid})` }}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]" aria-hidden="true" focusable="false">
        <g fill="none" stroke={line} strokeWidth="1">
          {rings.map((d, i) => (
            <path key={i} d={d} opacity={0.55 - i * 0.04} />
          ))}
        </g>
        <circle cx={cx} cy={cy} r="3" fill="#f7f7f4" />
        <circle cx={cx} cy={cy} r="9" fill="#f7f7f4" opacity="0.15" />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-white">
          {label && <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/80">{label}</span>}
          {sublabel && <span className="text-xs text-white/60" lang="ko">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
