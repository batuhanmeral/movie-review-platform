// SineFiles monorepo ESLint yapılandırması (ESLint 9 "flat config").
// Tek kökten hem frontend (Vite + React) hem backend (Express + Node) lint'lenir.
// Çalıştırma: `pnpm lint`  (otomatik düzeltme: `pnpm lint:fix`)
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // Lint dışı bırakılan yollar (derleme çıktıları, bağımlılıklar, üretilmiş kod)
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'frontend/public/**',
      // Kök seviyesindeki araç yapılandırmaları (postcss/tailwind/vite) lint dışı
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
      '**/vite.config.ts',
    ],
  },

  // Tüm TS/TSX kaynakları için temel JS + TypeScript önerilen kurallar
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Tüm kaynaklar için ortak kural ayarları
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // `any` kullanımı engellenmez ama görünür kalsın diye uyarı verir
      '@typescript-eslint/no-explicit-any': 'warn',
      // Kullanılmayan değişken/argümanlar uyarı; `_` önekliler (örn. unused next) hariç
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
    },
  },

  // Frontend (React + tarayıcı ortamı)
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Hook kuralları: yanlış hook kullanımı + eksik bağımlılık dizileri
      ...reactHooks.configs['recommended-latest'].rules,
      // Vite Fast Refresh'in çalışması için bileşen dosyaları yalnızca bileşen export etmeli
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Backend (Express + Node ortamı)
  {
    files: ['backend/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
);
