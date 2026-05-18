import { useEffect, useState } from 'react';

// Verilen değerin değişimlerini geciktiren (debounce) özel hook
// Kullanıcı yazmayı bıraktıktan sonra belirtilen süre (varsayılan 300ms) bekler
// Genellikle arama çubuğu gibi bileşenlerde gereksiz API çağrılarını önlemek için kullanılır
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    // Belirtilen süre sonra değeri güncelle
    const id = setTimeout(() => setDebounced(value), delay);
    // Değer değişirse önceki zamanlayıcıyı iptal et
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
