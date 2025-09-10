// src/redis.ts
import Redis from "ioredis";
import { haversineKm } from "./shared.js";
import { config } from "./config.js";
class MockRedis {
    constructor() {
        this.hashes = new Map();
        this.geo = new Map();
        this.lists = new Map();
        this.zsets = new Map();
    }
    async zrem(key, member) {
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
    async hset(key, value) {
        const existing = this.hashes.get(key) || {};
        Object.assign(existing, value);
        this.hashes.set(key, existing);
        return "OK";
    }
    async hget(key, field) {
        return (this.hashes.get(key) || {})[field];
    }
    async geoadd(key, lng, lat, id) {
        const arr = this.geo.get(key) || [];
        const idx = arr.findIndex(e => e.id === id);
        if (idx >= 0)
            arr[idx] = { id, lng, lat };
        else
            arr.push({ id, lng, lat });
        this.geo.set(key, arr);
        return 1;
    }
    async geosearch(key, _from, lng, lat, _by, radius, _unit, _order, _countLabel, count, _withdist) {
        const arr = this.geo.get(key) || [];
        const result = arr
            .map(e => [e.id, (haversineKm(lat, lng, e.lat, e.lng)).toString()])
            .filter(([, d]) => parseFloat(d) <= radius)
            .sort((a, b) => _order === "ASC" ? parseFloat(a[1]) - parseFloat(b[1]) : parseFloat(b[1]) - parseFloat(a[1]))
            .slice(0, count);
        return result;
    }
    async lpush(key, value) {
        const arr = this.lists.get(key) || [];
        arr.unshift(value);
        this.lists.set(key, arr);
        return arr.length;
    }
    async lrange(key, start, stop) {
        const arr = this.lists.get(key) || [];
        const end = stop < 0 ? arr.length : stop + 1;
        return arr.slice(start, end);
    }
    async expire(_key, _sec) { return 1; }
    on() { }
}
export const redis = config.mockRedis ? new MockRedis() : new Redis(config.redisUrl);
if (!config.mockRedis) {
    redis.on("error", (err) => console.warn("Redis error", err));
}
export const GEO_KEY = (t) => `geo:providers:${t}`;
export const PROVIDER_KEY = (id) => `provider:${id}`;
export const OFFERS_BY_REQUEST_KEY = (reqId) => `offers:${reqId}`;
export const REQUEST_KEY = (reqId) => `request:${reqId}`;
