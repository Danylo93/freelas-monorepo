const isProd = process.env.NODE_ENV === "production";

export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  host: process.env.HOST ?? "0.0.0.0",
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  // Allow disabling Kafka regardless of NODE_ENV using USE_REAL_KAFKA
  mockKafka: process.env.USE_REAL_KAFKA !== "true",
  mockRedis: !isProd && process.env.USE_REAL_REDIS !== "true",
};
