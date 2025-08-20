import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config";
import { setupWebsocket } from "./websocket";
import { initKafka } from "./kafka";
import { registerKafkaConsumers } from "./consumers";
import { registerProviderRoutes } from "./routes/providers";
import { registerRequestRoutes } from "./routes/requests";

export async function startServer() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  const { io, httpServer } = setupWebsocket(app);
  await initKafka();
  await registerKafkaConsumers(io);
  registerProviderRoutes(app, io);
  registerRequestRoutes(app, io);
  httpServer.listen(config.port, () => {
    console.log(`API on :${config.port}`);
  });
}
