import axios, { type AxiosError } from 'axios';

// Backend hata yanıtının gövde şekli: { error: { message: string } }
interface ApiErrorBody {
  error?: { message?: string };
}

// Bir axios/bilinmeyen hatadan kullanıcıya gösterilecek mesajı güvenle çıkarır.
// Sunucu bir mesaj döndürmezse verilen yedek (fallback) metni döner.
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err as AxiosError<ApiErrorBody>).response?.data?.error?.message;
    if (message) return message;
  }
  return fallback;
}
