// src/socket.ts
import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { config } from "./config.js";

export type IoExports = {
  io: Server;
  emitToProvider: (providerId: string, event: string, data: any) => void;
  emitToRequest: (requestId: string, event: string, data: any) => void;
};

let ioRef: Server | null = null;

export async function initSocket(app: FastifyInstance): Promise<IoExports> {
  // Fastify expõe o http.Server em app.server
  const io = new Server(app.server, {
    path: "/socket.io",               // mantenha esse path
    transports: ["websocket"],
    cors: {
      origin: [
        "http://localhost:19006",     // Expo Web preview
        "http://127.0.0.1:19006",
        "exp://",                     // apps Expo
        "http://localhost",
        "http://127.0.0.1"
      ],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("join", (room: string, ack?: (x:any)=>void) => {
      socket.join(room);
      ack?.({ ok: true, joined: room });
    });
    socket.on("leave", (room: string) => socket.leave(room));
  });

  ioRef = io;

  const emitToProvider = (providerId: string, event: string, data: any) => {
    io.to(`provider:${providerId}`).emit(event, data);
  };
  const emitToRequest = (requestId: string, event: string, data: any) => {
    io.to(`request:${requestId}`).emit(event, data);
  };

  return { io, emitToProvider, emitToRequest };
}

export function getIO(): Server {
  if (!ioRef) throw new Error("Socket.IO not initialized");
  return ioRef;
}
