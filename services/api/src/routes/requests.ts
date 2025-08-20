import { FastifyInstance } from "fastify";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Server } from "socket.io";
import { Topics } from "@freelas/shared";
import { redis, REQUEST_KEY, REQ_LOCK_KEY } from "../redis";
import { producer } from "../kafka";

export function registerRequestRoutes(app: FastifyInstance, io: Server) {
  app.post("/requests", async (req, rep) => {
    const schema = z.object({
      clientId: z.string(),
      serviceType: z.string(),
      lat: z.number(),
      lng: z.number(),
      bairro: z.string().optional(),
      details: z.string().optional(),
    });
    const r = schema.parse(req.body);
    const requestId = nanoid();
    const payload = { ...r, requestId, createdAt: new Date().toISOString() };
    await redis.hset(REQUEST_KEY(requestId), { json: JSON.stringify(payload) });
    await producer.send({ topic: Topics.ServiceRequested, messages: [{ key: requestId, value: JSON.stringify(payload) }] });
    io.to(`request:${requestId}`).emit("request:created", payload);
    return { ok: true, requestId };
  });

  app.post("/requests/:id/accept", async (req, rep) => {
    const { id } = req.params as any;
    const { providerId } = z.object({ providerId: z.string() }).parse(req.body);
    const lock = await redis.set(REQ_LOCK_KEY(id), providerId, "EX", 30, "NX");
    if (!lock) return rep.status(409).send({ ok: false, reason: "Already accepted" });
    await producer.send({
      topic: Topics.ServiceAccepted,
      messages: [{ key: id, value: JSON.stringify({ requestId: id, providerId, acceptedAt: new Date().toISOString() }) }],
    });
    io.to(`request:${id}`).emit("accepted", { requestId: id, providerId });
    return { ok: true };
  });
}
