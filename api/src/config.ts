const isProd = process.env.NODE_ENV === "production";

function envBool(name: string, fallback: boolean) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v.toLowerCase() === "true";
}

// Defaults aligned with ArgoCD/K8s manifests
const defaultBrokers = isProd
  ? "redpanda.freelas.svc.cluster.local:9092"
  : "localhost:19092"; // dev/local

const useRealKafka = envBool("USE_REAL_KAFKA", isProd);
const useRealRedis = envBool("USE_REAL_REDIS", isProd);

export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  host: process.env.HOST ?? "0.0.0.0",
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? defaultBrokers).split(","),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  // Mock flags (Kafka/Redis) with sensible prod defaults
  mockKafka: !useRealKafka,
  mockRedis: !useRealRedis,
};
