import { createServer } from "http";
import { Server } from "socket.io";
export function setupWebsocket(app) {
    const httpServer = createServer(app);
    const io = new Server(httpServer, { cors: { origin: "*" } });
    io.on("connection", socket => {
        socket.on("join", (room) => socket.join(room));
    });
    return { io, httpServer };
}
