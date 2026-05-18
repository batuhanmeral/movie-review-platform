import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth/authStore';

// Backend API ile iletişim kurmak için yapılandırılmış Axios istemcisi
// Temel URL ve zaman aşımı ayarlarını içerir
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  timeout: 15_000, // 15 saniye zaman aşımı
});

// İstek interceptor'ı: Her API çağrısına otomatik olarak Authorization header'ı ekler
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  // Token mevcutsa ve henüz header ayarlanmadıysa ekle
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Eşzamanlı birden fazla 401 hatası geldiğinde tek bir refresh isteği atmak için paylaşılan promise
let refreshPromise: Promise<string | null> | null = null;

// Refresh token kullanarak yeni bir Access Token almayı dener
// Başarısızlık durumunda oturumu temizler
async function performRefresh(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
      refreshToken,
    });
    // Yeni token bilgilerini store'a kaydet
    useAuthStore.getState().setSession(data);
    return data.accessToken as string;
  } catch {
    // Refresh başarısızsa oturumu tamamen temizle
    useAuthStore.getState().clear();
    return null;
  }
}

// Yanıt interceptor'ı: 401 (Yetkisiz) hatalarında otomatik token yenileme mekanizması
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    // 401 hatası gelirse ve bu istek daha önce yeniden denenmemişse ve auth endpoint'i değilse
    if (status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      // Eğer başka bir refresh zaten devam ediyorsa onu bekle, yoksa yeni bir tane başlat
      refreshPromise ??= performRefresh().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      // Yeni token alınabilmişse orijinal isteği yeni token ile tekrar gönder
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }

    return Promise.reject(error);
  },
);
