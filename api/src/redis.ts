// src/redis.ts
import Redis from "ioredis";
import { haversineKm } from "./shared.js";
import { config } from "./config.js";

class MockRedis {
  private hashes = new Map<string, Record<string, any>>();
  private geo = new Map<string, { id: string; lng: number; lat: number }[]>();
  private lists = new Map<string, string[]>();

  private zsets = new Map<string, Set<string>>();

  async zrem(key: string, member: string) {
    // GEO em Redis é um sorted set; simulamos a remoção
    const arr = this.geo.get(key) || [];
    const idx = arr.findIndex(e => e.id === member);
    if (idx >= 0) {
      arr.splice(idx, 1);
      this.geo.set(key, arr);
      return 1;
    }
    return 0;
  }

  async hset(key: string, value: Record<string, string>) {
    const existing = this.hashes.get(key) || {};
    Object.assign(existing, value);
    this.hashes.set(key, existing);
    return "OK";
  }
  async hget(key: string, field: string) {
    return (this.hashes.get(key) || {})[field];
  }
  async geoadd(key: string, lng: number, lat: number, id: string) {
  const arr = this.geo.get(key) || [];
  const idx = arr.findIndex(e => e.id === id);
  if (idx >= 0) arr[idx] = { id, lng, lat }; else arr.push({ id, lng, lat });
  this.geo.set(key, arr);
  return 1;
}
async geosearch(
  key: string,
  _from: "FROMLONLAT", lng: number, lat: number,
  _by: "BYRADIUS", radius: number,
  _unit: "km",
  _order: "ASC" | "DESC",
  _countLabel: "COUNT", count: number,
  _withdist: "WITHDIST"
) {
  const arr = this.geo.get(key) || [];
  const result = arr
    .map(e => [e.id, (haversineKm(lat, lng, e.lat, e.lng)).toString()])
    .filter(([, d]) => parseFloat(d) <= radius)
    .sort((a, b) => _order === "ASC" ? parseFloat(a[1]) - parseFloat(b[1]) : parseFloat(b[1]) - parseFloat(a[1]))
    .slice(0, count);
  return result;
}
  async lpush(key: string, value: string) {
    const arr = this.lists.get(key) || [];
    arr.unshift(value);
    this.lists.set(key, arr);
    return arr.length;
  }
  async lrange(key: string, start: number, stop: number) {
    const arr = this.lists.get(key) || [];
    const end = stop < 0 ? arr.length : stop + 1;
    return arr.slice(start, end);
  }
  async expire(_key: string, _sec: number){ return 1; }
  on() {}
}

export const redis: any = config.mockRedis ? new MockRedis() : new Redis(config.redisUrl);

if (!config.mockRedis) {
  redis.on("error", (err: any) => console.warn("Redis error", err));
}

export const GEO_KEY = (t: string) => `geo:providers:${t}`;
export const PROVIDER_KEY = (id: string) => `provider:${id}`;
export const OFFERS_BY_REQUEST_KEY = (reqId: string) => `offers:${reqId}`;
export const REQUEST_KEY = (reqId: string) => `request:${reqId}`;

