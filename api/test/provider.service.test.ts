import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderService } from '../src/application/ProviderService.js';
import { redis, PROVIDER_KEY, GEO_KEY } from '../src/redis.js';

describe('ProviderService', () => {
  const svc = new ProviderService();
  let providerId = '';

  beforeEach(async () => {
    // nada especial; MockRedis zera em instância única? mantemos isolado por id aleatório.
  });

  it('registers and updates location', async () => {
    const res = await svc.register({ name: 'Test', lat: -23.5, lng: -46.6, radiusKm: 5, serviceTypes: ['plumber'] });
    providerId = res.providerId;
    const raw = await redis.hget(PROVIDER_KEY(providerId), 'json');
    expect(raw).toBeTruthy();
    const obj = JSON.parse(raw!);
    expect(obj.name).toBe('Test');

    const ok = await svc.updateLocation(providerId, -23.4, -46.5);
    expect(ok).toBe(true);
    const raw2 = await redis.hget(PROVIDER_KEY(providerId), 'json');
    const obj2 = JSON.parse(raw2!);
    expect(obj2.lat).toBeCloseTo(-23.4, 3);
    expect(obj2.lng).toBeCloseTo(-46.5, 3);
  });
});

