import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { UPLOADS_DIR } from './config/uploads.js';
import { healthRouter } from './api/health/health.routes.js';
import { authRouter } from './api/auth/auth.routes.js';
import { contentRouter } from './api/content/content.routes.js';
import { usersRouter } from './api/users/users.routes.js';
import { reviewsRouter, contentReviewsRouter } from './api/reviews/reviews.routes.js';
import { listsRouter } from './api/lists/lists.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { generalRateLimiter } from './middleware/rateLimit.middleware.js';

// Express uygulamasını oluşturur ve yapılandırır
// Middleware'leri ve route'ları tanımlar
export function createApp() {
  const app = express();

  // Güvenlik: Express kullanıldığını gizle
  app.disable('x-powered-by');

  // Güvenlik: Çeşitli HTTP header'larını ayarlar
  app.use(helmet());

  // CORS ayarları: İzin verilen origin ve kimlik bilgileri (cookie vb.) aktarımı
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

  // JSON gövdelerini ayrıştır (limit: 1mb)
  app.use(express.json({ limit: '1mb' }));

  // URL-encoded verileri ayrıştır
  app.use(express.urlencoded({ extended: true }));

  // Yüklenen dosyaları (avatar vb.) statik olarak sun.
  // Cross-Origin-Resource-Policy: cross-origin → frontend (farklı port) görselleri yükleyebilsin
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );

  // Test ortamı hariç HTTP isteklerini logla
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // Tüm API rotalarına genel hız sınırlandırması uygula
  app.use('/api', generalRateLimiter);

  // Uygulama rotaları
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/content/:contentId/reviews', contentReviewsRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/lists', listsRouter);

  // Bulunamayan rotalar ve hatalar için middleware'ler (en sonda olmalı)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
