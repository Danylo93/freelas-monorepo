// api/src/server.js
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import http from "http";
import { Server as IOServer } from "socket.io";
import { v4 as uuid } from "uuid";

/* ===== DB em memória (modo dev) ===== */
const users = new Map();            // userId -> { userId, email, name, passHash, userType }
const providers = new Map();        // providerId -> { providerId, name, serviceType, lat, lng, isOnline, userId }
const requests = new Map();         // requestId -> { requestId, clientId, serviceType, lat, lng, details, status, providerId? }
const offersByRequest = new Map();  // requestId -> [offers]
const locations = new Map();        // providerId -> { lat, lng, ts }

/* ===== Helpers sem tipos TS ===== */
const H = {
  distanceKm(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const la1 = a.lat * Math.PI / 180;
    const la2 = b.lat * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
    return 2 * R * Math.asin(Math.sqrt(x));
  },
  etaMin(distKm) { return Math.max(2, Math.round(distKm / 0.5)); },
  price(distKm) { return Math.max(80, Math.round(60 + distKm * 30)); }
};

/* ===== Fastify + Socket.IO ===== */
const app = Fastify({ logger: false });
await app.register(cors, { origin: true, credentials: true });
await app.register(multipart);
await app.register(jwt, { secret: "dev-secret" });

const server = http.createServer(app);
export const io = new IOServer(server, {
  path: "/socket.io",
  cors: { origin: true, credentials: true },
  transports: ["websocket"],
});

/* rooms */
io.on("connection", (socket) => {
  socket.on("join", (room, ack) => { socket.join(room); ack?.({ ok: true, room }); });
  socket.on("leave", (room) => socket.leave(room));
});

/* ===== Auth ===== */
app.post("/auth/register", async (req, reply) => {
  const { email, password, name, userType } = req.body || {};
  if (!email || !password || !name || ![1, 2].includes(userType)) return reply.code(400).send({ error: "fields" });
  if ([...users.values()].some(u => u.email === email)) return reply.code(409).send({ error: "exists" });
  const userId = uuid();
  users.set(userId, { userId, email, name, passHash: password, userType });
  return { ok: true };
});

app.post("/auth/login", async (req, reply) => {
  const { email, password } = req.body || {};
  const user = [...users.values()].find(u => u.email === email && u.passHash === password);
  if (!user) return reply.code(401).send({ error: "invalid" });
  const token = app.jwt.sign({ userId: user.userId, userType: user.userType, name: user.name, email });
  return { token, profile: { userId: user.userId, name: user.name, email, userType: user.userType } };
});

function auth(requiredUserType /* 1 provider, 2 client, undefined both */) {
  return async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      req.user = payload;
      if (requiredUserType && payload.userType !== requiredUserType) {
        return reply.code(403).send({ error: "forbidden" });
      }
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
  };
}

/* ===== Providers ===== */
// seed dev
app.post("/dev/seed/providers", async (req, reply) => {
  const body = req.body || {};
  const providersArr = body.providers || [];
  for (const p of providersArr) {
    const pid = p.providerId;
    const profile = p.profile || {};
    providers.set(pid, {
      providerId: pid,
      name: profile.name || pid,
      serviceType: profile.serviceType || body.serviceType || "plumber",
      lat: profile.lat, lng: profile.lng,
      isOnline: false,
      userId: null,
    });
  }
  return { ok: true, count: providersArr.length };
});

// provider online + perfil
app.post("/providers/register", { preHandler: auth(1) }, async (req, reply) => {
  const { providerId, name, serviceType, lat, lng, isOnline = true } = req.body || {};
  if (!providerId || typeof lat !== "number" || typeof lng !== "number") return reply.code(400).send({ error: "fields" });
  const current = providers.get(providerId) || { providerId };
  providers.set(providerId, { ...current, name, serviceType, lat, lng, isOnline, userId: req.user.userId });
  return { ok: true };
});

// update localização (emite para request ativo)
app.post("/providers/:id/location", { preHandler: auth(1) }, async (req, reply) => {
  const { id } = req.params;
  const { lat, lng } = req.body || {};
  locations.set(id, { lat, lng, ts: Date.now() });
  const r = [...requests.values()].find(x => x.providerId === id && ["accepted", "enroute", "started"].includes(x.status));
  if (r) io.to(`request:${r.requestId}`).emit("provider:location", { lat, lng });
  return { ok: true };
});

// marketplace: todos (online/offline) com preço/distância do ponto do cliente
app.get("/providers/market", async (req, reply) => {
  const lat = Number(req.query.lat ?? -23.5615);
  const lng = Number(req.query.lng ?? -46.656);
  const serviceType = req.query.serviceType;
  const base = { lat, lng };
  const out = [];
  for (const p of providers.values()) {
    if (serviceType && p.serviceType !== serviceType) continue;
    if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
    const dist = H.distanceKm(base, { lat: p.lat, lng: p.lng });
    out.push({
      providerId: p.providerId,
      name: p.name,
      serviceType: p.serviceType,
      isOnline: !!p.isOnline,
      distanceKm: Math.round(dist * 100) / 100,
      price: H.price(dist),
    });
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm);
  reply.send(out);
});

/* ===== Requests (cliente) ===== */
app.post("/requests", { preHandler: auth(2) }, async (req, reply) => {
  const { serviceType, lat, lng, details } = req.body || {};
  if (!serviceType || typeof lat !== "number" || typeof lng !== "number") return reply.code(400).send({ error: "fields" });
  const requestId = uuid();
  const clientId = req.user.userId;
  const r = { requestId, clientId, serviceType, lat, lng, details, status: "pending" };
  requests.set(requestId, r);

  const offers = [];
  for (const p of providers.values()) {
    if (p.serviceType !== serviceType) continue;
    if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
    const dist = H.distanceKm({ lat, lng }, { lat: p.lat, lng: p.lng });
    const offer = {
      offerId: `${requestId}-${p.providerId}`,
      requestId,
      providerId: p.providerId,
      distanceKm: Math.round(dist * 100) / 100,
      etaMin: H.etaMin(dist),
      priceEstimate: H.price(dist),
      isProviderOnline: !!p.isOnline,
    };
    offers.push(offer);
    io.to(`provider:${p.providerId}`).emit("job", {
      clientId, requestId, lat, lng,
      details: details ?? `${serviceType} a ~${offer.distanceKm}km (${offer.etaMin}min)`
    });
  }
  offersByRequest.set(requestId, offers);
  reply.send({ requestId });
});

app.get("/requests/:id/offers", { preHandler: auth(2) }, async (req, reply) => {
  const { id } = req.params;
  reply.send(offersByRequest.get(id) ?? []);
});

app.post("/requests/:id/accept", { preHandler: auth(1) }, async (req, reply) => {
  const { id } = req.params;
  const { providerId } = req.body || {};
  const r = requests.get(id);
  if (!r) return reply.code(404).send({ error: "not_found" });
  if (r.status !== "pending" && r.status !== "offering") return reply.code(409).send({ error: "locked" });
  r.status = "accepted"; r.providerId = providerId;
  requests.set(id, r);
  io.to(`request:${id}`).emit("accepted", { requestId: id, providerId });
  reply.send({ ok: true });
});

app.post("/requests/:id/enroute", { preHandler: auth(1) }, async (req, reply) => {
  const { id } = req.params;
  const r = requests.get(id); if (!r) return reply.code(404).send({ error: "not_found" });
  r.status = "enroute"; requests.set(id, r);
  io.to(`request:${id}`).emit("status", { requestId: id, status: "enroute" });
  reply.send({ ok: true });
});

app.post("/requests/:id/start", { preHandler: auth(1) }, async (req, reply) => {
  const { id } = req.params;
  const r = requests.get(id); if (!r) return reply.code(404).send({ error: "not_found" });
  r.status = "started"; requests.set(id, r);
  io.to(`request:${id}`).emit("status", { requestId: id, status: "started" });
  reply.send({ ok: true });
});

app.post("/requests/:id/complete", { preHandler: auth(1) }, async (req, reply) => {
  const { id } = req.params;
  const r = requests.get(id); if (!r) return reply.code(404).send({ error: "not_found" });
  for await (const _ of req.parts()) { /* noop: salvaria imagem */ }
  r.status = "completed"; requests.set(id, r);
  io.to(`request:${id}`).emit("status", { requestId: id, status: "completed" });
  reply.send({ ok: true });
});

app.post("/requests/:id/rate", { preHandler: auth(2) }, async (req, reply) => {
  const { id } = req.params;
  const { stars = 5, comment = "" } = req.body || {};
  reply.send({ ok: true, requestId: id, stars, comment });
});

/* ===== Start ===== */
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
server.listen({ port: PORT, host: HOST }, () => {
  console.log(`API http://${HOST}:${PORT}  Socket path /socket.io`);
});
