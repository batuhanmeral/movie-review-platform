import { z } from 'zod';

// Liste öğelerini yeniden sıralama gövdesi: her öğenin id'si ve yeni pozisyonu
export const reorderItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(0),
      }),
    )
    .min(1, 'En az bir öğe gerekli'),
});

export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;

// Yeni CUSTOM liste oluşturma gövdesi (tür her zaman CUSTOM, sunucuda atanır)
export const createListSchema = z.object({
  title: z.string().trim().min(1, 'Başlık gerekli').max(100),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional().default('PRIVATE'),
});

export type CreateListInput = z.infer<typeof createListSchema>;

// Liste güncelleme gövdesi; tüm alanlar opsiyonel
export const updateListSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

export type UpdateListInput = z.infer<typeof updateListSchema>;

// Listeye içerik ekleme gövdesi: TMDB referansı + opsiyonel not.
// İçerik DB'de yoksa TMDB'den çekilip Content tablosuna eklenir (language gerekli).
export const addItemSchema = z.object({
  tmdbId: z.number().int().positive(),
  type: z.enum(['movie', 'tv']),
  note: z.string().max(500).nullable().optional(),
  language: z.enum(['tr-TR', 'en-US']).optional().default('tr-TR'),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
