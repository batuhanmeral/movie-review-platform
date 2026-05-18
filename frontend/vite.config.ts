// Vite yapılandırma dosyası
// React eklentisi ve path alias ayarlarını tanımlar
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // React Fast Refresh ve JSX dönüşümü için Vite eklentisi
  plugins: [react()],
  resolve: {
    alias: {
      // '@' kısayolunu src dizinine yönlendir (ör: @/components/...)
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,        // Geliştirme sunucusu portu
    strictPort: true,  // Port meşgulse hata ver (rastgele port seçme)
  },
});
