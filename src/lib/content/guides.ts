// Editorial preparation guides. RULES: general, practical advice only. No
// fees, deadlines, document lists or eligibility rules — those must come from
// official sources, which every guide links to.
import type { Locale } from '@/lib/i18n/config';

type Section = { heading: string; paragraphs?: string[]; bullets?: string[] };
type GuideContent = { title: string; summary: string; sections: Section[] };
export type Guide = { slug: string; lastReviewed: string; officialKeys: string[]; content: Record<Locale, GuideContent> };

const COMMON_CHECK = {
  en: 'Requirements depend on your situation and change over time. Always confirm the current checklist on the official portals before your visit.',
  es: 'Los requisitos dependen de tu situación y cambian con el tiempo. Confirma siempre la lista vigente en los portales oficiales antes de tu visita.',
  ko: '요건은 개인 상황에 따라 다르고 수시로 바뀝니다. 방문 전에 반드시 공식 포털에서 최신 안내를 확인하세요.',
};

export const GUIDES: Guide[] = [
  {
    slug: 'appointments',
    lastReviewed: '2026-11-10',
    officialKeys: ['hikorea', 'contact-center'],
    content: {
      en: {
        title: 'Immigration appointments',
        summary: 'How to approach booking a visit and what to do on the day.',
        sections: [
          { heading: 'Before you book', paragraphs: ['Many visits can be reserved in advance through the official HiKorea portal. Check whether your office and your type of application use reservations, and how far ahead slots become available.', COMMON_CHECK.en] },
          { heading: 'On the day', bullets: ['Arrive with enough time to find the building, pass any entrance checks and take a queue ticket if required.', 'Keep your reservation confirmation easy to show.', 'Bring a pen, and keep your phone charged in case you need to show digital documents.', 'If something is unclear, it is reasonable to ask staff to repeat or write down the next steps.'] },
          { heading: 'If you need language help', paragraphs: ['The official Immigration Contact Center offers multilingual phone support. Confirm current hours and available languages on the official portal.'] },
        ],
      },
      es: {
        title: 'Citas de inmigración',
        summary: 'Cómo plantear la reserva de una visita y qué hacer el día de la cita.',
        sections: [
          { heading: 'Antes de reservar', paragraphs: ['Muchas visitas pueden reservarse con antelación en el portal oficial HiKorea. Comprueba si tu oficina y tu tipo de trámite usan reservas, y con cuánta antelación se abren los turnos.', COMMON_CHECK.es] },
          { heading: 'El día de la cita', bullets: ['Llega con tiempo suficiente para encontrar el edificio, pasar los controles de entrada y sacar número si es necesario.', 'Ten a mano la confirmación de la reserva.', 'Lleva un bolígrafo y el móvil cargado por si debes mostrar documentos digitales.', 'Si algo no queda claro, es razonable pedir al personal que repita o anote los siguientes pasos.'] },
          { heading: 'Si necesitas ayuda con el idioma', paragraphs: ['El Centro de Atención de Inmigración ofrece atención telefónica en varios idiomas. Confirma horarios e idiomas disponibles en el portal oficial.'] },
        ],
      },
      ko: {
        title: '출입국 방문 예약',
        summary: '방문 예약을 준비하는 방법과 방문 당일 유의할 점.',
        sections: [
          { heading: '예약 전에', paragraphs: ['많은 업무는 공식 하이코리아 포털에서 미리 방문 예약을 할 수 있습니다. 방문할 관서와 신청 업무가 예약제인지, 예약 가능 시점은 언제인지 확인하세요.', COMMON_CHECK.ko] },
          { heading: '방문 당일', bullets: ['건물 위치를 찾고 출입 확인을 거쳐 번호표를 받을 수 있도록 여유 있게 도착하세요.', '예약 확인 내역을 바로 보여줄 수 있게 준비하세요.', '필기구를 챙기고, 전자 서류를 보여줘야 할 수 있으니 휴대전화를 충전해 두세요.', '이해되지 않는 부분은 다시 설명하거나 다음 절차를 적어 달라고 요청해도 괜찮습니다.'] },
          { heading: '언어 지원이 필요하다면', paragraphs: ['외국인종합안내센터에서 다국어 전화 상담을 제공합니다. 운영 시간과 지원 언어는 공식 포털에서 확인하세요.'] },
        ],
      },
    },
  },
  {
    slug: 'residence-extension',
    lastReviewed: '2026-11-10',
    officialKeys: ['hikorea', 'kis'],
    content: {
      en: {
        title: 'Residence extensions',
        summary: 'Planning ahead so an extension visit is calm rather than rushed.',
        sections: [
          { heading: 'Plan early', paragraphs: ['Note your current permitted period of stay and check, on the official portal, when and how an extension can be requested for your status. Some applications can be made online; others require a visit.', COMMON_CHECK.en] },
          { heading: 'Prepare your paperwork', bullets: ['Use the official checklist for your status as your single source of truth.', 'Organise documents in the order the checklist lists them.', 'Keep copies of everything you submit and any receipt you are given.'] },
          { heading: 'After your visit', paragraphs: ['Ask how you will be informed of the result and how to check the status yourself. Keep your receipt until the process is complete.'] },
        ],
      },
      es: {
        title: 'Extensión de residencia',
        summary: 'Planificar con tiempo para que la visita de extensión sea tranquila y no apresurada.',
        sections: [
          { heading: 'Planifica con antelación', paragraphs: ['Anota tu periodo de estancia autorizado y consulta en el portal oficial cuándo y cómo puede solicitarse una extensión para tu estatus. Algunos trámites pueden hacerse en línea; otros requieren visita.', COMMON_CHECK.es] },
          { heading: 'Prepara tu documentación', bullets: ['Usa la lista oficial para tu estatus como única fuente de referencia.', 'Ordena los documentos según el orden de esa lista.', 'Guarda copias de todo lo que entregues y cualquier recibo que te den.'] },
          { heading: 'Después de la visita', paragraphs: ['Pregunta cómo te comunicarán el resultado y cómo consultar el estado por tu cuenta. Conserva el recibo hasta que termine el proceso.'] },
        ],
      },
      ko: {
        title: '체류기간 연장',
        summary: '서두르지 않고 차분하게 연장 업무를 준비하는 방법.',
        sections: [
          { heading: '미리 계획하기', paragraphs: ['현재 체류기간 만료일을 기록해 두고, 내 체류자격의 연장 신청 시기와 방법을 공식 포털에서 확인하세요. 온라인으로 가능한 신청도 있고 방문이 필요한 신청도 있습니다.', COMMON_CHECK.ko] },
          { heading: '서류 준비', bullets: ['내 체류자격에 맞는 공식 안내를 유일한 기준으로 삼으세요.', '안내에 나온 순서대로 서류를 정리하세요.', '제출한 서류의 사본과 받은 접수증을 보관하세요.'] },
          { heading: '방문 후', paragraphs: ['결과를 어떻게 안내받는지, 진행 상황은 어떻게 직접 확인하는지 물어보세요. 처리가 끝날 때까지 접수증을 보관하세요.'] },
        ],
      },
    },
  },
  {
    slug: 'status-change',
    lastReviewed: '2026-11-10',
    officialKeys: ['visa-portal', 'hikorea', 'contact-center'],
    content: {
      en: {
        title: 'Changing your visa status',
        summary: 'Questions to answer before you visit about a change of status.',
        sections: [
          { heading: 'Confirm what applies to you', paragraphs: ['Whether a change of status is possible, and what it requires, depends on your current status and the status you are applying for. Read the official information for both before your visit, or ask the official contact center.', COMMON_CHECK.en] },
          { heading: 'Questions worth writing down', bullets: ['Can this change be requested in Korea, and at which office?', 'Is a reservation needed?', 'How will I be notified of the result?', 'What can I do while the application is being processed?'] },
          { heading: 'Professional advice', paragraphs: ['For complex situations, consider advice from a qualified professional. Experiences shared on this site are not legal advice.'] },
        ],
      },
      es: {
        title: 'Cambio de estatus de visa',
        summary: 'Preguntas que conviene resolver antes de acudir por un cambio de estatus.',
        sections: [
          { heading: 'Confirma qué se aplica a tu caso', paragraphs: ['Que el cambio de estatus sea posible, y lo que exige, depende de tu estatus actual y del que solicitas. Lee la información oficial de ambos antes de ir o consulta al centro de atención oficial.', COMMON_CHECK.es] },
          { heading: 'Preguntas que conviene anotar', bullets: ['¿Se puede solicitar este cambio en Corea y en qué oficina?', '¿Hace falta reserva?', '¿Cómo me comunicarán el resultado?', '¿Qué puedo hacer mientras se tramita la solicitud?'] },
          { heading: 'Asesoramiento profesional', paragraphs: ['En situaciones complejas, considera el asesoramiento de un profesional cualificado. Las experiencias de este sitio no son asesoramiento legal.'] },
        ],
      },
      ko: {
        title: '체류자격 변경',
        summary: '체류자격 변경 업무로 방문하기 전에 확인해 둘 질문들.',
        sections: [
          { heading: '나에게 해당하는 내용 확인', paragraphs: ['체류자격 변경이 가능한지, 무엇이 필요한지는 현재 체류자격과 신청하려는 체류자격에 따라 다릅니다. 방문 전에 두 자격의 공식 안내를 모두 읽거나 공식 상담센터에 문의하세요.', COMMON_CHECK.ko] },
          { heading: '적어 두면 좋은 질문', bullets: ['국내에서 이 변경을 신청할 수 있는지, 어느 관서에서 하는지', '방문 예약이 필요한지', '결과는 어떻게 안내받는지', '심사 기간 동안 무엇을 할 수 있는지'] },
          { heading: '전문가 상담', paragraphs: ['복잡한 상황이라면 자격을 갖춘 전문가의 상담을 고려하세요. 이 사이트의 경험담은 법률 자문이 아닙니다.'] },
        ],
      },
    },
  },
  {
    slug: 'document-submission',
    lastReviewed: '2026-11-10',
    officialKeys: ['hikorea'],
    content: {
      en: {
        title: 'Submitting documents',
        summary: 'Small habits that make in-person submissions smoother.',
        sections: [
          { heading: 'Organise before you go', bullets: ['Follow the official checklist for your application exactly.', 'Check whether translations or certifications are required by the official instructions — do not assume.', 'Keep originals and copies separated and labelled.'] },
          { heading: 'At the counter', paragraphs: ['Ask the staff member to confirm what was received. If anything is missing, ask how and where to submit it later.', COMMON_CHECK.en] },
          { heading: 'Protect your information', paragraphs: ['Never post photos of your documents, receipts or reference numbers online — including in reviews on this site.'] },
        ],
      },
      es: {
        title: 'Entrega de documentos',
        summary: 'Pequeños hábitos que facilitan la entrega en persona.',
        sections: [
          { heading: 'Organízate antes de ir', bullets: ['Sigue exactamente la lista oficial de tu trámite.', 'Comprueba en las instrucciones oficiales si se exigen traducciones o certificaciones; no lo supongas.', 'Separa y etiqueta originales y copias.'] },
          { heading: 'En la ventanilla', paragraphs: ['Pide al personal que confirme lo que recibió. Si falta algo, pregunta cómo y dónde entregarlo después.', COMMON_CHECK.es] },
          { heading: 'Protege tu información', paragraphs: ['Nunca publiques fotos de tus documentos, recibos o números de referencia en internet, tampoco en reseñas de este sitio.'] },
        ],
      },
      ko: {
        title: '서류 제출',
        summary: '방문 제출을 더 수월하게 만드는 작은 습관.',
        sections: [
          { heading: '가기 전에 정리하기', bullets: ['신청 업무의 공식 안내를 그대로 따르세요.', '번역이나 공증이 필요한지 공식 안내에서 확인하세요. 추측하지 마세요.', '원본과 사본을 구분해 표시해 두세요.'] },
          { heading: '창구에서', paragraphs: ['접수된 서류를 직원에게 확인해 달라고 요청하세요. 빠진 서류가 있다면 언제, 어디로 제출하면 되는지 물어보세요.', COMMON_CHECK.ko] },
          { heading: '개인정보 보호', paragraphs: ['서류, 접수증, 접수 번호 사진을 온라인에 올리지 마세요. 이 사이트의 후기도 마찬가지입니다.'] },
        ],
      },
    },
  },
  {
    slug: 'residence-card',
    lastReviewed: '2026-11-10',
    officialKeys: ['hikorea', 'kis'],
    content: {
      en: {
        title: 'Residence cards',
        summary: 'Preparing for registration, reissue or update visits.',
        sections: [
          { heading: 'Know which procedure you need', paragraphs: ['Registration, reissue and changes to registered details are different procedures. Check the official portal for the one that matches your situation, including whether a reservation or photo is needed.', COMMON_CHECK.en] },
          { heading: 'Practical tips', bullets: ['Ask how and when you can collect or receive the card.', 'Keep any receipt or temporary proof you are given.', 'Never share your registration number publicly.'] },
        ],
      },
      es: {
        title: 'Tarjeta de residencia',
        summary: 'Cómo prepararse para visitas de registro, reexpedición o actualización.',
        sections: [
          { heading: 'Identifica el trámite que necesitas', paragraphs: ['El registro, la reexpedición y los cambios de datos registrados son trámites distintos. Consulta en el portal oficial el que corresponde a tu caso, incluido si hace falta reserva o fotografía.', COMMON_CHECK.es] },
          { heading: 'Consejos prácticos', bullets: ['Pregunta cómo y cuándo podrás recoger o recibir la tarjeta.', 'Guarda cualquier recibo o comprobante provisional que te den.', 'Nunca compartas públicamente tu número de registro.'] },
        ],
      },
      ko: {
        title: '외국인등록증',
        summary: '등록, 재발급, 변경 업무 방문을 준비하는 방법.',
        sections: [
          { heading: '필요한 절차 확인', paragraphs: ['외국인등록, 재발급, 등록사항 변경은 서로 다른 절차입니다. 예약이나 사진이 필요한지를 포함해 내 상황에 맞는 절차를 공식 포털에서 확인하세요.', COMMON_CHECK.ko] },
          { heading: '실용 팁', bullets: ['등록증을 언제, 어떻게 받을 수 있는지 물어보세요.', '받은 접수증이나 임시 증명서를 보관하세요.', '외국인등록번호를 공개적으로 공유하지 마세요.'] },
        ],
      },
    },
  },
  {
    slug: 'office-locations',
    lastReviewed: '2026-11-10',
    officialKeys: ['kis', 'contact-center'],
    content: {
      en: {
        title: 'Finding the right office',
        summary: 'Make sure you visit the office that handles your case.',
        sections: [
          { heading: 'Check which office covers you', paragraphs: ['Immigration offices generally handle cases for particular areas. Confirm on the official office directory which office (or branch) handles your registered address before you travel.'] },
          { heading: 'Facility types differ', paragraphs: ['Airport immigration facilities, main offices and branch offices do not necessarily offer the same services. Our directory labels each type, but the official directory is authoritative.'] },
          { heading: 'About our directory', paragraphs: ['Every office record on this site shows its source and the date it was last verified. When a detail is not yet verified, we say so instead of guessing.'] },
        ],
      },
      es: {
        title: 'Encontrar la oficina correcta',
        summary: 'Asegúrate de acudir a la oficina que gestiona tu caso.',
        sections: [
          { heading: 'Comprueba qué oficina te corresponde', paragraphs: ['Las oficinas de inmigración suelen atender casos de zonas concretas. Confirma en el directorio oficial qué oficina (o sucursal) corresponde a tu domicilio registrado antes de desplazarte.'] },
          { heading: 'Los tipos de instalación son distintos', paragraphs: ['Las instalaciones aeroportuarias, las oficinas principales y las sucursales no ofrecen necesariamente los mismos servicios. Nuestro directorio indica cada tipo, pero el directorio oficial es el que prevalece.'] },
          { heading: 'Sobre nuestro directorio', paragraphs: ['Cada ficha de oficina de este sitio muestra su fuente y la fecha de la última verificación. Cuando un dato aún no está verificado, lo indicamos en lugar de suponerlo.'] },
        ],
      },
      ko: {
        title: '관할 관서 찾기',
        summary: '내 업무를 담당하는 관서를 방문하세요.',
        sections: [
          { heading: '관할 관서 확인', paragraphs: ['출입국 관서는 일반적으로 지역별로 업무를 담당합니다. 이동하기 전에 공식 관서 안내에서 등록된 주소지를 관할하는 관서(또는 출장소)를 확인하세요.'] },
          { heading: '시설 유형별 차이', paragraphs: ['공항 출입국 시설, 관서, 출장소가 모두 같은 업무를 제공하는 것은 아닙니다. 이 사이트는 유형을 표시하지만, 공식 안내가 우선합니다.'] },
          { heading: '이 사이트의 관서 정보', paragraphs: ['모든 관서 정보에는 출처와 최종 확인일이 표시됩니다. 아직 확인되지 않은 정보는 추측하지 않고 확인되지 않았다고 표시합니다.'] },
        ],
      },
    },
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
