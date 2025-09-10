const toBool = (v, def = false) => v === undefined ? def : v.toLowerCase() === "true";
export const config = {
    // Kafka
    mockKafka: toBool(process.env.MOCK_KAFKA, false),
    kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:19092")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    kafkaClientId: process.env.KAFKA_CLIENT_ID ?? "freelas-api",
    kafkaGroupId: process.env.KAFKA_GROUP_ID ?? "api-forward",
    kafkaSSL: toBool(process.env.KAFKA_SSL, false),
    kafkaSASL: process.env.KAFKA_SASL_MECH
        ? {
            mechanism: process.env.KAFKA_SASL_MECH,
            username: process.env.KAFKA_SASL_USERNAME ?? "",
            password: process.env.KAFKA_SASL_PASSWORD ?? "",
        }
        : undefined,
    kafkaEnsureTopics: (process.env.KAFKA_TOPICS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    // Redis
    mockRedis: toBool(process.env.MOCK_REDIS, false),
    // default amigável: se estiver rodando sua API no mesmo compose da imagem redis, use "redis://redis:6379".
    // Se estiver no host/WSL, use "redis://localhost:6379".
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    // HTTP
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? 3000),
};
