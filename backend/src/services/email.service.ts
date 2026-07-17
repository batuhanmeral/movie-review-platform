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
