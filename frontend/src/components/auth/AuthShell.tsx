import type { PropsWithChildren, ReactNode } from 'react';

// AuthShell bileşeni için prop tanımları
interface Props {
  title: string;       // Form başlığı (ör: "Giriş Yap")
  subtitle?: string;   // Başlık altındaki açıklama metni
  footer?: ReactNode;  // Formun altındaki bağlantı alanı (ör: "Hesabınız yok mu?")
}

// Giriş ve kayıt formlarını saran ortak kabuk bileşeni
// Glassmorphism efektli arka plan ve animasyonlu kart yapısı sağlar
export function AuthShell({ title, subtitle, footer, children }: PropsWithChildren<Props>) {
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-200px)] max-w-md flex-col justify-center">
      {/* Animasyonlu kart yüzeyi (arka plan düz renk — dekoratif gradient kaldırıldı) */}
      <div className="card relative animate-lift-in p-8 ring-white/10">
        <div className="mb-8"></div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
        {/* Form içeriği */}
        <div className="mt-6">{children}</div>
        {/* Alt bilgi alanı (kayıt/giriş bağlantıları) */}
        {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}
