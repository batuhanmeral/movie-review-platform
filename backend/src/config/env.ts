import 'dotenv/config';
import { z } from 'zod';

/**
 * Çevre değişkenlerinin doğrulanması için Zod şeması.
 * Uygulamanın ihtiyaç duyduğu tüm konfigürasyon değişkenlerini tanımlar.
 */
const EnvSchema = z.object({
  // Uygulama çalışma ortamı
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Sunucunun dinleyeceği port
  PORT: z.coerce.number().int().positive().default(4000),
  // Uygulamanın temel URL'i
  APP_URL: z.string().url().default('http://localhost:4000'),
  // CORS politikası için izin verilen kaynak
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Frontend'in temel URL'i — e-postadaki şifre sıfırlama linki buraya işaret eder
  WEB_APP_URL: z.string().url().default('http://localhost:5173'),

  // Veritabanı bağlantı URL'i
  DATABASE_URL: z.string().url(),
  // Redis önbellek sunucusu bağlantı URL'i
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // JWT oluşturma ve doğrulama için gizli anahtarlar ve süreler
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // TMDB API entegrasyonu için gerekli ayarlar
  TMDB_API_KEY: z.string().min(1),
  TMDB_BASE_URL: z.string().url().default('https://api.themoviedb.org/3'),
  TMDB_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),

  // E-posta (SMTP) ayarları. SMTP_HOST boşsa e-postalar gönderilmez, yalnızca
  // loglanır — geliştirme ortamı SMTP sunucusu olmadan da çalışır.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Cinephiles <no-reply@cinephiles.local>'),

  // Şifre sıfırlama bağlantısının geçerlilik süresi (dakika)
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  // Loglama seviyesi
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

// process.env üzerinden gelen değişkenleri doğrula
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Eğer doğrulama başarısız olursa, hataları konsola yazdır ve uygulamayı sonlandır
  console.error('❌ Geçersiz ortam değişkenleri:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// Doğrulanmış ortam değişkenlerini dışa aktar
export const env = parsed.data;
export type Env = typeof env;
