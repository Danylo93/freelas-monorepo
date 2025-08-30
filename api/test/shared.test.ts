import { describe, it, expect } from 'vitest';
import { haversineKm, etaMin, price } from '../src/shared.js';

describe('shared utils', () => {
  it('haversine distance roughly between São Paulo and Rio', () => {
    const sp = { lat: -23.55052, lng: -46.633308 };
    const rio = { lat: -22.9068, lng: -43.1729 };
    const d = haversineKm(sp.lat, sp.lng, rio.lat, rio.lng);
    expect(Math.round(d)).toBeGreaterThan(350);
    expect(Math.round(d)).toBeLessThan(460);
  });

  it('eta and price increase with distance', () => {
    const km = 10;
    const eta = etaMin(km);
    const p = price(km, eta);
    expect(eta).toBeGreaterThan(0);
    expect(p).toBeGreaterThan(0);
  });
});

