import type { Config } from 'tailwindcss';

// Tailwind CSS tema yapılandırması
// Uygulamanın renk paleti, yazı tipleri, gölgeler ve animasyonları tanımlar
export default {
  // Tailwind sınıflarının taranacağı dosyalar
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Dark mode'u CSS sınıfıyla etkinleştir (<html class="dark">)
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // %60 — Ana arka plan rengi (koyu lacivert)
        surface: {
          DEFAULT: '#0F172A',
          // %30 — İkincil arka plan (kartlar, navbar, inceleme konteynerleri)
          raised: '#1E293B',
          muted: '#334155',
          ring: '#475569',
        },
        // %10 — Vurgu rengi (butonlar, aktif durumlar, önemli vurgular)
        accent: {
          DEFAULT: '#10B981',
          cyan: '#06B6D4',
          600: '#059669',
          700: '#047857',
        },
        // Metin renkleri
        ink: {
          DEFAULT: '#F8FAFC', // Ana metin (parlak beyaz)
          muted: '#94A3B8',   // İkincil metin (soluk gri)
          dim: '#64748B',     // Üçüncül metin (koyu gri)
        },
        // Puan bazlı renk kodlaması
        rating: {
          low: '#F97316',     // Düşük puan (turuncu)
          mid: '#EAB308',     // Orta puan (sarı)
          high: '#10B981',    // Yüksek puan (yeşil)
        },
      },
      // Yazı tipi aileleri
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      // Özel gölge tanımları
      boxShadow: {
        glow: '0 10px 40px -10px rgba(16, 185, 129, 0.45)',          // Yeşil parlama
        'glow-cyan': '0 10px 40px -10px rgba(6, 182, 212, 0.45)',    // Cyan parlama
        card: '0 12px 30px -12px rgba(0, 0, 0, 0.6)',                // Kart gölgesi
      },
      backdropBlur: {
        xs: '2px',
      },
      // Özel geçiş zamanlama fonksiyonu (spring animasyonu)
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      // Özel animasyonlar
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'lift-in': 'liftIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      // Animasyon keyframe tanımları
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        liftIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
