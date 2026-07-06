import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import path from 'node:path';

// Kaynak kod, ESM kuralları gereği göreli importlarda '.js' uzantısı kullanır
// (ör. import { x } from './foo.js'). Vitest/Vite bunları '.ts' kaynak
// dosyalarına çözebilsin diye küçük bir 'pre' resolver eklenir.
export default defineConfig({
  plugins: [
    {
      name: 'resolve-ts-from-js',
      enforce: 'pre',
      resolveId(source: string, importer?: string) {
        if (importer && source.startsWith('.') && source.endsWith('.js')) {
          const candidate = path.resolve(path.dirname(importer), source.replace(/\.js$/, '.ts'));
          if (fs.existsSync(candidate)) return candidate;
        }
        return null;
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Testler gerçek bir .env olmadan da (ör. CI'da) çalışabilsin diye
    // zorunlu ortam değişkenlerine güvenli sahte değerler verilir.
    // Testler DB/Redis/TMDB'ye bağlanmaz; bu değerler yalnızca env
    // doğrulamasını (config/env.ts) geçmek içindir.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5433/test?schema=public',
      JWT_ACCESS_SECRET: 'test-access-secret-0123456789',
      JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789',
      TMDB_API_KEY: 'test-tmdb-key',
    },
  },
});
