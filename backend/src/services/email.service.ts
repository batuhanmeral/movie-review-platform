import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Gönderilecek tek bir e-posta iletisi
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Transporter maliyetli bir nesne; ilk kullanımda oluşturulup yeniden kullanılır.
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/**
 * E-posta gönderir.
 *
 * SMTP_HOST tanımlı değilse gerçek gönderim yapılmaz; ileti log'a yazılır.
 * Böylece geliştirme ve test ortamları bir SMTP sunucusu olmadan da çalışır,
 * sıfırlama linki de terminalden okunabilir.
 *
 * Gönderim hataları yukarı fırlatılmaz: e-posta altyapısındaki bir arıza,
 * onu tetikleyen isteği (ör. şifre sıfırlama talebi) başarısız kılmamalı.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (!env.SMTP_HOST) {
    logger.info(
      { to: message.to, subject: message.subject, body: message.text },
      '📧 SMTP yapılandırılmamış — e-posta gönderilmedi, içerik loglandı',
    );
    return;
  }

  try {
    await getTransporter().sendMail({ from: env.MAIL_FROM, ...message });
    logger.info({ to: message.to, subject: message.subject }, 'E-posta gönderildi');
  } catch (err) {
    logger.error({ err, to: message.to }, 'E-posta gönderilemedi');
  }
}

// Arayüz metinleri kullanıcının tercih ettiği dilde gönderilir.
type MailLang = 'TR' | 'EN';

const passwordResetCopy = {
  TR: {
    subject: 'Cinephiles — şifre sıfırlama',
    heading: 'Şifreni sıfırla',
    intro: 'Hesabın için bir şifre sıfırlama talebi aldık.',
    action: 'Yeni şifre belirle',
    expiry: (minutes: number) => `Bu bağlantı ${minutes} dakika boyunca geçerlidir.`,
    ignore: 'Bu talebi sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.',
    fallback: 'Buton çalışmıyorsa bu adresi tarayıcına yapıştır:',
  },
  EN: {
    subject: 'Cinephiles — password reset',
    heading: 'Reset your password',
    intro: 'We received a request to reset the password for your account.',
    action: 'Choose a new password',
    expiry: (minutes: number) => `This link is valid for ${minutes} minutes.`,
    ignore: "If you didn't request this, you can ignore this email — your password stays the same.",
    fallback: "If the button doesn't work, paste this address into your browser:",
  },
} satisfies Record<MailLang, Record<string, unknown>>;

// Şifre sıfırlama e-postasını kullanıcının diline göre hazırlar ve gönderir.
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  language: MailLang = 'TR',
): Promise<void> {
  const copy = passwordResetCopy[language];
  const minutes = env.PASSWORD_RESET_TTL_MINUTES;

  const text = [
    copy.heading,
    '',
    copy.intro,
    resetUrl,
    '',
    copy.expiry(minutes),
    copy.ignore,
  ].join('\n');

  const html = `<!doctype html>
<html lang="${language.toLowerCase()}">
  <body style="margin:0;padding:24px;background:#0f1115;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#e7e9ee">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#171a21;border-radius:12px;padding:32px">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;color:#ffffff">${copy.heading}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#b6bcc8">${copy.intro}</p>
        <p style="margin:0 0 24px">
          <a href="${resetUrl}" style="display:inline-block;background:#e0b74c;color:#161920;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px">${copy.action}</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#8b92a0">${copy.expiry(minutes)}</p>
        <p style="margin:0 0 24px;font-size:13px;color:#8b92a0">${copy.ignore}</p>
        <p style="margin:0;font-size:12px;color:#6b7280">${copy.fallback}<br />
          <a href="${resetUrl}" style="color:#e0b74c;word-break:break-all">${resetUrl}</a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  await sendMail({ to, subject: copy.subject, text, html });
}
