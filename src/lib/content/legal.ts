// Policy documents. STATUS: DRAFT — PENDING LEGAL REVIEW (Korean law incl.
// PIPA, the Information and Communications Network Act and defamation law).
// Spanish and Korean versions are draft translations pending professional
// legal translation; the English version prevails until then.
import type { Locale } from '@/lib/i18n/config';

type Section = { h: string; p?: string[]; ul?: string[] };
export type LegalDoc = { updated: string; sections: Record<Locale, { title: string; intro: string; sections: Section[] }> };
export type LegalSlug = 'privacy' | 'terms' | 'guidelines' | 'moderation';

export const LEGAL: Record<LegalSlug, LegalDoc> = {
  privacy: {
    updated: '2026-11-10',
    sections: {
      en: {
        title: 'Privacy Policy',
        intro: 'Immigration Review Korea ("we") is an independent platform. This policy explains what we collect, why, how long we keep it, and your choices. We collect as little as possible.',
        sections: [
          { h: 'What we collect', ul: [
            'Account: your email address and a securely hashed password. Your email is never shown publicly.',
            'Public profile: a randomly generated pseudonym, which you may change.',
            'Reviews: the office, service type, approximate visit month (never an exact date), ratings and your text, plus its full edit and moderation history.',
            'Verification (optional): evidence you choose to upload or a short description, stored encrypted and separately from your public review.',
            'Security data: keyed hashes of IP addresses (not raw IPs) used for rate limiting and abuse detection; session records.',
            'Reports, appeals and messages you send us.',
          ] },
          { h: 'What we do not do', ul: [
            'We do not use third-party advertising trackers or sell personal data.',
            'We never publish your email, legal name, immigration status, passport or residence card numbers, appointment IDs or verification documents.',
            'We do not ask for immigration documents beyond optional, redacted verification evidence.',
          ] },
          { h: 'Anonymity — what it does and does not mean', p: ['Your public identity is a pseudonym. Anonymity applies to what the public sees. We cannot promise that you are untraceable: we hold your email and security data, and we may be required to disclose information to authorities when legally compelled. Where lawful, we will tell you before doing so.'] },
          { h: 'Verification evidence', ul: [
            'Images are re-encoded to remove metadata (such as GPS location); original filenames are discarded.',
            'Files are encrypted (AES-256-GCM) in private storage that is never publicly accessible.',
            'Only authorised verification reviewers can open evidence; every access is logged.',
            'Evidence is deleted after the retention period following a decision (currently 30 days — pending legal approval), or immediately on request or account deletion.',
          ] },
          { h: 'Retention', ul: [
            'Account data: until you delete your account.',
            'Published reviews: until removed by you or by moderation. If you delete your account you can choose to delete your reviews or keep them under "Former member".',
            'Moderation, report and audit records: retained as needed to handle disputes and legal obligations (period pending legal approval).',
          ] },
          { h: 'Your rights', p: ['You can access, correct and delete your data from your account page, change your pseudonym, delete verification evidence at any time, and contact us with any data request. You may also have rights under the Personal Information Protection Act of Korea and other applicable laws.'] },
          { h: 'Contact', p: ['Use the contact page and choose "Data or deletion request". A data protection contact will be designated before public launch (pending).'] },
        ],
      },
      es: {
        title: 'Política de privacidad',
        intro: 'Immigration Review Korea («nosotros») es una plataforma independiente. Esta política explica qué recopilamos, para qué, cuánto tiempo lo conservamos y qué opciones tienes. Recopilamos lo mínimo posible.',
        sections: [
          { h: 'Qué recopilamos', ul: [
            'Cuenta: tu correo electrónico y una contraseña cifrada de forma segura. Tu correo nunca se muestra públicamente.',
            'Perfil público: un seudónimo generado al azar que puedes cambiar.',
            'Reseñas: la oficina, el tipo de trámite, el mes aproximado de la visita (nunca la fecha exacta), las valoraciones y tu texto, además de su historial de ediciones y moderación.',
            'Verificación (opcional): las pruebas que decidas subir o una breve descripción, cifradas y guardadas por separado de tu reseña pública.',
            'Datos de seguridad: hashes con clave de direcciones IP (no las IP en bruto) para limitar abusos; registros de sesión.',
            'Denuncias, apelaciones y mensajes que nos envíes.',
          ] },
          { h: 'Lo que no hacemos', ul: [
            'No usamos rastreadores publicitarios de terceros ni vendemos datos personales.',
            'Nunca publicamos tu correo, nombre legal, estatus migratorio, números de pasaporte o tarjeta de residencia, identificadores de cita ni documentos de verificación.',
            'No pedimos documentos de inmigración, salvo pruebas de verificación opcionales y con datos tapados.',
          ] },
          { h: 'Anonimato: qué significa y qué no', p: ['Tu identidad pública es un seudónimo. El anonimato se refiere a lo que ve el público. No podemos prometer que seas imposible de rastrear: conservamos tu correo y datos de seguridad, y podemos estar obligados a revelar información a las autoridades cuando la ley lo exija. Cuando sea legal, te avisaremos antes.'] },
          { h: 'Pruebas de verificación', ul: [
            'Las imágenes se vuelven a codificar para eliminar metadatos (como la ubicación GPS); el nombre original del archivo se descarta.',
            'Los archivos se cifran (AES-256-GCM) en un almacenamiento privado nunca accesible públicamente.',
            'Solo los revisores de verificación autorizados pueden abrirlas; cada acceso queda registrado.',
            'Las pruebas se eliminan tras el periodo de conservación posterior a la decisión (actualmente 30 días, pendiente de aprobación legal), o de inmediato si lo solicitas o eliminas tu cuenta.',
          ] },
          { h: 'Conservación', ul: [
            'Datos de la cuenta: hasta que elimines tu cuenta.',
            'Reseñas publicadas: hasta que las retires tú o la moderación. Al eliminar tu cuenta puedes elegir borrarlas o mantenerlas como «Antiguo miembro».',
            'Registros de moderación, denuncias y auditoría: el tiempo necesario para gestionar disputas y obligaciones legales (plazo pendiente de aprobación legal).',
          ] },
          { h: 'Tus derechos', p: ['Puedes acceder, corregir y eliminar tus datos desde tu cuenta, cambiar tu seudónimo, borrar tus pruebas de verificación en cualquier momento y contactarnos para cualquier solicitud. También puedes tener derechos según la Ley de Protección de Información Personal de Corea y otras leyes aplicables.'] },
          { h: 'Contacto', p: ['Usa la página de contacto y elige «Solicitud sobre datos o eliminación». Antes del lanzamiento público se designará un responsable de protección de datos (pendiente).'] },
        ],
      },
      ko: {
        title: '개인정보처리방침',
        intro: 'Immigration Review Korea(이하 "당사")는 독립 플랫폼입니다. 이 방침은 당사가 수집하는 정보, 수집 목적, 보관 기간, 이용자의 선택권을 설명합니다. 당사는 최소한의 정보만 수집합니다.',
        sections: [
          { h: '수집하는 정보', ul: [
            '계정: 이메일 주소와 안전하게 해시 처리된 비밀번호. 이메일은 절대 공개되지 않습니다.',
            '공개 프로필: 무작위로 생성되며 변경할 수 있는 가명.',
            '후기: 관서, 업무 유형, 대략적인 방문 월(정확한 날짜는 수집하지 않음), 평점, 본문과 그 수정·검토 이력.',
            '방문 확인(선택): 직접 올린 증빙 또는 간단한 설명. 암호화되어 공개 후기와 분리 보관됩니다.',
            '보안 정보: 요청 제한과 악용 탐지를 위한 IP 주소의 키 해시값(원본 IP 아님), 세션 기록.',
            '이용자가 보낸 신고, 이의 신청, 문의.',
          ] },
          { h: '하지 않는 일', ul: [
            '제3자 광고 추적 도구를 사용하지 않으며 개인정보를 판매하지 않습니다.',
            '이메일, 실명, 체류자격, 여권·외국인등록번호, 예약 번호, 방문 확인 자료를 절대 공개하지 않습니다.',
            '개인정보를 가린 선택적 방문 확인 자료 외에 출입국 서류를 요구하지 않습니다.',
          ] },
          { h: '익명성의 의미와 한계', p: ['공개 신원은 가명입니다. 익명성은 공개적으로 보이는 정보에 적용됩니다. 당사는 이메일과 보안 정보를 보관하므로 추적이 불가능하다고 약속할 수 없으며, 법적으로 요구되는 경우 수사기관 등에 정보를 제공할 수 있습니다. 법적으로 허용되는 경우 사전에 알려드립니다.'] },
          { h: '방문 확인 자료', ul: [
            '이미지는 다시 인코딩하여 위치 정보 등 메타데이터를 제거하며 원본 파일명은 저장하지 않습니다.',
            '파일은 외부에서 접근할 수 없는 비공개 저장소에 암호화(AES-256-GCM)되어 보관됩니다.',
            '권한이 있는 확인 담당자만 열람할 수 있으며 모든 열람이 기록됩니다.',
            '결정 후 보관 기간(현재 30일, 법률 검토 승인 대기)이 지나면 삭제되며, 요청하거나 계정을 삭제하면 즉시 삭제됩니다.',
          ] },
          { h: '보관 기간', ul: [
            '계정 정보: 계정 삭제 시까지.',
            '게시된 후기: 본인 또는 검토에 의해 삭제될 때까지. 계정 삭제 시 후기를 함께 삭제하거나 "탈퇴한 회원"으로 유지할 수 있습니다.',
            '검토·신고·감사 기록: 분쟁 처리와 법적 의무 이행에 필요한 기간 동안 보관(기간은 법률 검토 승인 대기).',
          ] },
          { h: '이용자의 권리', p: ['내 계정에서 정보를 열람·정정·삭제하고, 가명을 변경하고, 방문 확인 자료를 언제든 삭제할 수 있으며, 개인정보 관련 요청을 보낼 수 있습니다. 개인정보 보호법 등 관련 법령에 따른 권리도 행사할 수 있습니다.'] },
          { h: '문의', p: ['문의하기 페이지에서 "개인정보 또는 삭제 요청"을 선택하세요. 정식 출시 전에 개인정보 보호책임자를 지정할 예정입니다(대기 중).'] },
        ],
      },
    },
  },
  terms: {
    updated: '2026-11-10',
    sections: {
      en: {
        title: 'Terms of Service',
        intro: 'By using Immigration Review Korea you agree to these terms. The platform is in limited beta.',
        sections: [
          { h: 'Independent information, not advice', p: ['We are not affiliated with the Korea Immigration Service or any government agency. Content on this site is not legal or immigration advice. Official requirements must be confirmed with official sources.'] },
          { h: 'Your account', ul: ['You must provide a working email address and keep your password secure.', 'One person, one account. Do not create accounts to manipulate ratings.', 'You may delete your account at any time.'] },
          { h: 'Your content', ul: ['Only describe your own genuine experience.', 'Follow the Community Guidelines.', 'You keep ownership of your reviews and grant us a non-exclusive licence to display, translate and moderate them on the platform.', 'Submission does not guarantee publication.'] },
          { h: 'Prohibited use', ul: ['Fake, paid or coordinated reviews.', 'Publishing personal information about anyone.', 'Attempting to access other accounts, private data or the administration area.', 'Automated scraping that burdens the service.'] },
          { h: 'Independence', p: ['No one can pay to remove legitimate reviews or improve ratings. Any future commercial content will be clearly labelled and separated from reviews.'] },
          { h: 'Liability', p: ['The service is provided as is during the beta. Reviews reflect the views of their authors, not ours. (Limitation of liability wording pending legal review.)'] },
        ],
      },
      es: {
        title: 'Condiciones del servicio',
        intro: 'Al usar Immigration Review Korea aceptas estas condiciones. La plataforma está en beta limitada.',
        sections: [
          { h: 'Información independiente, no asesoramiento', p: ['No estamos afiliados al Servicio de Inmigración de Corea ni a ninguna agencia gubernamental. El contenido de este sitio no es asesoramiento legal ni migratorio. Los requisitos oficiales deben confirmarse en fuentes oficiales.'] },
          { h: 'Tu cuenta', ul: ['Debes usar un correo válido y mantener segura tu contraseña.', 'Una persona, una cuenta. No crees cuentas para manipular valoraciones.', 'Puedes eliminar tu cuenta en cualquier momento.'] },
          { h: 'Tu contenido', ul: ['Describe solo tu propia experiencia real.', 'Cumple las Normas de la comunidad.', 'Conservas la titularidad de tus reseñas y nos concedes una licencia no exclusiva para mostrarlas, traducirlas y moderarlas en la plataforma.', 'Enviar una reseña no garantiza su publicación.'] },
          { h: 'Usos prohibidos', ul: ['Reseñas falsas, pagadas o coordinadas.', 'Publicar información personal de cualquier persona.', 'Intentar acceder a otras cuentas, datos privados o al área de administración.', 'Extracción automatizada que sobrecargue el servicio.'] },
          { h: 'Independencia', p: ['Nadie puede pagar para eliminar reseñas legítimas ni mejorar valoraciones. Cualquier contenido comercial futuro estará claramente identificado y separado de las reseñas.'] },
          { h: 'Responsabilidad', p: ['Durante la beta, el servicio se ofrece tal cual. Las reseñas reflejan la opinión de sus autores, no la nuestra. (Cláusula de limitación de responsabilidad pendiente de revisión legal).'] },
        ],
      },
      ko: {
        title: '이용약관',
        intro: 'Immigration Review Korea를 이용하면 본 약관에 동의하는 것으로 봅니다. 현재 플랫폼은 제한적 베타 단계입니다.',
        sections: [
          { h: '독립 정보이며 자문이 아님', p: ['당사는 출입국·외국인정책본부나 어떤 정부 기관과도 관련이 없습니다. 이 사이트의 내용은 법률 또는 출입국 자문이 아닙니다. 공식 요건은 공식 출처에서 확인해야 합니다.'] },
          { h: '계정', ul: ['사용 가능한 이메일 주소를 제공하고 비밀번호를 안전하게 관리해야 합니다.', '1인 1계정. 평점을 조작하기 위해 계정을 만들지 마세요.', '언제든 계정을 삭제할 수 있습니다.'] },
          { h: '이용자 콘텐츠', ul: ['본인의 실제 경험만 작성하세요.', '커뮤니티 가이드라인을 준수하세요.', '후기의 권리는 작성자에게 있으며, 당사에 플랫폼 내 게시·번역·검토를 위한 비독점적 이용 권한을 부여합니다.', '제출한다고 해서 게시가 보장되지는 않습니다.'] },
          { h: '금지 행위', ul: ['허위, 유료 또는 조직적인 후기.', '타인의 개인정보 게시.', '다른 계정, 비공개 정보 또는 관리자 영역에 접근하려는 시도.', '서비스에 부담을 주는 자동 수집.'] },
          { h: '독립성', p: ['누구도 돈을 내고 정당한 후기를 삭제하거나 평점을 올릴 수 없습니다. 향후 상업 콘텐츠가 있다면 명확히 표시하고 후기와 분리합니다.'] },
          { h: '책임', p: ['베타 기간 동안 서비스는 현 상태로 제공됩니다. 후기는 작성자의 의견이며 당사의 의견이 아닙니다. (책임 제한 조항은 법률 검토 대기 중)'] },
        ],
      },
    },
  },
  guidelines: {
    updated: '2026-11-10',
    sections: {
      en: {
        title: 'Community Guidelines',
        intro: 'Reviews exist to help the next visitor prepare. Write the review you would have wanted to read before your visit.',
        sections: [
          { h: 'Do', ul: ['Describe what happened: waiting time, clarity of explanations, accessibility, how the process worked.', 'Be specific about the service and the approximate month.', 'Be fair: mention what went well as well as what could improve.', 'Rate the office and the service experience — not individual people.'] },
          { h: 'Do not', ul: ['Name or identify individual employees (including descriptions like "the officer at counter 5").', 'Include anyone\'s contact details, passport or residence card numbers, application or reference numbers.', 'Post threats, harassment, hate speech or insults.', 'Make allegations of criminal conduct you cannot support. Describe what you experienced, not conclusions.', 'Post fake, paid, incentivised or duplicate reviews, or reviews of visits you did not make.'] },
          { h: 'Serious concerns', p: ['If you believe something unlawful happened, report it to the appropriate official channels. A review is not a substitute for a formal complaint.'] },
        ],
      },
      es: {
        title: 'Normas de la comunidad',
        intro: 'Las reseñas existen para ayudar a la siguiente persona a prepararse. Escribe la reseña que te habría gustado leer antes de tu visita.',
        sections: [
          { h: 'Sí', ul: ['Describe lo que ocurrió: tiempo de espera, claridad de las explicaciones, accesibilidad, cómo funcionó el proceso.', 'Indica el trámite y el mes aproximado.', 'Sé justo/a: menciona lo que salió bien y lo que podría mejorar.', 'Valora la oficina y la experiencia del servicio, no a personas concretas.'] },
          { h: 'No', ul: ['Nombres o identifiques a empleados concretos (incluidas descripciones como «el funcionario de la ventanilla 5»).', 'Incluyas datos de contacto, números de pasaporte o de tarjeta de residencia, ni números de solicitud o referencia de nadie.', 'Publiques amenazas, acoso, discurso de odio o insultos.', 'Hagas acusaciones de delitos que no puedas respaldar. Describe lo que viviste, no conclusiones.', 'Publiques reseñas falsas, pagadas, incentivadas, duplicadas o de visitas que no hiciste.'] },
          { h: 'Problemas graves', p: ['Si crees que ocurrió algo ilegal, denúncialo por los canales oficiales correspondientes. Una reseña no sustituye a una queja formal.'] },
        ],
      },
      ko: {
        title: '커뮤니티 가이드라인',
        intro: '후기는 다음 방문자의 준비를 돕기 위한 것입니다. 방문 전에 읽고 싶었던 후기를 써 주세요.',
        sections: [
          { h: '권장', ul: ['대기 시간, 안내의 명확성, 접근성, 절차 진행 등 실제로 있었던 일을 설명하세요.', '업무와 대략적인 방문 월을 구체적으로 적어 주세요.', '좋았던 점과 개선이 필요한 점을 공정하게 적어 주세요.', '개인이 아니라 관서와 서비스 경험을 평가하세요.'] },
          { h: '금지', ul: ['특정 직원의 이름이나 신원을 드러내는 내용("5번 창구 직원" 같은 묘사 포함).', '타인의 연락처, 여권·외국인등록번호, 신청·접수 번호.', '위협, 괴롭힘, 혐오 표현, 모욕.', '근거를 제시할 수 없는 범죄 행위 주장. 결론이 아니라 경험한 일을 적어 주세요.', '허위, 유료, 대가성, 중복 후기 또는 방문하지 않은 곳에 대한 후기.'] },
          { h: '중대한 문제', p: ['불법 행위가 있었다고 생각되면 해당 공식 창구에 신고하세요. 후기는 공식 민원을 대신하지 않습니다.'] },
        ],
      },
    },
  },
  moderation: {
    updated: '2026-11-10',
    sections: {
      en: {
        title: 'Moderation Policy',
        intro: 'Every review is screened before publication. This page explains how decisions are made and how to challenge them.',
        sections: [
          { h: 'Automated screening', p: ['Software flags possible personal information, employee names, threats, harassment and serious allegations for human attention. It never decides whether an allegation is true, and it never publishes or rejects a review by itself.'] },
          { h: 'Possible outcomes', ul: ['Approved — published.', 'Needs clarification — we ask the author to edit.', 'Escalated for legal review — a potentially unlawful or high-risk review is assessed further.', 'Rejected — not published, with a recorded reason.', 'Temporarily hidden — removed from view while an issue is resolved.', 'Removed — taken down, with a recorded reason.'] },
          { h: 'Redaction', p: ['Moderators may replace identifying passages with "[redacted]" rather than reject a whole review. Readers are told when a review has been redacted. The original remains in a restricted internal history.'] },
          { h: 'Reports and complaints', p: ['Anyone can report a review. A report — including a complaint from an institution — does not automatically remove a review; a person assesses it. Reporters\' identities are never shared with authors.'] },
          { h: 'Right of reply', p: ['Institutions and affected parties may request to publish a response beneath a review through the complaints page.'] },
          { h: 'Appeals', p: ['Authors, reporters and verification applicants can appeal decisions. Where possible, a different moderator reviews the appeal.'] },
          { h: 'Records', p: ['Every moderation decision is recorded with a reason in an audit log with restricted access. Moderators do not have access to verification evidence or account email addresses.'] },
        ],
      },
      es: {
        title: 'Política de moderación',
        intro: 'Cada reseña se revisa antes de publicarse. Esta página explica cómo se toman las decisiones y cómo impugnarlas.',
        sections: [
          { h: 'Revisión automática', p: ['Un software señala posible información personal, nombres de empleados, amenazas, acoso y acusaciones graves para que las revise una persona. Nunca decide si una acusación es cierta y nunca publica ni rechaza una reseña por sí solo.'] },
          { h: 'Resultados posibles', ul: ['Aprobada: publicada.', 'Necesita aclaración: pedimos a la persona autora que la edite.', 'Escalada a revisión legal: se analiza con más detalle una reseña potencialmente ilegal o de alto riesgo.', 'Rechazada: no se publica, con un motivo registrado.', 'Oculta temporalmente: se retira de la vista mientras se resuelve un problema.', 'Eliminada: retirada, con un motivo registrado.'] },
          { h: 'Ocultación de fragmentos', p: ['Los moderadores pueden sustituir fragmentos identificativos por «[oculto]» en lugar de rechazar toda la reseña. Se informa a los lectores cuando una reseña se ha editado así. El original se conserva en un historial interno restringido.'] },
          { h: 'Denuncias y reclamaciones', p: ['Cualquiera puede denunciar una reseña. Una denuncia, incluida la reclamación de una institución, no elimina automáticamente una reseña; la evalúa una persona. La identidad de quien denuncia nunca se comparte con la persona autora.'] },
          { h: 'Derecho de réplica', p: ['Las instituciones y las partes afectadas pueden solicitar publicar una respuesta bajo una reseña a través de la página de reclamaciones.'] },
          { h: 'Apelaciones', p: ['Autores, denunciantes y solicitantes de verificación pueden apelar las decisiones. Siempre que sea posible, revisa la apelación otro moderador.'] },
          { h: 'Registros', p: ['Cada decisión de moderación se registra con su motivo en un registro de auditoría de acceso restringido. Los moderadores no tienen acceso a las pruebas de verificación ni a los correos de las cuentas.'] },
        ],
      },
      ko: {
        title: '검토 정책',
        intro: '모든 후기는 게시 전에 검토됩니다. 이 페이지는 결정 방식과 이의 제기 방법을 설명합니다.',
        sections: [
          { h: '자동 검사', p: ['소프트웨어가 개인정보, 직원 이름, 위협, 괴롭힘, 중대한 의혹 제기로 보이는 부분을 표시해 사람이 확인하도록 합니다. 의혹의 진위를 판단하지 않으며, 스스로 후기를 게시하거나 반려하지 않습니다.'] },
          { h: '가능한 결과', ul: ['승인 — 게시됨.', '추가 설명 필요 — 작성자에게 수정을 요청합니다.', '법률 검토 이관 — 위법 소지나 위험이 높은 후기를 추가로 검토합니다.', '반려 — 사유를 기록하고 게시하지 않습니다.', '일시 숨김 — 문제가 해결될 때까지 보이지 않게 합니다.', '삭제 — 사유를 기록하고 내립니다.'] },
          { h: '가리기', p: ['검토자는 후기 전체를 반려하는 대신 식별 가능한 문구를 "[가려짐]"으로 바꿀 수 있습니다. 가려진 후기에는 그 사실이 표시됩니다. 원문은 접근이 제한된 내부 이력에 보관됩니다.'] },
          { h: '신고와 민원', p: ['누구나 후기를 신고할 수 있습니다. 기관의 민원을 포함한 신고만으로 후기가 자동 삭제되지 않으며, 담당자가 직접 검토합니다. 신고자의 신원은 작성자에게 공개되지 않습니다.'] },
          { h: '반론권', p: ['기관과 이해 당사자는 민원 페이지를 통해 후기 아래에 답변 게시를 요청할 수 있습니다.'] },
          { h: '이의 신청', p: ['작성자, 신고자, 방문 확인 신청자는 결정에 이의를 신청할 수 있습니다. 가능한 경우 다른 검토자가 이의 신청을 검토합니다.'] },
          { h: '기록', p: ['모든 검토 결정은 사유와 함께 접근이 제한된 감사 로그에 기록됩니다. 검토자는 방문 확인 자료나 계정 이메일에 접근할 수 없습니다.'] },
        ],
      },
    },
  },
};
