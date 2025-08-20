import Redis from "ioredis";
import { haversineKm } from "@freelas/shared";
import { config } from "./config.js";

class MockRedis {
  private hashes = new Map<string, Record<string, any>>();
  private geo = new Map<string, { id: string; lng: number; lat: number }[]>();

  async hset(key: string, value: Record<string, string>) {
    const existing = this.hashes.get(key) || {};
    Object.assign(existing, value);
    this.hashes.set(key, existing);
    return "OK";
  }

  async hget(key: string, field: string) {
    return this.hashes.get(key)?.[field] ?? null;
  }

  async geoadd(key: string, lng: number, lat: number, member: string) {
    const arr = this.geo.get(key) || [];
    const idx = arr.findIndex(e => e.id === member);
    if (idx >= 0) arr.splice(idx, 1);
    arr.push({ id: member, lng, lat });
    this.geo.set(key, arr);
    return 1;
  }

  async geosearch(
    key: string,
    _from: string,
    lng: number,
    lat: number,
    _by: string,
    radius: number,
    _unit: string,
    _withdist: string,
    _countLabel: string,
    count: number,
    _order: string
  ) {
    const arr = this.geo.get(key) || [];
    return arr
      .map(e => [e.id, haversineKm(lat, lng, e.lat, e.lng).toString()])
      .filter(([, d]) => parseFloat(d) <= radius)
      .sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]))
      .slice(0, count);
  }
}

export const redis: any = config.mockRedis ? new MockRedis() : new Redis(config.redisUrl);

if (!config.mockRedis) {
  redis.on("error", (err: any) => {
    console.warn("Redis error", err);
  });
}

export const GEO_KEY = (t: string) => `geo:providers:${t}`;
export const PROVIDER_KEY = (id: string) => `provider:${id}`;
