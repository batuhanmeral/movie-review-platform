import { describe, it, expect } from 'vitest';
import { updateRoleSchema, bulkUsersSchema } from './admin.validator.js';

describe('updateRoleSchema', () => {
  it('geçerli rolleri kabul eder', () => {
    expect(updateRoleSchema.safeParse({ role: 'ADMIN' }).success).toBe(true);
    expect(updateRoleSchema.safeParse({ role: 'USER' }).success).toBe(true);
  });

  it('enum dışı rolleri reddeder', () => {
    expect(updateRoleSchema.safeParse({ role: 'SUPER' }).success).toBe(false);
    expect(updateRoleSchema.safeParse({}).success).toBe(false);
  });
});

describe('bulkUsersSchema', () => {
  it('en az bir uuid ve geçerli aksiyon gerektirir', () => {
    const ok = bulkUsersSchema.safeParse({
      ids: ['3f0f6f7e-2b3a-4c5d-8e9f-0a1b2c3d4e5f'],
      action: 'suspend',
    });
    expect(ok.success).toBe(true);
  });

  it('boş id listesini reddeder', () => {
    expect(bulkUsersSchema.safeParse({ ids: [], action: 'suspend' }).success).toBe(false);
  });

  it('geçersiz aksiyonu reddeder', () => {
    expect(
      bulkUsersSchema.safeParse({ ids: ['3f0f6f7e-2b3a-4c5d-8e9f-0a1b2c3d4e5f'], action: 'delete' })
        .success,
    ).toBe(false);
  });
});
