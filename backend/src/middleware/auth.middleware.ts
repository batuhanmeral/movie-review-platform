import type { RequestHandler } from 'express';
import { prisma } from '../config/db.js';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

// Kullanıcının giriş yapıp yapmadığını (Token geçerliliğini) kontrol eden middleware
// Geçerli bir Bearer token bulunursa kullanıcı bilgilerini req.auth içine ekler.
// Token geçerli olsa bile hesabın güncel durumu DB'den doğrulanır: silinen
// kullanıcı ve askıya alınan hesap, access token süresi dolmadan anında
// dışarıda bırakılır; rol değişikliği de token beklenmeden uygulanır.
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  // Authorization header yoksa veya Bearer ile başlamıyorsa hata fırlat
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authorization header eksik'));
  }
  const token = header.slice(7); // "Bearer " kısmını at
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true, isSuspended: true },
    });
    if (!user) throw new UnauthorizedError('Kullanıcı bulunamadı');
    if (user.isSuspended) throw new ForbiddenError('Hesap askıya alınmış');
    req.auth = { ...payload, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

// Token varsa req.auth'u doldurur, yoksa sessizce devam eder. Hata fırlatmaz.
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    req.auth = verifyAccessToken(header.slice(7));
  } catch {
    // Geçersiz token sessizce yok sayılır
  }
  next();
};

// Belirli rollere sahip kullanıcıların erişimine izin veren middleware oluşturucu
export const requireRole =
  (...roles: Array<AccessTokenPayload['role']>): RequestHandler =>
    (req, _res, next) => {
      // Eğer req.auth yoksa (requireAuth kullanılmamışsa) yetkisiz hatası dön
      if (!req.auth) return next(new UnauthorizedError());
      // Kullanıcının rolü izin verilenler listesinde yoksa yasaklı hatası dön
      if (!roles.includes(req.auth.role)) {
        return next(new ForbiddenError('Bu kaynak için yetkin yok'));
      }
      next();
    };
