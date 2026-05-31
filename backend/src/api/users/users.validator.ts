import { z } from 'zod';

// Boş string'i undefined'a çevirerek opsiyonel alanların temizlenmesini kolaylaştırır
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

const optionalUrl = z
  .string()
  .optional()
  .transform((v) => (v === '' ? undefined : v))
  .refine((v) => v === undefined || /^https?:\/\//i.test(v), 'Geçerli bir URL girin');

// Favori içerik öğesi: TMDB referansı (tmdbId + tür)
const favoriteContentItem = z.object({
  tmdbId: z.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

// Profil bilgilerini güncelleme şeması. Tüm alanlar opsiyoneldir; şifre burada yok.
export const updateMeSchema = z.object({
  displayName: optionalText(64),
  bio: optionalText(280),
  location: optionalText(100),
  avatarUrl: optionalUrl,
  language: z.enum(['TR', 'EN']).optional(),
  email: z.string().email('Geçerli bir e-posta girin').optional(),
  username: z
    .string()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalı')
    .max(24)
    .regex(/^[a-z0-9_]+$/, 'Kullanıcı adı sadece küçük harf, rakam ve _ içerebilir')
    .optional(),
  // Profilde öne çıkarılan favoriler (en fazla 4 içerik; oyuncu/yönetmen TMDB id'si).
  // null göndermek ilgili favoriyi temizler.
  favoriteContent: z.array(favoriteContentItem).max(4).optional(),
  favoriteActorId: z.number().int().positive().nullable().optional(),
  favoriteDirectorId: z.number().int().positive().nullable().optional(),
});

// Şifre değiştirme: mevcut şifre + yeni şifre + yeni şifre tekrarı
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre gerekli'),
    newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalı').max(128),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Şifreler eşleşmiyor',
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
