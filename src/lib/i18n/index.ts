import en, { type Dictionary } from './dictionaries/en';
import es from './dictionaries/es';
import ko from './dictionaries/ko';
import type { Locale } from './config';

export type { Dictionary };
export * from './config';
export * from './format';
export { localizePath, switchLocalePath, parsePath } from './paths';

const dictionaries: Record<Locale, Dictionary> = { en, es, ko };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}
