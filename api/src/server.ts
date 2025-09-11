// src/server.ts
import Fastify from "fastify";
import { config } from "./config.js";
import matcherRoutes from "./routes/matcher.js";
import { initKafka } from "./kafka.js";
import { startMatcherEngine, startOfferCollector } from "./matcher/engine.js";
import { initSocket } from "./socket.js"; // <-- NOVO
import devRoutes from "./routes/dev.js";

export async function buildApp() {
  const app = Fastify({ logger: false });
  app.get("/healthz", async () => ({ ok: true }));

  await app.register(matcherRoutes);
  await app.register(devRoutes);
  return app;
}

async function main() {
  await initKafka();
  await Promise.all([ startMatcherEngine(), startOfferCollector() ]);

  const app = await buildApp();

  await app.listen({ port: config.port, host: config.host });
  console.log(`API on http://${config.host}:${config.port}`);

  // **inicializa Socket.IO em cima do http.Server do Fastify**
  await initSocket(app);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => { console.error(err); process.exit(1); });
}
