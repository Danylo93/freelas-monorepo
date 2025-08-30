import { redis, GEO_KEY, PROVIDER_KEY } from "../redis.js";
import { nanoid } from "nanoid";

export type RegisterProviderInput = {
  providerId?: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  serviceTypes: string[];
  bairroWhitelist?: string[];
  isOnline?: boolean;
};

export class ProviderService {
  async register(input: RegisterProviderInput) {
    const providerId = input.providerId ?? nanoid();
    const payload = { ...input, providerId, isOnline: input.isOnline ?? true };
    await redis.hset(PROVIDER_KEY(providerId), { json: JSON.stringify(payload) });
    for (const t of input.serviceTypes) {
      await redis.geoadd(GEO_KEY(t), input.lng, input.lat, providerId);
    }
    return { providerId };
  }

  async updateLocation(providerId: string, lat: number, lng: number) {
    const raw = await redis.hget(PROVIDER_KEY(providerId), "json");
    if (!raw) return false;
    const p = JSON.parse(raw);
    p.lat = lat; p.lng = lng;
    await redis.hset(PROVIDER_KEY(providerId), { json: JSON.stringify(p) });
    for (const t of p.serviceTypes) await redis.geoadd(GEO_KEY(t), lng, lat, providerId);
    return true;
  }
}

