import { z } from 'zod';

// Ortak sayfalama + arama parametreleri
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).optional(),
});

// Kullanıcı listesi sorgusu (arama + rol/askı filtresi)
export const usersQuerySchema = listQuerySchema.extend({
  role: z.enum(['USER', 'ADMIN']).optional(),
  suspended: z.enum(['true', 'false']).optional(),
});

// İçerik listesi sorgusu
export const contentQuerySchema = listQuerySchema;

// Rapor (moderasyon) listesi sorgusu
export const reportsQuerySchema = listQuerySchema.extend({
  status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']).optional(),
});

// Denetim kaydı listesi sorgusu
export const auditQuerySchema = listQuerySchema;

// Rol güncelleme gövdesi — enum dışı değerleri reddeder
export const updateRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

// Askıya alma / kaldırma gövdesi
export const suspendSchema = z.object({
  suspended: z.boolean(),
});

// Rapor durumu güncelleme gövdesi (PENDING dışına taşır)
export const reportActionSchema = z.object({
  status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
});

// Duyuru gövdesi
export const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Başlık boş olamaz').max(120),
  body: z.string().trim().min(1, 'İçerik boş olamaz').max(2000),
});

// Toplu kullanıcı işlemi gövdesi
export const bulkUsersSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  action: z.enum(['suspend', 'unsuspend']),
});

// Toplu içerik silme gövdesi
export const bulkContentSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export type UsersQuery = z.infer<typeof usersQuerySchema>;
export type ContentQuery = z.infer<typeof contentQuerySchema>;
export type ReportsQuery = z.infer<typeof reportsQuerySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type SuspendInput = z.infer<typeof suspendSchema>;
export type ReportActionInput = z.infer<typeof reportActionSchema>;
export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type BulkUsersInput = z.infer<typeof bulkUsersSchema>;
export type BulkContentInput = z.infer<typeof bulkContentSchema>;
