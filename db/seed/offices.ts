// Initial office directory.
//
// IMPORTANT — DATA PROVENANCE
// The build environment could not reach immigration.go.kr or hikorea.go.kr, so
// NOTHING below has been verified against an official source yet. Every record
// is therefore seeded with data_status = 'unverified' and:
//   * address, phone, website, opening hours and services are left EMPTY
//     (the UI shows "Information not yet verified");
//   * coordinates are APPROXIMATE CITY CENTRES (location_precision =
//     'approximate_city') so the map is usable, and the UI says so;
//   * office names follow the publicly known Korea Immigration Service naming
//     pattern and must be confirmed by a data administrator.
// A data administrator must verify each record in /admin/offices against the
// official source, fill in the remaining fields and set "verified".

export type SeedOffice = {
  slug: string;
  type: 'immigration_office' | 'branch_office' | 'airport_facility' | 'other_facility';
  nameKo: string;
  nameEn: string;
  nameEs: string;
  city: string;
  region: string;
  /** approximate city centre — NOT the office location */
  approx: [number, number];
};

export const SEED_OFFICES: SeedOffice[] = [
  { slug: 'seoul-immigration-office', type: 'immigration_office', nameKo: '서울출입국·외국인청', nameEn: 'Seoul Immigration Office', nameEs: 'Oficina de Inmigración de Seúl', city: 'seoul', region: 'seoul', approx: [37.5665, 126.978] },
  { slug: 'seoul-southern-immigration-office', type: 'immigration_office', nameKo: '서울남부출입국·외국인사무소', nameEn: 'Seoul Southern Immigration Office', nameEs: 'Oficina de Inmigración del Sur de Seúl', city: 'seoul', region: 'seoul', approx: [37.5665, 126.978] },
  { slug: 'incheon-immigration-office', type: 'immigration_office', nameKo: '인천출입국·외국인청', nameEn: 'Incheon Immigration Office', nameEs: 'Oficina de Inmigración de Incheon', city: 'incheon', region: 'incheon', approx: [37.4563, 126.7052] },
  { slug: 'incheon-airport-immigration-office', type: 'airport_facility', nameKo: '인천공항출입국·외국인청', nameEn: 'Incheon Airport Immigration Office', nameEs: 'Oficina de Inmigración del Aeropuerto de Incheon', city: 'incheon', region: 'incheon', approx: [37.4563, 126.7052] },
  { slug: 'suwon-immigration-office', type: 'immigration_office', nameKo: '수원출입국·외국인청', nameEn: 'Suwon Immigration Office', nameEs: 'Oficina de Inmigración de Suwon', city: 'suwon', region: 'gyeonggi', approx: [37.2636, 127.0286] },
  { slug: 'yangju-immigration-office', type: 'immigration_office', nameKo: '양주출입국·외국인사무소', nameEn: 'Yangju Immigration Office', nameEs: 'Oficina de Inmigración de Yangju', city: 'yangju', region: 'gyeonggi', approx: [37.7853, 127.0458] },
  { slug: 'busan-immigration-office', type: 'immigration_office', nameKo: '부산출입국·외국인청', nameEn: 'Busan Immigration Office', nameEs: 'Oficina de Inmigración de Busan', city: 'busan', region: 'busan', approx: [35.1796, 129.0756] },
  { slug: 'gimhae-airport-immigration-office', type: 'airport_facility', nameKo: '김해공항출입국·외국인사무소', nameEn: 'Gimhae Airport Immigration Office', nameEs: 'Oficina de Inmigración del Aeropuerto de Gimhae', city: 'busan', region: 'busan', approx: [35.1796, 129.0756] },
  { slug: 'daegu-immigration-office', type: 'immigration_office', nameKo: '대구출입국·외국인사무소', nameEn: 'Daegu Immigration Office', nameEs: 'Oficina de Inmigración de Daegu', city: 'daegu', region: 'daegu', approx: [35.8714, 128.6014] },
  { slug: 'daejeon-immigration-office', type: 'immigration_office', nameKo: '대전출입국·외국인사무소', nameEn: 'Daejeon Immigration Office', nameEs: 'Oficina de Inmigración de Daejeon', city: 'daejeon', region: 'daejeon', approx: [36.3504, 127.3845] },
  { slug: 'gwangju-immigration-office', type: 'immigration_office', nameKo: '광주출입국·외국인사무소', nameEn: 'Gwangju Immigration Office', nameEs: 'Oficina de Inmigración de Gwangju', city: 'gwangju', region: 'gwangju', approx: [35.1595, 126.8526] },
  { slug: 'ulsan-immigration-office', type: 'immigration_office', nameKo: '울산출입국·외국인사무소', nameEn: 'Ulsan Immigration Office', nameEs: 'Oficina de Inmigración de Ulsan', city: 'ulsan', region: 'ulsan', approx: [35.5384, 129.3114] },
  { slug: 'changwon-immigration-office', type: 'immigration_office', nameKo: '창원출입국·외국인사무소', nameEn: 'Changwon Immigration Office', nameEs: 'Oficina de Inmigración de Changwon', city: 'changwon', region: 'gyeongnam', approx: [35.228, 128.6811] },
  { slug: 'cheongju-immigration-office', type: 'immigration_office', nameKo: '청주출입국·외국인사무소', nameEn: 'Cheongju Immigration Office', nameEs: 'Oficina de Inmigración de Cheongju', city: 'cheongju', region: 'chungbuk', approx: [36.6424, 127.489] },
  { slug: 'jeju-immigration-office', type: 'immigration_office', nameKo: '제주출입국·외국인청', nameEn: 'Jeju Immigration Office', nameEs: 'Oficina de Inmigración de Jeju', city: 'jeju', region: 'jeju', approx: [33.4996, 126.5312] },
];

// Government portals. URLs are the well-known root domains; `last_checked_at`
// stays NULL until an administrator re-checks them.
export const SEED_RESOURCES = [
  {
    key: 'kis', url: 'https://www.immigration.go.kr', category: 'official_portal', sort: 1,
    title: { en: 'Korea Immigration Service', es: 'Servicio de Inmigración de Corea', ko: '법무부 출입국·외국인정책본부' },
    description: {
      en: 'Official portal of the Korea Immigration Service, including the list of immigration offices.',
      es: 'Portal oficial del Servicio de Inmigración de Corea, incluida la lista de oficinas de inmigración.',
      ko: '출입국·외국인관서 목록을 포함한 출입국·외국인정책본부 공식 누리집입니다.',
    },
  },
  {
    key: 'hikorea', url: 'https://www.hikorea.go.kr', category: 'appointments', sort: 2,
    title: { en: 'HiKorea (e-Government for Foreigners)', es: 'HiKorea (Gobierno electrónico para extranjeros)', ko: '하이코리아 (외국인을 위한 전자정부)' },
    description: {
      en: 'Official portal for visit reservations, online applications and civil-service information for foreign residents.',
      es: 'Portal oficial para reservas de visita, solicitudes en línea e información de trámites para residentes extranjeros.',
      ko: '방문 예약, 전자민원 및 외국인 민원 안내를 위한 공식 포털입니다.',
    },
  },
  {
    key: 'visa-portal', url: 'https://www.visa.go.kr', category: 'visas', sort: 3,
    title: { en: 'Korea Visa Portal', es: 'Portal de Visas de Corea', ko: '대한민국 비자포털' },
    description: {
      en: 'Official information on visa types and online visa applications.',
      es: 'Información oficial sobre tipos de visa y solicitudes de visa en línea.',
      ko: '비자 종류와 온라인 비자 신청에 관한 공식 정보입니다.',
    },
  },
  {
    key: 'contact-center', url: 'tel:1345', category: 'contact', sort: 4,
    title: { en: 'Immigration Contact Center (1345)', es: 'Centro de Atención de Inmigración (1345)', ko: '외국인종합안내센터 (1345)' },
    description: {
      en: 'Official multilingual phone line for immigration questions. Confirm hours and languages on the official portal.',
      es: 'Línea telefónica oficial multilingüe para consultas de inmigración. Confirme horarios e idiomas en el portal oficial.',
      ko: '출입국 관련 다국어 공식 상담 전화입니다. 운영 시간과 지원 언어는 공식 누리집에서 확인하세요.',
    },
  },
  {
    key: 'moj', url: 'https://www.moj.go.kr', category: 'official_portal', sort: 5,
    title: { en: 'Ministry of Justice', es: 'Ministerio de Justicia', ko: '법무부' },
    description: {
      en: 'The ministry that oversees immigration policy in Korea.',
      es: 'El ministerio que supervisa la política migratoria en Corea.',
      ko: '대한민국의 출입국·이민 정책을 관장하는 부처입니다.',
    },
  },
];
