import { type ReactNode, useState } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface DropdownProps {
  // Tetikleyici buton içeriği (ikon, "..." vb.)
  trigger: ReactNode;
  // Tetikleyici butonun ek sınıfları
  triggerClassName?: string;
  // Erişilebilirlik etiketi
  triggerLabel?: string;
  // Panelin hizalanacağı kenar
  align?: 'left' | 'right';
  // Panel içeriği — kapatma fonksiyonu argüman olarak verilir
  children: (close: () => void) => ReactNode;
}

// Tıkla-aç/kapa açılır menü (dropdown).
// ProfileMenu'nün .glass panel stilini izler ama tıklamayla açılır;
// dışarı tıklama / Esc ile useClickOutside üzerinden kapanır.
// Mobil dokunma ve "Bağlantıyı Kopyala" gibi click aksiyonları için uygundur.
export function Dropdown({
  trigger,
  triggerClassName,
  triggerLabel,
  align = 'right',
  children,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full z-40 mt-2 min-w-[13rem] ${
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          } animate-fade-in`}
        >
          <div className="glass overflow-hidden rounded-xl py-1.5 shadow-card">
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </div>
  );
}

// Menü öğeleri için ortak sınıf — hem <button> hem de <Link> ile kullanılabilir.
export const dropdownItemClass =
  'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted';

// Buton tabanlı menü öğesi (aksiyonlar için).
export function DropdownItem({
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  onClick?: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`${dropdownItemClass} disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? 'text-rating-low hover:text-rating-low' : ''
      }`}
    >
      {children}
    </button>
  );
}
