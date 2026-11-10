// Automated pre-publication screening. Pure function, no I/O.
//
// Screening only FLAGS passages for human moderators. It never decides
// whether an allegation is true or false and never publishes or rejects a
// review on its own. Patterns are intentionally broad (false positives are
// cheap: a moderator looks at them; false negatives are not).

export type FlagType =
  | 'email'
  | 'phone'
  | 'rrn'
  | 'passport'
  | 'reference'
  | 'url'
  | 'person_name'
  | 'threat'
  | 'criminal_allegation'
  | 'harassment'
  | 'hate';

export type Severity = 'low' | 'medium' | 'high';

export type ScreeningFlag = { type: FlagType; severity: Severity; excerpt: string; index: number };

type Rule = { type: FlagType; severity: Severity; pattern: RegExp };

const RULES: Rule[] = [
  // ---- personal data
  { type: 'email', severity: 'high', pattern: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu },
  // Korean resident / foreign registration number: 6 digits, optional dash, 7 digits starting 1-8
  { type: 'rrn', severity: 'high', pattern: /\b\d{6}\s?-\s?[1-8]\d{6}\b/g },
  { type: 'phone', severity: 'high', pattern: /(?:\+82[\s-]?|\b0)(?:1[016789]|[2-6]\d?)[\s.-]?\d{3,4}[\s.-]?\d{4}\b/g },
  { type: 'passport', severity: 'high', pattern: /\b[A-Z]{1,2}\d{7,8}\b/g },
  {
    type: 'reference',
    severity: 'medium',
    pattern: /(?:application|reference|receipt|reservation|case|file)\s*(?:no\.?|number|#|id)?\s*[:#]?\s*[A-Z0-9-]{5,}|(?:접수|신청|예약|민원)\s*번호\s*[:：]?\s*[A-Z0-9-]{4,}|(?:n[úu]mero\s+de\s+(?:solicitud|expediente|reserva|referencia))\s*[:#]?\s*[A-Z0-9-]{4,}|\b\d{9,}\b/giu,
  },
  { type: 'url', severity: 'low', pattern: /\bhttps?:\/\/\S+|\bwww\.\S+/gi },

  // ---- identifying individual employees
  {
    type: 'person_name',
    severity: 'medium',
    pattern: /\b(?:[Oo]fficers?|[Ss]taff(?:\s+member)?|[Aa]gent|[Ee]mployee|[Cc]lerk|[Oo]fficial|M(?:r|rs|s|iss))\.?\s+(?:named\s+|called\s+)?[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?\b|\b(?:named|called|name tag (?:said|read))\s+[A-Z][a-z]{2,}|\bname\s+(?:is|was)\s+[A-Z][a-z]{2,}/g,
  },
  { type: 'person_name', severity: 'medium', pattern: /[가-힣]{2,4}\s?(?:주무관|사무관|실무관|계장|과장|팀장|소장|청장|직원분?|선생님|씨)(?=[\s,.!?이가은는을를에의께]|$)/gu },
  {
    type: 'person_name',
    severity: 'medium',
    pattern: /(?<![\p{L}])(?:[Oo]ficial|[Ff]uncionari[oa]|[Ee]mplead[oa]|[Aa]gente|[Ss]e[ñn]or(?:a|ita)?|Sr|Sra|Srta)\.?\s+(?:llamad[oa]\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}|\bllamad[oa]\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/gu,
  },
  // identifying descriptions: "the officer at counter 5", "3번 창구 직원", "ventanilla 4"
  { type: 'person_name', severity: 'low', pattern: /\b(?:counter|window|desk|booth)\s*(?:no\.?|number|#)?\s*\d+|\d+\s?번\s?창구|ventanilla\s*(?:n[úu]mero\s*)?\d+/giu },

  // ---- threats
  {
    type: 'threat',
    severity: 'high',
    pattern: /\b(?:kill|murder|shoot|stab|hurt|beat up|burn down|blow up|bomb)\b|find (?:out )?where (?:you|they|she|he) lives?|(?:will|gonna|going to) (?:pay|regret)|죽(?:이|여)|죽일|가만\s?(?:두지|안\s?둘)|폭파|불\s?질러|\bmatar(?:é|le|la|los)?\b|\b(?:te|les|los) voy a (?:buscar|encontrar|hacer pagar)|lo vas a pagar|bomba/giu,
  },

  // ---- serious allegations (route to human review; not judged true/false)
  {
    type: 'criminal_allegation',
    severity: 'medium',
    pattern: /\b(?:brib(?:e|es|ed|ery)|corrupt(?:ion|ed)?|embezzl\w*|extort\w*|fraud\w*|stole|steal(?:s|ing)?|theft|illegal(?:ly)?|crim(?:e|inal)|abuse of power)\b|뇌물|부패|횡령|갈취|사기|불법|범죄|직권\s?남용|\b(?:soborn\w*|corrup\w*|malversaci[óo]n|extorsi[óo]n|fraude|rob[óo]|robo|ilegal\w*|delito|crimen)\b/giu,
  },

  // ---- harassment / insults
  {
    type: 'harassment',
    severity: 'low',
    pattern: /\b(?:idiot|stupid|moron|imbecile|incompetent fool|useless (?:idiot|people)|bitch|bastard|asshole)\b|바보|멍청|병신|등신|개새\S*|씨발|시발|\b(?:idiota|est[úu]pid[oa]|imb[ée]cil|pendej[oa]|cabr[óo]n|in[úu]til)\b/giu,
  },

  // ---- hateful generalisations (kept generic; extend with a moderator-maintained lexicon)
  {
    type: 'hate',
    severity: 'medium',
    pattern: /\b(?:all|those) (?:koreans|foreigners|immigrants|chinese|africans|muslims|people like (?:them|you)) (?:are|should)\b|\b(?:todos los|esos) (?:coreanos|extranjeros|inmigrantes) (?:son|deber[íi]an)\b|(?:외국인|한국인|조선족)(?:들)?은\s?(?:다|모두)/giu,
  },
];

export function screenText(text: string): ScreeningFlag[] {
  const flags: ScreeningFlag[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    for (const m of text.matchAll(rule.pattern)) {
      const excerpt = m[0].trim();
      const key = `${rule.type}:${m.index}`;
      if (!excerpt || seen.has(key)) continue;
      // a registration number also matches the generic long-digit "reference" rule
      if (rule.type === 'reference' && flags.some((f) => (f.type === 'rrn' || f.type === 'phone') && Math.abs(f.index - (m.index ?? 0)) < 4)) continue;
      seen.add(key);
      flags.push({ type: rule.type, severity: rule.severity, excerpt: excerpt.slice(0, 80), index: m.index ?? 0 });
    }
  }
  return flags.sort((a, b) => a.index - b.index);
}

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export function priorityFor(flags: ScreeningFlag[], signals: { type: string }[] = []): Priority {
  if (flags.some((f) => f.type === 'threat')) return 'urgent';
  if (flags.some((f) => f.severity === 'high') || signals.length >= 2) return 'high';
  if (flags.length > 0 || signals.length > 0) return 'normal';
  return 'low';
}

/** Allegations and threats should be looked at with legal escalation in mind. */
export function suggestsLegalReview(flags: ScreeningFlag[]): boolean {
  return flags.some((f) => f.type === 'criminal_allegation' || f.type === 'threat');
}

/** Distinct flag types, for the author-facing pre-submission notice. */
export function flagTypes(flags: ScreeningFlag[]): FlagType[] {
  return [...new Set(flags.map((f) => f.type))];
}
