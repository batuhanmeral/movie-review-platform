import { apiClient } from './client';
import type { AuthResponse } from '@/types/auth';

// Yeni kullanıcı kaydı oluşturur ve oturum bilgilerini döner
export async function register(input: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
  return data;
}

// Kullanıcı adı veya e-posta ile giriş yapar ve oturum bilgilerini döner
export async function login(identifier: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', {
    identifier,
    password,
  });
  return data;
}

// Mevcut oturumu sonlandırır (refresh token'ı geçersiz kılar)
export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

// Şifre sıfırlama bağlantısı ister.
// Backend, e-posta kayıtlı olmasa da aynı yanıtı döner (kullanıcı varlığı sızdırılmaz).
export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

// E-postadaki token ile yeni şifreyi belirler.
export async function resetPassword(token: string, password: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, password });
}
