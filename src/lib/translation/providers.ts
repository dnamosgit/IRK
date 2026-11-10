// Provider-independent machine translation.
// Switch provider with TRANSLATION_PROVIDER — no code changes needed.
//   none   : no automatic translation (status "unavailable"); safe default
//   deepl  : DeepL API (DEEPL_API_KEY, DEEPL_API_URL)
//   google : Google Cloud Translation v2 (GOOGLE_TRANSLATE_API_KEY)
//   mock   : DEVELOPMENT ONLY. Produces obviously-labelled fake output so the
//            UI can be exercised. Refused in production builds.

export type TranslateInput = { texts: string[]; source: string; target: string };
export type TranslateResult =
  | { ok: true; texts: string[] }
  | { ok: false; status: 'unavailable' | 'failed'; error: string };

export interface TranslationProvider {
  name: string;
  translate(input: TranslateInput): Promise<TranslateResult>;
}

const none: TranslationProvider = {
  name: 'none',
  async translate() {
    return { ok: false, status: 'unavailable', error: 'No translation provider configured' };
  },
};

const mock: TranslationProvider = {
  name: 'mock-dev',
  async translate({ texts, source, target }) {
    return {
      ok: true,
      texts: texts.map((t) => (t ? `[DEV MOCK ${source.toUpperCase()}→${target.toUpperCase()} — not a real translation] ${t}` : t)),
    };
  },
};

const DEEPL_LANG: Record<string, string> = { en: 'EN-US', es: 'ES', ko: 'KO' };

function deepl(apiKey: string, apiUrl: string): TranslationProvider {
  return {
    name: 'deepl',
    async translate({ texts, source, target }) {
      try {
        const body = new URLSearchParams();
        texts.forEach((t) => body.append('text', t ?? ''));
        body.set('source_lang', source.toUpperCase());
        body.set('target_lang', DEEPL_LANG[target] ?? target.toUpperCase());
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return { ok: false, status: 'failed', error: `DeepL HTTP ${res.status}` };
        const json = (await res.json()) as { translations: { text: string }[] };
        return { ok: true, texts: json.translations.map((t) => t.text) };
      } catch (e) {
        return { ok: false, status: 'failed', error: (e as Error).message };
      }
    },
  };
}

function google(apiKey: string): TranslationProvider {
  return {
    name: 'google',
    async translate({ texts, source, target }) {
      try {
        const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: texts.map((t) => t ?? ''), source, target, format: 'text' }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return { ok: false, status: 'failed', error: `Google HTTP ${res.status}` };
        const json = (await res.json()) as { data: { translations: { translatedText: string }[] } };
        return { ok: true, texts: json.data.translations.map((t) => t.translatedText) };
      } catch (e) {
        return { ok: false, status: 'failed', error: (e as Error).message };
      }
    },
  };
}

export function getTranslationProvider(): TranslationProvider {
  const name = (process.env.TRANSLATION_PROVIDER ?? 'none').toLowerCase();
  if (name === 'deepl' && process.env.DEEPL_API_KEY) {
    return deepl(process.env.DEEPL_API_KEY, process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate');
  }
  if (name === 'google' && process.env.GOOGLE_TRANSLATE_API_KEY) return google(process.env.GOOGLE_TRANSLATE_API_KEY);
  if (name === 'mock' && process.env.NODE_ENV !== 'production') return mock;
  return none;
}
