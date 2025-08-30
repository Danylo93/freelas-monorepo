import { describe, it, expect } from 'vitest';
import { haversineKm } from '../src/shared.js';

describe('haversine (matcher)', () => {
  it('distance is symmetric and non-negative', () => {
    const a = [-23.5, -46.6];
    const b = [-23.6, -46.7];
    const d1 = haversineKm(a[0], a[1], b[0], b[1]);
    const d2 = haversineKm(b[0], b[1], a[0], a[1]);
    expect(d1).toBeCloseTo(d2, 6);
    expect(d1).toBeGreaterThan(0);
  });
});

