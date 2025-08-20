import { Topics, ServiceRequest, ServiceOffer, etaMin, price } from "@freelas/shared";
import { consumer, producer } from "./kafka.js";
import { redis, GEO_KEY, PROVIDER_KEY } from "./redis.js";

export async function startMatcher() {
  await consumer.subscribe({ topic: Topics.ServiceRequested, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }: { message: { value?: Buffer } }) => {
      if (!message.value) return;
      const req = JSON.parse(message.value.toString()) as ServiceRequest;
      const radiusKm = 8;
      const candidates: any[] = await (redis as any).geosearch(
        GEO_KEY(req.serviceType),
        "FROMLONLAT",
        req.lng,
        req.lat,
        "BYRADIUS",
        radiusKm,
        "km",
        "WITHDIST",
        "COUNT",
        10,
        "ASC"
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
        const offer: ServiceOffer = {
          offerId: `${req.requestId}-${providerId}`,
          requestId: req.requestId,
          providerId,
          distanceKm: Math.round(distKm * 100) / 100,
          etaMin: etaMin(distKm),
          priceEstimate: price(distKm, etaMin(distKm)),
          expiresAt: new Date(Date.now() + 30_000).toISOString(),
        };
        await producer.send({ topic: Topics.ServiceOffer, messages: [{ key: req.requestId, value: JSON.stringify(offer) }] });
      }
    },
  });
}
