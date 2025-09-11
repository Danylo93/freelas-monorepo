// src/matcher/engine.ts
import { Topics, ServiceRequest, ServiceOffer, etaMin, price } from "../shared.js";
import { producer, createConsumer } from "../kafka.js";
import { redis, GEO_KEY, PROVIDER_KEY, OFFERS_BY_REQUEST_KEY } from "../redis.js";
import { getIO } from "../socket.js"; // <-- NOVO

export async function startMatcherEngine(groupId = "matcher") {
  const consumer = createConsumer(groupId);
  await consumer.connect();
  await consumer.subscribe({ topic: Topics.ServiceRequested, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const req = JSON.parse(message.value.toString()) as ServiceRequest;

      const radiusKm = 8;
      const candidates: any[] = await (redis as any).geosearch(
        GEO_KEY(req.serviceType),
        "FROMLONLAT", req.lng, req.lat,
        "BYRADIUS", radiusKm, "km",
        "WITHDIST", "COUNT", 10, "ASC"
      );

      for (const c of candidates) {
        const providerId = c[0];
        const distKm = parseFloat(c[1]);
        const raw = await redis.hget(PROVIDER_KEY(providerId), "json");
        if (!raw) continue;
        const prof = JSON.parse(raw);

        if (prof.bairroWhitelist?.length && req.bairro) {
          const hit = prof.bairroWhitelist.map((b: string) => b.toLowerCase()).includes(req.bairro.toLowerCase());
          if (!hit) continue;
        }

        const _eta = etaMin(distKm);
        const offer: ServiceOffer = {
          offerId: `${req.requestId}-${providerId}`,
          requestId: req.requestId,
          providerId,
          distanceKm: Math.round(distKm * 100) / 100,
          etaMin: _eta,
          priceEstimate: price(distKm, _eta),
          expiresAt: new Date(Date.now() + 30_000).toISOString(),
        };

        // >>> Emite para o prestador (ProviderScreen) um "job" com detalhes da oportunidade
        getIO().to(`provider:${providerId}`).emit("job", {
          clientId: req.clientId ?? "cliente",
          lat: req.lat,
          lng: req.lng,
          distanceKm: offer.distanceKm,
          price: offer.priceEstimate,
          details: `${req.serviceType ?? "serviço"} a ~${offer.distanceKm}km (${offer.etaMin}min)`
        });

        // Mantém sua linha de envio para Kafka (pipeline existente)
        await producer.send({
          topic: Topics.ServiceOffer,
          messages: [{ key: req.requestId, value: JSON.stringify(offer) }],
        });
      }
    },
  });
}

export async function startOfferCollector(groupId = "offer-collector") {
  const consumer = createConsumer(groupId);
  await consumer.connect();
  await consumer.subscribe({ topic: Topics.ServiceOffer, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const offer = JSON.parse(message.value.toString()) as ServiceOffer;
      const listKey = OFFERS_BY_REQUEST_KEY(offer.requestId);
      await redis.lpush(listKey, JSON.stringify(offer));
      await redis.expire(listKey, 60); // expira em 60s

      // >>> Emite para o cliente (OffersScreen) que chegou uma oferta
      getIO().to(`request:${offer.requestId}`).emit("offer", offer);
    },
  });
}
