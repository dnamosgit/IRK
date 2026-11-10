import { describe, expect, it } from 'vitest';
import { flagTypes, priorityFor, screenText, suggestsLegalReview } from '@/lib/screening';

const types = (t: string) => flagTypes(screenText(t));

describe('screenText — personal data', () => {
  it('flags email addresses and phone numbers', () => {
    expect(types('Contact me at someone@example.com')).toContain('email');
    expect(types('Call 010-1234-5678 for info')).toContain('phone');
    expect(types('전화 02-123-4567 로 연락')).toContain('phone');
    expect(types('Call +82 10 1234 5678')).toContain('phone');
  });
  it('flags registration and passport numbers', () => {
    expect(types('My number is 900101-5123456')).toContain('rrn');
    expect(types('passport M12345678 was returned')).toContain('passport');
  });
  it('flags application / reference numbers in three languages', () => {
    expect(types('My application number: AB-12345 is still pending')).toContain('reference');
    expect(types('접수번호: 2024-12345 확인')).toContain('reference');
    expect(types('número de solicitud 98765X sin respuesta')).toContain('reference');
  });
});

describe('screenText — individuals', () => {
  it('flags employee names in English, Korean and Spanish', () => {
    expect(types('The officer named Kim was rude')).toContain('person_name');
    expect(types('Officer Park explained everything')).toContain('person_name');
    expect(types('김민수 주무관이 도와주셨습니다')).toContain('person_name');
    expect(types('La funcionaria llamada Lucía fue amable')).toContain('person_name');
  });
  it('flags identifying descriptions', () => {
    expect(types('the man at counter 5 ignored me')).toContain('person_name');
    expect(types('3번 창구 직원')).toContain('person_name');
  });
});

describe('screenText — harmful content', () => {
  it('flags threats with urgent priority', () => {
    const flags = screenText('I will find where he lives');
    expect(flagTypes(flags)).toContain('threat');
    expect(priorityFor(flags)).toBe('urgent');
  });
  it('flags criminal allegations for legal review without judging them', () => {
    for (const t of ['They asked for a bribe', '뇌물을 요구했다', 'pidieron un soborno']) {
      const flags = screenText(t);
      expect(flagTypes(flags)).toContain('criminal_allegation');
      expect(suggestsLegalReview(flags)).toBe(true);
    }
  });
  it('flags insults', () => {
    expect(types('what an idiot')).toContain('harassment');
    expect(types('정말 멍청한 안내')).toContain('harassment');
  });
});

describe('screenText — clean text', () => {
  it('does not flag an ordinary review', () => {
    const text =
      'The appointment started on time and the staff explained the documents clearly. The waiting area was crowded around noon, so I would recommend arriving early.';
    expect(screenText(text)).toEqual([]);
    expect(priorityFor([])).toBe('low');
  });
  it('does not flag an ordinary Korean or Spanish review', () => {
    expect(screenText('예약 시간에 맞춰 도착했고 대기 시간은 짧았습니다. 안내가 친절했습니다.')).toEqual([]);
    expect(screenText('Me atendieron rápido y con paciencia. El edificio tenía rampas.')).toEqual([]);
  });
});
