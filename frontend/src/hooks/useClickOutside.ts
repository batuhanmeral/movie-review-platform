import { useEffect, useRef } from 'react';

// Belirtilen eleman dışına tıklandığında veya Esc'e basıldığında
// bir geri çağırma (callback) tetikleyen hook.
// Dropdown / popover gibi açılır menüleri kapatmak için kullanılır.
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  onClose: () => void,
  enabled = true,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    // Eleman dışına tıklamayı yakala
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Esc tuşu ile kapatma
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, enabled]);

  return ref;
}
