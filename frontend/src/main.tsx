import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/tailwind.css';
import './lib/i18n';

// Uygulamanın bağlanacağı kök DOM elementini bul
const root = document.getElementById('root');
if (!root) throw new Error('#root elementi bulunamadı');

// React uygulamasını StrictMode ile başlat
// StrictMode, geliştirme ortamında potansiyel sorunları tespit etmeye yardımcı olur
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
