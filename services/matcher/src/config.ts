export const config = {
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};
