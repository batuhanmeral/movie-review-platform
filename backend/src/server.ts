import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { disconnectDb } from './config/db.js';

// Uygulamayı başlatır
// Gerekli bağlantıları (Redis) kurar ve HTTP sunucusunu dinlemeye başlar
async function bootstrap() {
  // Redis'e bağlanmayı dene, hata olursa uygulamayı çökertme sadece uyar
  await connectRedis().catch((err) => logger.warn({ err }, 'Redis bağlantısı başlatılamadı'));

  const app = createApp();
  // Express sunucusunu belirtilen portta dinlemeye başla
  const server = app.listen(env.PORT, () => {
    logger.info(`CineReviews API ${env.APP_URL} adresinde çalışıyor (${env.NODE_ENV})`);
  });

  // Sunucu kapatılırken kaynakları güvenli şekilde temizle
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Sunucu kapatılıyor');
    server.close(async () => {
      await disconnectDb();
      await disconnectRedis();
      process.exit(0);
    });
  };

  // Kapatma sinyallerini dinle (Graceful shutdown)
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

// Başlatma işleminde hata olursa yakala ve programı sonlandır
bootstrap().catch((err) => {
  logger.fatal({ err }, 'Sunucu başlatılamadı');
  process.exit(1);
});
