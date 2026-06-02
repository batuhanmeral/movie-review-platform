import fs from 'node:fs';
import path from 'node:path';

// Yüklenen dosyaların kök klasörü (backend çalışma dizinine göre: backend/uploads).
// Klasörler uygulama açılışında oluşturulur; içerik .gitignore ile sürüm kontrolü dışıdır.
export const UPLOADS_DIR = path.resolve('uploads');
export const AVATAR_DIR = path.join(UPLOADS_DIR, 'avatars');

fs.mkdirSync(AVATAR_DIR, { recursive: true });
