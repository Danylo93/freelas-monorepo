export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};
