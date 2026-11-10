// FICTIONAL SAMPLE REVIEWS — DEVELOPMENT ONLY.
// Every row is inserted with is_sample = true, is shown with a "Fictional
// sample" badge, is excluded from platform statistics, and is never shown by
// a production build. These texts do not describe real visits.

type Scores = [number, number, number, number, number];
export type SampleReview = {
  office: string;
  service: string;
  monthsAgo: number;
  lang: 'en' | 'es' | 'ko';
  appointment: 'yes' | 'no' | 'unsure';
  outcome: 'yes' | 'partially' | 'no' | 'unsure';
  scores: Scores;
  verified: boolean;
  title: string;
  body: string;
};

const s = (
  office: string, service: string, monthsAgo: number, lang: SampleReview['lang'],
  scores: Scores, verified: boolean, title: string, body: string,
  appointment: SampleReview['appointment'] = 'yes', outcome: SampleReview['outcome'] = 'yes',
): SampleReview => ({ office, service, monthsAgo, lang, scores, verified, title, body, appointment, outcome });

const SEOUL = 'seoul-immigration-office';

export const SAMPLE_REVIEWS: SampleReview[] = [
  s(SEOUL, 'residence_extension', 1, 'en', [5, 4, 3, 4, 4], true, '[Sample] Organised, but plan for a wait',
    'FICTIONAL SAMPLE. The appointment slot was honoured, although I still waited around forty minutes after checking in. The staff member at the counter explained each missing item calmly and wrote down what to bring next time.'),
  s(SEOUL, 'residence_card', 2, 'ko', [4, 4, 4, 5, 4], false, '[샘플] 안내가 친절했습니다',
    '가상의 샘플 후기입니다. 번호표를 받은 후 대기 시간이 길지 않았고, 창구 직원분이 필요한 서류를 차근차근 설명해 주셨습니다. 안내 표지판이 조금 더 명확하면 좋겠습니다.'),
  s(SEOUL, 'status_change', 2, 'es', [3, 3, 2, 3, 3], false, '[Muestra] Larga espera, trato correcto',
    'RESEÑA FICTICIA DE MUESTRA. El trato fue correcto, pero la espera superó las dos horas. Sería útil tener información en más idiomas en la sala de espera y pantallas con el turno actual.', 'no', 'partially'),
  s(SEOUL, 'visa_application', 3, 'en', [4, 5, 4, 4, 5], true, '[Sample] Clear explanations in English',
    'FICTIONAL SAMPLE. I was nervous about the language barrier, but the officer switched to simple English and confirmed I understood the next steps. The building had a lift and seating near every counter.'),
  s(SEOUL, 'document_submission', 3, 'en', [3, 2, 3, 3, 4], false, '[Sample] Instructions could be clearer',
    'FICTIONAL SAMPLE. Submitting the documents was quick, but nobody told me how I would be notified about the result. A printed handout with the next steps would make a big difference.', 'yes', 'yes'),
  s(SEOUL, 'residence_extension', 4, 'ko', [5, 5, 4, 5, 4], true, '[샘플] 예약 덕분에 빨랐어요',
    '가상의 샘플 후기입니다. 하이코리아로 방문 예약을 하고 가서 거의 기다리지 않았습니다. 서류를 미리 순서대로 정리해 가니 처리도 빨랐습니다.'),
  s(SEOUL, 'other', 5, 'es', [4, 4, 3, 4, 4], false, '[Muestra] Buena orientación general',
    'RESEÑA FICTICIA DE MUESTRA. Fui a hacer una consulta general y me orientaron hacia el trámite correcto. La espera fue moderada y el personal fue amable aunque estaban muy ocupados.', 'no', 'yes'),
  s(SEOUL, 'residence_card', 6, 'en', [2, 3, 2, 3, 3], false, '[Sample] Crowded morning',
    'FICTIONAL SAMPLE. I arrived early in the morning and the waiting area was already full. Staff were polite but clearly overloaded. Next time I will try to book an appointment slot in advance.', 'no', 'yes'),
  s(SEOUL, 'nationality', 7, 'ko', [4, 4, 3, 4, 3], false, '[샘플] 상담은 만족, 대기는 아쉬움',
    '가상의 샘플 후기입니다. 상담 내용은 자세했지만 대기 공간이 좁고 혼잡했습니다. 장애인 편의시설 안내가 더 있었으면 좋겠습니다.'),
  s(SEOUL, 'visa_application', 8, 'en', [5, 4, 4, 4, 5], true, '[Sample] Smooth process overall',
    'FICTIONAL SAMPLE. From the queue machine to the counter everything was well signposted. The officer checked my documents carefully and told me the expected processing time.'),
  s(SEOUL, 'status_change', 9, 'es', [3, 4, 3, 3, 4], false, '[Muestra] Proceso claro pero lento',
    'RESEÑA FICTICIA DE MUESTRA. Me explicaron con claridad qué documentos faltaban. El proceso fue lento, pero salí sabiendo exactamente qué tenía que hacer después.'),
  s(SEOUL, 'residence_extension', 10, 'en', [4, 4, 4, 4, 4], false, '[Sample] Predictable and fair',
    'FICTIONAL SAMPLE. Nothing remarkable, which is a good thing. The wait matched what the screen showed and the staff member answered my questions about the receipt.'),
  s('busan-immigration-office', 'residence_extension', 1, 'ko', [4, 3, 4, 4, 4], false, '[샘플] 무난한 방문',
    '가상의 샘플 후기입니다. 예약 시간에 맞춰 도착했고 대기 시간은 짧았습니다. 다만 외국어 안내가 부족해서 동행한 친구가 통역을 도와주었습니다.'),
  s('busan-immigration-office', 'visa_application', 2, 'en', [3, 3, 3, 3, 3], false, '[Sample] Average experience',
    'FICTIONAL SAMPLE. The process worked, but I had to return a second time because a requirement was not mentioned on my first visit. Confirming requirements beforehand would have saved time.', 'yes', 'partially'),
  s('busan-immigration-office', 'residence_card', 4, 'es', [5, 4, 4, 5, 5], true, '[Muestra] Muy buena atención',
    'RESEÑA FICTICIA DE MUESTRA. Me atendieron rápido y con paciencia. El edificio tenía rampas y el personal me ayudó a llenar el formulario.'),
  s('incheon-immigration-office', 'document_submission', 1, 'en', [4, 4, 5, 4, 4], false, '[Sample] Quick drop-off',
    'FICTIONAL SAMPLE. Document submission took less than twenty minutes in total. The staff confirmed what I had submitted and how to check the status online.'),
  s('incheon-immigration-office', 'status_change', 3, 'ko', [3, 2, 3, 3, 3], false, '[샘플] 설명이 조금 부족했어요',
    '가상의 샘플 후기입니다. 직원분은 친절했지만 다음 절차에 대한 설명이 짧아서 집에 와서 다시 찾아봐야 했습니다.'),
  s('suwon-immigration-office', 'residence_extension', 2, 'en', [4, 5, 3, 4, 4], false, '[Sample] Helpful staff, long queue',
    'FICTIONAL SAMPLE. The queue was long, but the staff member explained everything slowly and checked that I understood. Bring something to read while you wait.'),
];
