const isProd = process.env.NODE_ENV === "production";

export const config = {
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  mockKafka: !isProd && process.env.USE_REAL_KAFKA !== "true",
  mockRedis: !isProd && process.env.USE_REAL_REDIS !== "true",
};
