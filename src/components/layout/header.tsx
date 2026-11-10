'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { LanguageSwitcher } from './language-switcher';
import { LogoMark } from './logo';
import { CloseIcon, MenuIcon, PenLine } from '@/components/ui/icons';
import { buttonClass, cx } from '@/components/ui/primitives';
import { parsePath } from '@/lib/i18n/paths';

type Props = { user: { displayName: string; isAdmin: boolean } | null; signOutAction: () => Promise<void> };

export function Header({ user, signOutAction }: Props) {
  const { t, href } = useI18n();
  const pathname = usePathname();
  const internal = parsePath(pathname).internalPath;
  const overlayCapable = internal === '/';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>('a,button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>('a,button')];
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const dark = overlayCapable && !scrolled && !open;
  const links = [
    { path: '/', label: t.nav.home },
    { path: '/offices', label: t.nav.offices },
    { path: '/reviews', label: t.nav.reviews },
    { path: '/guides', label: t.nav.guides },
    { path: '/about', label: t.nav.about },
  ];
  const isActive = (p: string) => (p === '/' ? internal === '/' : internal === p || internal.startsWith(p + '/'));

  return (
    <header
      className={cx(
        'z-50 w-full transition-[background-color,border-color,backdrop-filter] duration-300',
        overlayCapable ? 'fixed top-0' : 'sticky top-0',
        dark ? 'border-b border-transparent bg-transparent' : 'border-b border-line/80 bg-paper/88 backdrop-blur-xl backdrop-saturate-150',
      )}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4 md:h-[72px]">
        <Link href={href('/')} className={cx('flex items-center gap-2.5', dark ? 'text-white' : 'text-ink')}>
          <LogoMark className={cx('h-8 w-8', dark ? 'text-white [--logo-fg:#101B2A]' : 'text-ink')} />
          <span className="whitespace-nowrap text-[0.95rem] font-semibold tracking-[-0.01em]">
            <span className="hidden sm:inline">{t.meta.siteName}</span>
            <span className="sm:hidden">IRK</span>
          </span>
        </Link>

        <nav aria-label={t.nav.mainNavigation} className="hidden xl:block">
          <ul className="flex items-center">
            {links.map((l) => (
              <li key={l.path}>
                <Link
                  href={href(l.path)}
                  aria-current={isActive(l.path) ? 'page' : undefined}
                  className={cx(
                    'whitespace-nowrap rounded-md px-2 py-2 text-[0.875rem] transition-colors',
                    dark ? 'text-white/75 hover:text-white' : 'text-muted-text hover:text-ink',
                    isActive(l.path) && (dark ? '!text-white' : '!text-ink font-medium'),
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitcher tone={dark ? 'dark' : 'light'} />
          <div className="hidden items-center gap-2 xl:flex">
            {user ? (
              <>
                {user.isAdmin && (
                  <Link href="/admin" className={cx('whitespace-nowrap px-2 text-[0.9rem]', dark ? 'text-white/75 hover:text-white' : 'text-muted-text hover:text-ink')}>{t.nav.admin}</Link>
                )}
                <Link href={href('/account')} className={cx('max-w-40 truncate px-2 text-[0.9rem]', dark ? 'text-white/75 hover:text-white' : 'text-muted-text hover:text-ink')}>
                  {t.nav.account}
                </Link>
              </>
            ) : (
              <Link href={href('/auth/sign-in')} className={cx('whitespace-nowrap px-2 text-[0.9rem]', dark ? 'text-white/75 hover:text-white' : 'text-muted-text hover:text-ink')}>
                {t.nav.signIn}
              </Link>
            )}
            <Link href={href('/write-review')} className={buttonClass(dark ? 'light' : 'primary', 'sm')}>
              <PenLine size={16} />
              {t.nav.writeReview}
            </Link>
          </div>
          <Link href={href('/write-review')} aria-label={t.nav.writeReview} className={cx(buttonClass(dark ? 'light' : 'primary', 'sm', 'xl:hidden !px-2.5'))}>
            <PenLine size={16} />
          </Link>
          <button
            ref={menuButton}
            type="button"
            className={cx('rounded-md p-2 xl:hidden', dark ? 'text-white' : 'text-ink')}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.nav.closeMenu : t.nav.menu}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" ref={panel} className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-paper md:top-[72px] xl:hidden" role="dialog" aria-modal="true" aria-label={t.nav.menu}>
          <nav aria-label={t.nav.mainNavigation} className="container-x py-6">
            <ul className="divide-y divide-line border-y border-line">
              {links.map((l) => (
                <li key={l.path}>
                  <Link href={href(l.path)} aria-current={isActive(l.path) ? 'page' : undefined} className="flex py-4 text-lg font-medium text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
              {user ? (
                <>
                  <li><Link href={href('/account')} className="flex py-4 text-lg text-ink">{t.nav.account}</Link></li>
                  {user.isAdmin && <li><Link href="/admin" className="flex py-4 text-lg text-ink">{t.nav.admin}</Link></li>}
                  <li>
                    <form action={signOutAction}>
                      <button type="submit" className="flex w-full py-4 text-left text-lg text-muted-text">{t.nav.signOut}</button>
                    </form>
                  </li>
                </>
              ) : (
                <li><Link href={href('/auth/sign-in')} className="flex py-4 text-lg text-ink">{t.nav.signIn}</Link></li>
              )}
            </ul>
            <Link href={href('/write-review')} className={buttonClass('primary', 'lg', 'mt-8 w-full')}>
              <PenLine size={18} /> {t.nav.writeReview}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
