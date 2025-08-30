import Redis from "ioredis";
import { haversineKm } from "./shared.js";
import { config } from "./config.js";
class MockRedis {
    constructor() {
        this.hashes = new Map();
        this.geo = new Map();
    }
    async hset(key, value) {
        const existing = this.hashes.get(key) || {};
        Object.assign(existing, value);
        this.hashes.set(key, existing);
        return "OK";
    }
    async hget(key, field) {
        return this.hashes.get(key)?.[field] ?? null;
    }
    async geoadd(key, lng, lat, member) {
        const arr = this.geo.get(key) || [];
        const idx = arr.findIndex(e => e.id === member);
        if (idx >= 0)
            arr.splice(idx, 1);
        arr.push({ id: member, lng, lat });
        this.geo.set(key, arr);
        return 1;
    }
    async geosearch(key, _from, lng, lat, _by, radius, _unit, _withdist, _countLabel, count, _order) {
        const arr = this.geo.get(key) || [];
        return arr
            .map(e => [e.id, haversineKm(lat, lng, e.lat, e.lng).toString()])
            .filter(([, d]) => parseFloat(d) <= radius)
            .sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]))
            .slice(0, count);
    }
}
export const redis = config.mockRedis ? new MockRedis() : new Redis(config.redisUrl);
if (!config.mockRedis) {
    redis.on("error", (err) => {
        console.warn("Redis error", err);
    });
}
export const GEO_KEY = (t) => `geo:providers:${t}`;
export const PROVIDER_KEY = (id) => `provider:${id}`;
