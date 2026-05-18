import { z } from 'zod';

// Giriş formu için Zod doğrulama şeması
// identifier: Kullanıcı adı veya e-posta adresi (zorunlu)
// password: Şifre (zorunlu)
export const loginSchema = z.object({
  identifier: z.string().min(1, 'auth.errors.identifierRequired'),
  password: z.string().min(1, 'auth.errors.passwordRequired'),
});

// Kayıt formu için Zod doğrulama şeması
// Tüm alanlar i18n çeviri anahtarlarıyla hata mesajları içerir
export const registerSchema = z.object({
  email: z.string().email('auth.errors.emailInvalid'),
  username: z
    .string()
    .min(3, 'auth.errors.usernameShort')
    .max(24, 'auth.errors.usernameLong')
    .regex(/^[a-z0-9_]+$/, 'auth.errors.usernamePattern'), // Sadece küçük harf, rakam ve alt çizgi
  password: z.string().min(8, 'auth.errors.passwordShort').max(128, 'auth.errors.passwordLong'),
  displayName: z.string().min(1).max(64).optional().or(z.literal('')), // Opsiyonel görünen ad
});

// Şema tiplerinden TypeScript arayüzleri türet
export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
