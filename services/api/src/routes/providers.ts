import { FastifyInstance } from "fastify";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Server } from "socket.io";
import { redis, GEO_KEY, PROVIDER_KEY } from "../redis";

export function registerProviderRoutes(app: FastifyInstance, io: Server) {
  app.post("/providers/register", async (req, rep) => {
    const schema = z.object({
      providerId: z.string().optional(),
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
      radiusKm: z.number().min(1).max(50),
      serviceTypes: z.array(z.string()),
      bairroWhitelist: z.array(z.string()).optional(),
      isOnline: z.boolean().default(true),
    });
    const p = schema.parse(req.body);
    const providerId = p.providerId ?? nanoid();
    await redis.hset(PROVIDER_KEY(providerId), { json: JSON.stringify({ ...p, providerId }) });
    for (const t of p.serviceTypes) {
      await redis.geoadd(GEO_KEY(t), p.lng, p.lat, providerId);
    }
    return { ok: true, providerId };
  });

  app.post("/providers/:id/location", async (req, rep) => {
    const { id } = req.params as any;
    const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    const raw = await redis.hget(PROVIDER_KEY(id), "json");
    if (!raw) return { ok: false };
    const p = JSON.parse(raw);
    p.lat = lat;
    p.lng = lng;
    await redis.hset(PROVIDER_KEY(id), { json: JSON.stringify(p) });
    for (const t of p.serviceTypes) {
      await redis.geoadd(GEO_KEY(t), lng, lat, id);
    }
    io.to(`provider:${id}`).emit("provider:location", { providerId: id, lat, lng, ts: new Date().toISOString() });
    return { ok: true };
  });
}
