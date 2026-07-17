import { z } from 'zod';

// Kullanıcı kayıt (register) işlemi için giriş verisi doğrulama şeması.
export const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta gerekli'),
  username: z
    .string()
    .min(3, 'Kullanıcı adı en az 3 karakter')
    .max(24, 'Kullanıcı adı en fazla 24 karakter')
    .regex(/^[a-z0-9_]+$/, 'Sadece küçük harf, rakam ve _ kullanılabilir'),
  password: z.string().min(8, 'Şifre en az 8 karakter').max(128, 'Şifre çok uzun'),
  displayName: z.string().min(1).max(64).optional(),
});

// Kullanıcı giriş (login) işlemi için giriş verisi doğrulama şeması.
export const loginSchema = z.object({
  identifier: z.string().min(1, 'E-posta veya kullanıcı adı gerekli'),
  password: z.string().min(1, 'Şifre gerekli'),
});

// Oturum yenileme (refresh) işlemi için giriş verisi doğrulama şeması.
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// Şifre sıfırlama talebi: yalnızca e-posta adresi.
export const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta gerekli'),
});

// Şifre sıfırlama: e-postayla gelen token + yeni şifre.
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Sıfırlama kodu gerekli'),
  password: z.string().min(8, 'Şifre en az 8 karakter').max(128, 'Şifre çok uzun'),
});

// Zod şemalarından TypeScript tiplerinin çıkarılması
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
