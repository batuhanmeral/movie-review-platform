import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

// Temel API entegrasyon testi. Sağlık ucu DB/Redis'e dokunmadığından hermetiktir.
describe('GET /api/health', () => {
  const app = createApp();

  it('200 ve status ok döndürür', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('bilinmeyen rotada 404 döndürür', async () => {
    const res = await request(app).get('/api/bilinmeyen-rota');
    expect(res.status).toBe(404);
  });
});
