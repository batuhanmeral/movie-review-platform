import type { RequestHandler } from 'express';
import multer from 'multer';

import { AVATAR_DIR } from '../../config/uploads.js';
import { BadRequestError } from '../../utils/errors.js';

// İzin verilen görsel türleri → dosya uzantısı
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] ?? '.jpg';
    // <userId>-<timestamp><ext> → çakışmasız, kullanıcı başına tahmin edilemez
    cb(null, `${req.auth?.sub ?? 'anon'}-${Date.now()}${ext}`);
  },
});

const multerAvatar = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (MIME_EXT[file.mimetype]) cb(null, true);
    else cb(new BadRequestError('Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz'));
  },
}).single('avatar');

// Tek avatar dosyasını işler ve multer'a özgü hataları (örn. boyut limiti)
// okunabilir BadRequestError'a çevirir.
export const avatarUpload: RequestHandler = (req, res, next) => {
  multerAvatar(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Dosya en fazla 2MB olabilir'
          : 'Dosya yüklenemedi';
      next(new BadRequestError(msg));
      return;
    }
    if (err) {
      next(err); // fileFilter'dan gelen BadRequestError vb.
      return;
    }
    next();
  });
};
