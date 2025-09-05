import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { config } from "./config.js";

export function setupWebsocket(app: FastifyInstance) {
  const io = new Server(app.server, { cors: { origin: "*" } });
  // Escalável: adapter Redis para múltiplas instâncias
  try {
    if (!config.mockRedis) {
      const pub = new Redis(config.redisUrl);
      const sub = new Redis(config.redisUrl);
      io.adapter(createAdapter(pub, sub));
    }
  } catch (e) {
    // segue sem adapter se falhar
    (app.log as any)?.warn?.({ err: e }, "Redis adapter disabled");
  }
  io.on("connection", socket => {
    socket.on("join", (room: string) => socket.join(room));
  });
  return { io };
}
