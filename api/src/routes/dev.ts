// src/routes/dev.ts
import type { FastifyInstance } from "fastify";
import { getIO } from "../socket.js";
import { GEO_KEY, PROVIDER_KEY, redis } from "../redis.js";

export default async function devRoutes(app: FastifyInstance) {
  app.post("/dev/dispatch-job", async (req, reply) => {
    const body = req.body as { providerId: string; clientId?: string; lat: number; lng: number; details?: string };
    const { providerId, clientId="cli-demo", lat, lng, details="Serviço demo" } = body || {} as any;
    if (!providerId || typeof lat !== "number" || typeof lng !== "number") {
      reply.code(400).send({ error: "providerId, lat, lng obrigatórios" });
      return;
    }
    getIO().to(`provider:${providerId}`).emit("job", { clientId, lat, lng, details });
    reply.send({ ok: true });
  });

  app.post("/dev/dispatch-offer", async (req, reply) => {
    const body = req.body as { requestId: string; offer: any };
    const { requestId, offer } = body || {} as any;
    if (!requestId || !offer) return reply.code(400).send({ error: "requestId e offer obrigatórios" });
    getIO().to(`request:${requestId}`).emit("offer", offer);
    reply.send({ ok: true });
  });

  app.post("/dev/dispatch-accepted", async (req, reply) => {
    const body = req.body as { requestId: string; accepted: any };
    const { requestId, accepted } = body || {} as any;
    if (!requestId || !accepted) return reply.code(400).send({ error: "requestId e accepted obrigatórios" });
    getIO().to(`request:${requestId}`).emit("accepted", accepted);
    reply.send({ ok: true });
  });

 
  app.post("/dev/seed/providers", async (req, reply) => {
    const payload = req.body as any;
    const providers = payload?.providers ?? [];
    let count = 0;

    for (const item of providers) {
      const { providerId, profile } = item;
      if (!providerId || !profile?.lat || !profile?.lng) continue;

      // salva perfil no hash
      const p = {
        providerId,
        name: profile.name,
        serviceType: profile.serviceType ?? "plumber",
        lat: profile.lat,
        lng: profile.lng,
        isOnline: true, // deixa online para aparecer no mapa/consulta
      };
      await redis.hset(PROVIDER_KEY(providerId), { json: JSON.stringify(p) });

      // registra no índice GEO do tipo
      await (redis as any).geoadd(
        GEO_KEY(p.serviceType),
        p.lng, p.lat, providerId
      );
      count++;
    }

    reply.send({ ok: true, seeded: count });
  });


}


