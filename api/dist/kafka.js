// src/kafka.ts
import { Kafka, logLevel, Partitioners } from "kafkajs";
import { EventEmitter } from "events";
import { config } from "./config.js";
let defaultProducer;
let baseKafka = null;
let consumer;
let isMock = config.mockKafka;
function getKafka() {
    if (!baseKafka) {
        baseKafka = new Kafka({
            clientId: config.kafkaClientId ?? "freelas-api",
            brokers: config.kafkaBrokers,
            ssl: config.kafkaSSL ?? false,
            //   sasl: config.kafkaSASL,
            connectionTimeout: 10000,
            requestTimeout: 30000,
            logLevel: logLevel.INFO,
            retry: { initialRetryTime: 300, retries: 8 },
        });
    }
    return baseKafka;
}
if (isMock) {
    // ----- Mock via EventEmitter -----
    const bus = new EventEmitter();
    const topics = new Set();
    const mockProducer = {
        async connect() { },
        async send({ topic, messages }) {
            for (const msg of messages)
                bus.emit(topic, msg);
        },
        async disconnect() { },
    };
    const mockConsumer = {
        async connect() { },
        async subscribe({ topic }) { topics.add(topic); },
        async run({ eachMessage }) {
            for (const t of topics) {
                bus.on(t, async (m) => {
                    await eachMessage({ topic: t, partition: 0, message: { key: m.key ? Buffer.from(m.key) : undefined, value: m.value ? Buffer.from(m.value) : undefined } });
                });
            }
        },
        async disconnect() { },
    };
    defaultProducer = mockProducer;
    consumer = mockConsumer;
}
else {
    const kafka = getKafka();
    defaultProducer = kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
        allowAutoTopicCreation: true,
    });
    consumer = kafka.consumer({
        groupId: config.kafkaGroupId ?? "api-forward",
        allowAutoTopicCreation: true,
    });
}
async function ensureTopics(topics) {
    if (!topics?.length || isMock)
        return;
    const kafka = getKafka();
    const admin = kafka.admin();
    await admin.connect();
    try {
        await admin.createTopics({
            waitForLeaders: true,
            topics: topics.map(t => ({ topic: t, numPartitions: 1, replicationFactor: 1 })),
        });
    }
    finally {
        await admin.disconnect();
    }
}
const initKafka = async () => {
    try {
        if (!isMock) {
            await Promise.all([defaultProducer.connect(), consumer.connect()]);
            if (config.kafkaEnsureTopics?.length) {
                await ensureTopics(config.kafkaEnsureTopics);
            }
        }
    }
    catch (err) {
        console.warn("Kafka connection failed", err);
    }
};
const shutdownKafka = async () => {
    try {
        if (!isMock)
            await Promise.allSettled([consumer.disconnect(), defaultProducer.disconnect()]);
    }
    catch { }
};
const isKafkaHealthy = async () => {
    if (isMock)
        return true;
    try {
        const admin = getKafka().admin();
        await admin.connect();
        const res = await admin.describeCluster();
        await admin.disconnect();
        return Boolean(res?.brokers?.length);
    }
    catch {
        return false;
    }
};
const createConsumer = (groupId) => {
    if (isMock)
        return consumer; // no mock, reaproveita
    return getKafka().consumer({ groupId, allowAutoTopicCreation: true });
};
export { defaultProducer as producer, consumer, initKafka, shutdownKafka, isKafkaHealthy, createConsumer };
