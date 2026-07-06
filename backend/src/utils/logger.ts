import pino from 'pino';
import { env } from '../config/env.js';

// Uygulama genelinde kullanılacak Pino tabanlı loglama aracı
export const logger = pino({
  level: env.LOG_LEVEL, // Ortam değişkenlerinden gelen log seviyesi
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
  base: { service: 'cinephiles-api' }, // Loglara otomatik eklenecek temel bilgiler
});
