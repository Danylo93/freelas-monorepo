// src/routes/matcher.ts
import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { redis, GEO_KEY, PROVIDER_KEY, OFFERS_BY_REQUEST_KEY, REQUEST_KEY } from "../redis.js";
import { Topics, ServiceRequest, ServiceAccepted } from "../shared.js";
import { producer } from "../kafka.js";

/**
 * Util interno
 */
function toNum(x: any, def: number) { const n = Number(x); return Number.isFinite(n) ? n : def; }

export default async function matcherRoutes(app: FastifyInstance) {
  // ----- Providers -----

  // Upsert de prestador + geolocalização
  app.post("/providers/upsert", async (req, reply) => {
    try {
      const body: any = req.body;
      const { providerId, serviceType, lat, lng, profile } = body;

      if (!providerId || !serviceType || typeof lat !== "number" || typeof lng !== "number") {
        return reply.code(400).send({ error: "providerId, serviceType, lat, lng são obrigatórios" });
      }

      // GEOADD key lng lat member
      await (redis as any).geoadd(GEO_KEY(String(serviceType)), Number(lng), Number(lat), String(providerId));

      // Guardamos também no perfil os últimos lat/lng e o serviceType
      const storedProfile = { ...(profile ?? {}), serviceType, lat: Number(lat), lng: Number(lng) };
      await redis.hset(PROVIDER_KEY(String(providerId)), { json: JSON.stringify(storedProfile) });

      return { ok: true };
    } catch (e: any) {
      app.log?.error?.(e);
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // Detalhe do prestador
  app.get("/providers/:id", async (req, reply) => {
    try {
      const { id } = req.params as any;
      const raw = await redis.hget(PROVIDER_KEY(String(id)), "json");
      if (!raw) return reply.code(404).send({ error: "not_found" });
      return JSON.parse(raw);
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // Prestadores próximos (debug/insomnia)
  app.get("/providers/nearby", async (req, reply) => {
    try {
      const q: any = req.query;
      const serviceType = String(q.serviceType ?? "");
      const lat = toNum(q.lat, NaN);
      const lng = toNum(q.lng, NaN);
      const radiusKm = toNum(q.radiusKm, 8);
      const count = toNum(q.count, 20);

      if (!serviceType || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return reply.code(400).send({ error: "serviceType, lat, lng são obrigatórios" });
      }

      const rows: any[] = await (redis as any).geosearch(
        GEO_KEY(serviceType),
        "FROMLONLAT", lng, lat,
        "BYRADIUS", radiusKm, "km",
        "ASC",
        "COUNT", count,
        "WITHDIST"
      );

      const result = [];
      for (const r of rows) {
        const providerId = r[0];
        const distKm = Number(r[1]);
        const raw = await redis.hget(PROVIDER_KEY(providerId), "json");
        result.push({
          providerId,
          distanceKm: Math.round(distKm * 100) / 100,
          profile: raw ? JSON.parse(raw) : undefined,
        });
      }
      return { serviceType, center: { lat, lng }, radiusKm, count: result.length, providers: result };
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // Atualiza status do prestador (disponível/indisponível)
  app.post("/providers/:id/status", async (req, reply) => {
    try {
      const { id } = req.params as any;
      const body: any = req.body;
      const available = Boolean(body?.available);

      if (!available) {
        // Remove do índice GEO (precisa do serviceType!)
        const serviceType = String(body?.serviceType ?? (JSON.parse(await redis.hget(PROVIDER_KEY(String(id)), "json") ?? "{}")?.serviceType ?? ""));
        if (serviceType) await (redis as any).zrem(GEO_KEY(serviceType), String(id));
        return { ok: true, available: false };
      }

      // Para (re)adicionar, precisamos de serviceType e lat/lng
      const serviceType = String(body?.serviceType ?? "");
      const lat = toNum(body?.lat, NaN);
      const lng = toNum(body?.lng, NaN);
      if (!serviceType || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return reply.code(400).send({ error: "serviceType, lat, lng obrigatórios quando available=true" });
      }
      await (redis as any).geoadd(GEO_KEY(serviceType), lng, lat, String(id));

      // também atualiza perfil salvo
      const raw = await redis.hget(PROVIDER_KEY(String(id)), "json");
      const prof = raw ? JSON.parse(raw) : {};
      prof.serviceType = serviceType; prof.lat = lat; prof.lng = lng;
      await redis.hset(PROVIDER_KEY(String(id)), { json: JSON.stringify(prof) });

      return { ok: true, available: true };
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // Remover prestador (requer serviceType para tirar do GEO)
  app.delete("/providers/:id", async (req, reply) => {
    try {
      const { id } = req.params as any;
      const q: any = req.query;
      const serviceType = String(q?.serviceType ?? "");
      if (!serviceType) return reply.code(400).send({ error: "serviceType é obrigatório" });

      await (redis as any).zrem(GEO_KEY(serviceType), String(id));
      await redis.hset(PROVIDER_KEY(String(id)), { json: "" });
      return { ok: true };
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // Seed de prestadores (DEV)
  app.post("/providers/seed", async (req, reply) => {
    try {
      const b: any = req.body;
      const serviceType = String(b?.serviceType ?? "plumber");
      const centerLat = toNum(b?.centerLat, -23.5615);
      const centerLng = toNum(b?.centerLng, -46.6560);
      const count = Math.max(1, Math.min(200, toNum(b?.count, 5)));
      const spreadKm = Math.max(0.2, Math.min(10, toNum(b?.spreadKm, 2)));

      const R = 6371;
      const jitter = () => (Math.random() - 0.5) * (spreadKm / R) * (180 / Math.PI);
      const created: any[] = [];

      for (let i = 0; i < count; i++) {
        const lat = centerLat + jitter();
        const lng = centerLng + jitter() / Math.cos(centerLat * Math.PI / 180);
        const providerId = `prov-${Date.now()}-${i}`;

        await (redis as any).geoadd(GEO_KEY(serviceType), lng, lat, providerId);
        await redis.hset(PROVIDER_KEY(providerId), { json: JSON.stringify({
          name: `Prov ${i+1}`, serviceType, lat, lng
        }) });
        created.push({ providerId, serviceType, lat, lng });
      }
      return { ok: true, created };
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // ----- Requests -----

  // Criar request
  app.post("/requests", async (req, reply) => {
    try {
      const b: any = req.body;
      if (!b?.serviceType || typeof b?.lat !== "number" || typeof b?.lng !== "number") {
        return reply.code(400).send({ error: "serviceType, lat, lng são obrigatórios" });
      }

      const requestId = b.requestId ?? randomUUID();
      const sr: ServiceRequest = {
        requestId,
        clientId: b.clientId ?? "cli-anon",
        serviceType: b.serviceType,
        lat: Number(b.lat),
        lng: Number(b.lng),
        bairro: b.bairro,
        details: b.details,
        createdAt: new Date().toISOString(),
      };

      // persiste o request (para GET posterior)
      await redis.hset(REQUEST_KEY(requestId), { json: JSON.stringify(sr) });
      // publica no Kafka (matcher engine vai gerar ofertas)
      await producer.send({ topic: Topics.ServiceRequested, messages: [{ key: sr.requestId, value: JSON.stringify(sr) }] });

      return { requestId };
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // Detalhe de um request
  app.get("/requests/:id", async (req, reply) => {
    try {
      const { id } = req.params as any;
      const raw = await redis.hget(REQUEST_KEY(String(id)), "json");
      if (!raw) return reply.code(404).send({ error: "not_found" });
      return JSON.parse(raw);
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // Ofertas do request (preenchidas pelo offer-collector)
  app.get("/requests/:id/offers", async (req, reply) => {
    try {
      const { id } = req.params as any;
      const raw: string[] = await (redis as any).lrange(OFFERS_BY_REQUEST_KEY(String(id)), 0, -1);
      const offers = raw.map((r) => JSON.parse(r));
      return { requestId: id, offers };
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // Aceitar uma oferta (publica evento e guarda escolha)
  app.post("/requests/:id/accept", async (req, reply) => {
    try {
      const { id } = req.params as any;
      const b: any = req.body;
      if (!b?.providerId && !b?.offerId) {
        return reply.code(400).send({ error: "providerId ou offerId é obrigatório" });
      }

      // buscar oferta escolhida
      const raw: string[] = await (redis as any).lrange(OFFERS_BY_REQUEST_KEY(String(id)), 0, -1);
      const offers = raw.map((r) => JSON.parse(r));
      const chosen = b?.offerId
        ? offers.find(o => o.offerId === b.offerId)
        : offers.find(o => o.providerId === b.providerId);

      if (!chosen) return reply.code(404).send({ error: "offer_not_found" });

      const accepted: ServiceAccepted = {
        requestId: String(id),
        offerId: chosen.offerId,
        providerId: chosen.providerId,
        acceptedAt: new Date().toISOString(),
      };

      await producer.send({ topic: Topics.ServiceAccepted, messages: [{ key: id, value: JSON.stringify(accepted) }] });
      await redis.hset(REQUEST_KEY(String(id)), { accepted: JSON.stringify(accepted) });

      return { ok: true, accepted };
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // Ver a oferta aceita
  app.get("/requests/:id/accepted", async (req, reply) => {
    try {
      const { id } = req.params as any;
      const raw = await redis.hget(REQUEST_KEY(String(id)), "accepted");
      if (!raw) return reply.code(404).send({ error: "not_found" });
      return JSON.parse(raw);
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
    }
  });

  // COMPAT: registrar prestador (equivale ao upsert + perfil)
app.post("/providers/register", async (req, reply) => {
  try {
    const b: any = req.body;
    const providerId = String(b?.providerId);
    const lat = Number(b?.lat);
    const lng = Number(b?.lng);
    // pega do body (serviceType) ou do array (serviceTypes[0]) — default plumber
    const serviceType = String(b?.serviceType ?? b?.serviceTypes?.[0] ?? "plumber");
    if (!providerId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return reply.code(400).send({ error: "providerId, lat, lng são obrigatórios" });
    }
    await (redis as any).geoadd(GEO_KEY(serviceType), lng, lat, providerId);
    await redis.hset(PROVIDER_KEY(providerId), {
      json: JSON.stringify({
        name: b?.name ?? providerId,
        serviceType, lat, lng,
        bairroWhitelist: b?.bairroWhitelist ?? []
      })
    });
    return { ok: true, serviceType };
  } catch (e: any) {
    return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
  }
});

// COMPAT: atualizar somente a localização
app.post("/providers/:id/location", async (req, reply) => {
  try {
    const { id } = req.params as any;
    const b: any = req.body;
    const lat = Number(b?.lat);
    const lng = Number(b?.lng);
    const raw = await redis.hget(PROVIDER_KEY(String(id)), "json");
    if (!raw) return reply.code(404).send({ error: "provider_not_found" });
    const prof = JSON.parse(raw);
    const serviceType = String(prof?.serviceType ?? "plumber");
    await (redis as any).geoadd(GEO_KEY(serviceType), lng, lat, String(id));
    // salva lat/lng recentes
    prof.lat = lat; prof.lng = lng;
    await redis.hset(PROVIDER_KEY(String(id)), { json: JSON.stringify(prof) });
    return { ok: true };
  } catch (e: any) {
    return reply.code(500).send({ error: "internal_error", message: e?.message ?? String(e) });
  }
});

}
