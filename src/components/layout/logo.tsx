// Wordmark: a simple compass-like mark (a path through a gate) — no flags,
// no government symbols.
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M9 23V12.5a7 7 0 0 1 14 0V23" fill="none" stroke="var(--logo-fg, #F7F7F4)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 23v-7.5" stroke="var(--logo-fg, #F7F7F4)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="12.5" r="1.6" fill="#8fb0cc" />
    </svg>
  );
}
