/** Five-segment score indicator (1–5). Accessible via role="img" + label. */
export function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="flex items-center gap-2">
      <span className="flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-1.5 w-3.5 rounded-full ${i <= value ? 'bg-accent' : 'bg-mist'}`} />
        ))}
      </span>
      <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-ink">{value}</span>
    </span>
  );
}
