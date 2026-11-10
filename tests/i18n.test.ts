import { describe, expect, it } from 'vitest';
import en from '@/lib/i18n/dictionaries/en';
import es from '@/lib/i18n/dictionaries/es';
import ko from '@/lib/i18n/dictionaries/ko';
import { localizePath, parsePath, switchLocalePath } from '@/lib/i18n/paths';
import { fmt, plural } from '@/lib/i18n/format';

type Tree = { [k: string]: unknown };
function shape(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string') return [`${prefix}:string`];
  if (Array.isArray(obj)) return [`${prefix}:array(${obj.length})`];
  return Object.keys(obj as Tree).sort().flatMap((k) => shape((obj as Tree)[k], prefix ? `${prefix}.${k}` : k));
}
function leaves(obj: unknown, prefix = ''): [string, string][] {
  if (typeof obj === 'string') return [[prefix, obj]];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => leaves(v, `${prefix}[${i}]`));
  return Object.entries(obj as Tree).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('dictionaries', () => {
  it.each([['es', es], ['ko', ko]])('%s has exactly the same keys (and list lengths) as en', (_, dict) => {
    expect(shape(dict)).toEqual(shape(en));
  });
  it.each([['es', es], ['ko', ko]])('%s keeps every placeholder', (_, dict) => {
    const other = new Map(leaves(dict));
    for (const [key, value] of leaves(en)) expect(placeholders(other.get(key) ?? ''), key).toBe(placeholders(value));
  });
  it('has no empty strings', () => {
    for (const d of [en, es, ko]) for (const [k, v] of leaves(d)) expect(v.trim(), k).not.toBe('');
  });
});

describe('localized routing', () => {
  it('localizes the first segment for Spanish only', () => {
    expect(localizePath('es', '/offices/seoul-immigration-office')).toBe('/es/oficinas/seoul-immigration-office');
    expect(localizePath('ko', '/offices/seoul-immigration-office')).toBe('/ko/offices/seoul-immigration-office');
    expect(localizePath('en', '')).toBe('/en');
  });
  it('maps localized URLs back to internal routes', () => {
    expect(parsePath('/es/oficinas/x')).toEqual({ locale: 'es', internalPath: '/offices/x' });
    expect(parsePath('/foo')).toEqual({ locale: null, internalPath: '/foo' });
  });
  it('switches language while preserving the page and query', () => {
    expect(switchLocalePath('/es/oficinas/x', 'ko', '?sort=lowest')).toBe('/ko/offices/x?sort=lowest');
    expect(switchLocalePath('/en/write-review', 'es')).toBe('/es/escribir-resena');
    expect(switchLocalePath('/ko', 'en')).toBe('/en');
  });
});

describe('formatting', () => {
  it('interpolates and pluralises per locale', () => {
    expect(fmt('Hi {name}', { name: 'A' })).toBe('Hi A');
    expect(plural('en', en.directory.reviewCount, 1)).toBe('1 review');
    expect(plural('en', en.directory.reviewCount, 3)).toBe('3 reviews');
    expect(plural('es', es.directory.reviewCount, 1)).toBe('1 reseña');
    expect(plural('ko', ko.directory.reviewCount, 2)).toBe('후기 2개');
  });
});
