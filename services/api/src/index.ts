import Fastify from "fastify";
import cors from "@fastify/cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { Kafka } from "kafkajs";
import Redis from "ioredis";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Topics } from "@freelas/shared/src/events";

const PORT = Number(process.env.API_PORT || 3001);
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:19092").split(",");
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const httpServer = createServer(app as any);
const io = new Server(httpServer, { cors: { origin: "*" } });

const kafka = new Kafka({ clientId: "freelas-api", brokers: KAFKA_BROKERS });
const producer = kafka.producer(); await producer.connect();
const consumer = kafka.consumer({ groupId: "api-forward" }); await consumer.connect();

const redis = new Redis(REDIS_URL);
const GEO_KEY = (t:string)=>`geo:providers:${t}`;
const PROVIDER = (id:string)=>`provider:${id}`;
const REQUEST = (id:string)=>`request:${id}`;
const REQ_LOCK = (id:string)=>`request:${id}:lock`;

io.on("connection",(s)=>{ s.on("join",(room:string)=>s.join(room)); });

app.post("/providers/register", async (req,rep)=>{
  const schema=z.object({ providerId:z.string().optional(), name:z.string(), lat:z.number(), lng:z.number(), radiusKm:z.number().min(1).max(50), serviceTypes:z.array(z.string()), bairroWhitelist:z.array(z.string()).optional(), isOnline:z.boolean().default(true) });
  const p=schema.parse(req.body);
  const providerId=p.providerId ?? nanoid();
  await redis.hset(PROVIDER(providerId), { json: JSON.stringify({ ...p, providerId }) });
  for(const t of p.serviceTypes){ await redis.geoadd(GEO_KEY(t), p.lng, p.lat, providerId); }
  return { ok:true, providerId };
});

app.post("/providers/:id/location", async (req,rep)=>{
  const { id } = req.params as any; const { lat, lng } = z.object({ lat:z.number(), lng:z.number() }).parse(req.body);
  const raw = await redis.hget(PROVIDER(id), "json"); if(!raw) return { ok:false };
  const p = JSON.parse(raw); p.lat=lat; p.lng=lng;
  await redis.hset(PROVIDER(id), { json: JSON.stringify(p) });
  for(const t of p.serviceTypes){ await redis.geoadd(GEO_KEY(t), lng, lat, id); }
  io.to(`provider:${id}`).emit("provider:location", { providerId:id, lat, lng, ts:new Date().toISOString() });
  return { ok:true };
});

app.post("/requests", async (req,rep)=>{
  const schema=z.object({ clientId:z.string(), serviceType:z.string(), lat:z.number(), lng:z.number(), bairro:z.string().optional(), details:z.string().optional() });
  const r=schema.parse(req.body);
  const requestId=nanoid(); const payload={ ...r, requestId, createdAt:new Date().toISOString() };
  await redis.hset(REQUEST(requestId), { json: JSON.stringify(payload) });
  await producer.send({ topic: Topics.ServiceRequested, messages:[{ key: requestId, value: JSON.stringify(payload) }] });
  io.to(`request:${requestId}`).emit("request:created", payload);
  return { ok:true, requestId };
});

app.post("/requests/:id/accept", async (req,rep)=>{
  const { id } = req.params as any; const { providerId } = z.object({ providerId:z.string() }).parse(req.body);
  const lock = await redis.set(REQ_LOCK(id), providerId, "EX", 30, "NX");
  if(!lock) return rep.status(409).send({ ok:false, reason:"Already accepted" });
  await producer.send({ topic: Topics.ServiceAccepted, messages:[{ key:id, value: JSON.stringify({ requestId:id, providerId, acceptedAt:new Date().toISOString() }) }] });
  io.to(`request:${id}`).emit("accepted", { requestId:id, providerId });
  return { ok:true };
});

await consumer.subscribe({ topic: Topics.ServiceOffer, fromBeginning:false });
await consumer.subscribe({ topic: Topics.ServiceAccepted, fromBeginning:false });
await consumer.run({ eachMessage: async ({ topic, message })=>{
  if(!message.value) return;
  const payload = JSON.parse(message.value.toString());
  if(topic===Topics.ServiceOffer){ io.to(`request:${payload.requestId}`).emit("offer", payload); }
  if(topic===Topics.ServiceAccepted){ io.to(`request:${payload.requestId}`).emit("accepted", payload); }
}});

httpServer.listen(PORT, ()=>console.log(`API on :${PORT}`));
