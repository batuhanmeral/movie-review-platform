import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

// Varsayılan dili çevre değişkeninden al, yoksa Türkçe kullan
const defaultLang = (import.meta.env.VITE_DEFAULT_LANGUAGE as string | undefined) ?? 'tr';

// i18next çok dilli destek kütüphanesini yapılandır ve başlat
// HttpBackend: Çeviri dosyalarını HTTP üzerinden yükler
// initReactI18next: React bileşenlerinde çeviri kullanmayı sağlar
void i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',                 // Çeviri bulunamazsa İngilizce'ye geri dön
    lng: defaultLang,                  // Başlangıç dili
    supportedLngs: ['tr', 'en'],       // Desteklenen diller
    interpolation: { escapeValue: false }, // React zaten XSS koruması sağlar
    backend: {
      // Çeviri JSON dosyalarının yükleneceği yol şablonu
      loadPath: '/locales/{{lng}}/translation.json',
    },
  });

export default i18n;
