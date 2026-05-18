import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Sayfa rotası değiştiğinde scroll pozisyonunu en üste sıfırlar
// Bu olmadan React Router, önceki sayfanın scroll konumunu korur
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}
