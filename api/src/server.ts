// src/server.ts
import Fastify from "fastify";
import { config } from "./config.js";
import matcherRoutes from "./routes/matcher.js";
import { initKafka } from "./kafka.js";
import { startMatcherEngine, startOfferCollector } from "./matcher/engine.js";

export async function buildApp() {
  const app = Fastify({ logger: false });
  app.get("/healthz", async () => ({ ok: true }));

  await app.register(matcherRoutes);
  return app;
}

async function main() {
  await initKafka();
  // inicia os background workers
  await Promise.all([ startMatcherEngine(), startOfferCollector() ]);

  const app = await buildApp();
  await app.listen({ port: config.port, host: config.host });
  console.log(`API on http://${config.host}:${config.port}`);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => { console.error(err); process.exit(1); });
}
