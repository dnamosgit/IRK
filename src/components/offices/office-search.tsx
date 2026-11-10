'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { MapPin, SearchIcon } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';
import { fmt } from '@/lib/i18n/format';

type Suggestion = { slug: string; name: string; secondary: string; city: string };

/**
 * WAI-ARIA combobox with listbox popup. Matches office names in every
 * language (incl. Korean), slugs and city / region names.
 */
export function OfficeSearch({ variant = 'hero', defaultValue = '', autoFocus = false, onSelect }: {
  variant?: 'hero' | 'inline'; defaultValue?: string; autoFocus?: boolean; onSelect?: (slug: string, name: string) => void;
}) {
  const { t, locale, href } = useI18n();
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true); // never flash "no results" while a request is pending
    const timer = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?locale=${locale}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          const json = (await res.json()) as { results: Suggestion[] };
          setItems(json.results);
          setActive(-1);
        }
        setLoading(false);
      } catch {
        /* aborted (a newer request is in flight) or offline */
      }
    }, 140);
    return () => clearTimeout(timer);
  }, [query, locale]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (s: Suggestion) => {
    setOpen(false);
    if (onSelect) {
      setQuery(s.name);
      onSelect(s.slug, s.name);
    } else {
      router.push(href(`/offices/${s.slug}`));
    }
  };

  const submitAll = () => {
    setOpen(false);
    if (!onSelect) router.push(`${href('/offices')}?q=${encodeURIComponent(query.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && items[active]) choose(items[active]);
      else if (items.length === 1 && onSelect) choose(items[0]);
      else submitAll();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  const showList = open && query.trim().length > 0;
  const hero = variant === 'hero';

  return (
    <div ref={wrapper} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submitAll();
        }}
        className={cx(
          'flex items-center gap-2 rounded-[var(--radius-lg)] bg-white transition-shadow',
          hero ? 'p-2 pl-5 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.55)] ring-1 ring-white/20 focus-within:ring-4 focus-within:ring-white/25' : 'border border-line-strong p-1.5 pl-4 focus-within:ring-2 focus-within:ring-accent/40',
        )}
      >
        <SearchIcon size={hero ? 20 : 18} className="shrink-0 text-muted-text" />
        <label htmlFor={`${id}-input`} className="sr-only">{t.search.label}</label>
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          value={query}
          placeholder={t.search.placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cx('min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted focus:outline-none', hero ? 'h-12 text-[1.02rem]' : 'h-10 text-[0.95rem]')}
        />
        {!onSelect && (
          <button type="submit" className={cx('shrink-0 rounded-[var(--radius-md)] bg-ink font-medium text-white transition-colors hover:bg-charcoal', hero ? 'h-12 px-6' : 'h-10 px-4 text-sm')}>
            {t.common.search}
          </button>
        )}
      </form>
      <p id={`${id}-hint`} className="sr-only">{t.search.hint}</p>

      {showList && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white text-left shadow-[var(--shadow-lift)]">
          <ul id={listId} role="listbox" aria-label={t.search.suggestions} className="max-h-80 overflow-y-auto py-1.5">
            {items.map((s, i) => (
              <li
                key={s.slug}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                onMouseEnter={() => setActive(i)}
                className={cx('flex cursor-pointer items-center gap-3 px-4 py-2.5', i === active && 'bg-mist')}
              >
                <MapPin size={16} className="shrink-0 text-accent-text" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{s.name}</span>
                  <span className="block truncate text-xs text-muted-text" lang={locale === 'ko' ? 'en' : 'ko'}>{s.secondary} · {s.city}</span>
                </span>
              </li>
            ))}
            {!loading && items.length === 0 && (
              <li role="option" aria-selected={false} aria-disabled="true" className="px-4 py-3 text-sm text-muted-text">{fmt(t.search.noResults, { query: query.trim() })}</li>
            )}
          </ul>
          {!onSelect && items.length > 0 && (
            <button type="button" onClick={submitAll} className="w-full border-t border-line px-4 py-2.5 text-left text-sm text-accent-text hover:bg-paper">
              {fmt(t.search.searchAll, { query: query.trim() })}
            </button>
          )}
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {showList && !loading ? fmt(t.search.suggestions + ': {n}', { n: items.length }) : ''}
      </div>
    </div>
  );
}
