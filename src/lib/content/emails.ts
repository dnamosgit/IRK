import type { Locale } from '@/lib/i18n/config';

type Tpl = { subject: string; text: (link: string) => string };

export const EMAILS: Record<'verify' | 'reset' | 'published' | 'clarification' | 'decision', Record<Locale, Tpl>> = {
  verify: {
    en: { subject: 'Confirm your email — Immigration Review Korea', text: (l) => `Confirm your email address to start sharing experiences:\n\n${l}\n\nThis link expires in 24 hours. If you did not create an account, ignore this message.` },
    es: { subject: 'Confirma tu correo — Immigration Review Korea', text: (l) => `Confirma tu dirección de correo para empezar a compartir experiencias:\n\n${l}\n\nEste enlace caduca en 24 horas. Si no creaste una cuenta, ignora este mensaje.` },
    ko: { subject: '이메일 인증 — Immigration Review Korea', text: (l) => `아래 링크를 눌러 이메일 주소를 인증해 주세요:\n\n${l}\n\n링크는 24시간 후 만료됩니다. 계정을 만들지 않으셨다면 이 메일을 무시하세요.` },
  },
  reset: {
    en: { subject: 'Reset your password — Immigration Review Korea', text: (l) => `Use this link to choose a new password:\n\n${l}\n\nThe link expires in 1 hour. If you did not request this, you can ignore this email.` },
    es: { subject: 'Restablece tu contraseña — Immigration Review Korea', text: (l) => `Usa este enlace para elegir una nueva contraseña:\n\n${l}\n\nEl enlace caduca en 1 hora. Si no lo solicitaste, ignora este correo.` },
    ko: { subject: '비밀번호 재설정 — Immigration Review Korea', text: (l) => `아래 링크에서 새 비밀번호를 설정하세요:\n\n${l}\n\n링크는 1시간 후 만료됩니다. 요청하지 않으셨다면 이 메일을 무시하세요.` },
  },
  published: {
    en: { subject: 'Your review was published', text: (l) => `Thank you. Your review is now published:\n\n${l}` },
    es: { subject: 'Tu reseña se ha publicado', text: (l) => `Gracias. Tu reseña ya está publicada:\n\n${l}` },
    ko: { subject: '후기가 게시되었습니다', text: (l) => `감사합니다. 후기가 게시되었습니다:\n\n${l}` },
  },
  clarification: {
    en: { subject: 'Moderators need clarification on your review', text: (l) => `Our moderators have a question about your review. Please read the message in your account and edit your review:\n\n${l}` },
    es: { subject: 'Los moderadores necesitan una aclaración sobre tu reseña', text: (l) => `Nuestros moderadores tienen una pregunta sobre tu reseña. Lee el mensaje en tu cuenta y edita tu reseña:\n\n${l}` },
    ko: { subject: '후기에 대한 추가 설명이 필요합니다', text: (l) => `검토자가 후기에 대해 질문을 남겼습니다. 내 계정에서 메시지를 확인하고 후기를 수정해 주세요:\n\n${l}` },
  },
  decision: {
    en: { subject: 'Update on your review', text: (l) => `There is an update on the status of your review. Details and appeal options are in your account:\n\n${l}` },
    es: { subject: 'Actualización sobre tu reseña', text: (l) => `Hay una actualización sobre el estado de tu reseña. Encontrarás los detalles y las opciones de apelación en tu cuenta:\n\n${l}` },
    ko: { subject: '후기 상태 안내', text: (l) => `후기 상태가 변경되었습니다. 자세한 내용과 이의 신청 방법은 내 계정에서 확인하세요:\n\n${l}` },
  },
};
