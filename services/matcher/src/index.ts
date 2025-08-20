import { Kafka } from "kafkajs";
import Redis from "ioredis";
import { Topics, ServiceRequest, ServiceOffer, etaMin, price } from "@freelas/shared";

const kafka = new Kafka({ clientId:"freelas-matcher", brokers:(process.env.KAFKA_BROKERS||"localhost:19092").split(",") });
const consumer = kafka.consumer({ groupId:"matcher" });
const producer = kafka.producer();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const GEO = (t:string)=>`geo:providers:${t}`;
const PROVIDER = (id:string)=>`provider:${id}`;

await consumer.connect(); await producer.connect();
await consumer.subscribe({ topic: Topics.ServiceRequested, fromBeginning:false });
console.log("Matcher up…");

await consumer.run({
  eachMessage: async ({ message })=>{
    if(!message.value) return;
    const req = JSON.parse(message.value.toString()) as ServiceRequest;
    const radiusKm = 8;
    const candidates:any[] = await (redis as any).geosearch(GEO(req.serviceType), "FROMLONLAT", req.lng, req.lat, "BYRADIUS", radiusKm, "km", "WITHDIST", "COUNT", 10, "ASC");
    for(const c of candidates){
      const providerId = c[0]; const distKm = parseFloat(c[1]);
      const raw = await redis.hget(PROVIDER(providerId), "json"); if(!raw) continue;
      const prof = JSON.parse(raw);
      if(prof.bairroWhitelist?.length && req.bairro){
        const hit = prof.bairroWhitelist.map((b:string)=>b.toLowerCase()).includes(req.bairro.toLowerCase());
        if(!hit) continue;
      }
      const offer: ServiceOffer = {
        offerId: `${req.requestId}-${providerId}`,
        requestId: req.requestId,
        providerId,
        distanceKm: Math.round(distKm*100)/100,
        etaMin: etaMin(distKm),
        priceEstimate: price(distKm, etaMin(distKm)),
        expiresAt: new Date(Date.now()+30_000).toISOString()
      };
      await producer.send({ topic: Topics.ServiceOffer, messages:[{ key:req.requestId, value: JSON.stringify(offer) }] });
    }
  }
});
