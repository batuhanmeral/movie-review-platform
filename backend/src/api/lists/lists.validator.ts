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
