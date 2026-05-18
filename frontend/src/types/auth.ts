// Kullanıcının tercih ettiği dil
export type Language = 'TR' | 'EN';
// Kullanıcı yetki rolü
export type Role = 'USER' | 'ADMIN';

// Oturum açmış kullanıcının profil bilgileri
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;  // Görünen ad (opsiyonel)
  bio: string | null;          // Kullanıcı biyografisi
  avatarUrl: string | null;    // Profil fotoğrafı URL'i
  location: string | null;     // Konum bilgisi
  language: Language;           // Tercih edilen dil
  role: Role;                   // Kullanıcı rolü (USER veya ADMIN)
  createdAt: string;            // Hesap oluşturulma tarihi
}

// Giriş veya kayıt işlemi sonrası dönen yanıt
// Kullanıcı bilgileri ve JWT token çifti içerir
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;   // Kısa ömürlü erişim token'ı
  refreshToken: string;  // Uzun ömürlü yenileme token'ı
}
