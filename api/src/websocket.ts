import { createServer } from "http";
import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";

export function setupWebsocket(app: FastifyInstance) {
  const httpServer = createServer(app as any);
  const io = new Server(httpServer, { cors: { origin: "*" } });
  io.on("connection", socket => {
    socket.on("join", (room: string) => socket.join(room));
  });
  return { io, httpServer };
}
