import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import {
  JWT_ISSUER,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt.js';
import { UnauthorizedError } from './errors.js';

const payload = { sub: 'user-1', username: 'demo', role: 'USER' as const };

describe('access token', () => {
  it('imzalanan token doğrulanır ve payload korunur', () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.username).toBe('demo');
    expect(decoded.role).toBe('USER');
  });

  it('yanlış issuer ile imzalanan token reddedilir', () => {
    const foreign = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: '15m',
      issuer: 'baska-servis',
    });
    expect(() => verifyAccessToken(foreign)).toThrow(UnauthorizedError);
  });

  it('issuer alanı olmayan token reddedilir', () => {
    const noIssuer = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    expect(() => verifyAccessToken(noIssuer)).toThrow(UnauthorizedError);
  });

  it('bozuk token reddedilir', () => {
    expect(() => verifyAccessToken('bozuk.token.degeri')).toThrow(UnauthorizedError);
  });
});

describe('refresh token', () => {
  it('imzalanan token doğrulanır', () => {
    const token = signRefreshToken({ sub: 'user-1', jti: 'jti-1' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.jti).toBe('jti-1');
  });

  it('doğru issuer ile imzalanır', () => {
    const token = signRefreshToken({ sub: 'user-1', jti: 'jti-1' });
    const raw = jwt.decode(token) as { iss?: string };
    expect(raw.iss).toBe(JWT_ISSUER);
  });
});
