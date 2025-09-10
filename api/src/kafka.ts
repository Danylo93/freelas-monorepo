// src/kafka.ts
import { Kafka, logLevel, Partitioners, Admin, Consumer, Producer } from "kafkajs";
import { EventEmitter } from "events";
import { config } from "./config.js";

let defaultProducer: Producer;
let baseKafka: Kafka | null = null;

export type KafkaExports = {
  producer: Producer;
  consumer: Consumer; // default consumer (mantido por compatibilidade)
  createConsumer: (groupId: string) => Consumer;
  initKafka: () => Promise<void>;
  shutdownKafka: () => Promise<void>;
  isKafkaHealthy: () => Promise<boolean>;
};

let consumer: Consumer;
let isMock = config.mockKafka;

function getKafka(): Kafka {
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
  const topics = new Set<string>();

  const mockProducer = {
    async connect() {},
    async send({ topic, messages }: any) {
      for (const msg of messages) bus.emit(topic, msg);
    },
    async disconnect() {},
  } as unknown as Producer;

  const mockConsumer = {
    async connect() {},
    async subscribe({ topic }: any) { topics.add(topic); },
    async run({ eachMessage }: any) {
      for (const t of topics) {
        bus.on(t, async (m: any) => {
          await eachMessage({ topic: t, partition: 0, message: { key: m.key ? Buffer.from(m.key) : undefined, value: m.value ? Buffer.from(m.value) : undefined }});
        });
      }
    },
    async disconnect() {},
  } as unknown as Consumer;

  defaultProducer = mockProducer;
  consumer = mockConsumer;
} else {
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

async function ensureTopics(topics: string[]) {
  if (!topics?.length || isMock) return;
  const kafka = getKafka();
  const admin: Admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: topics.map(t => ({ topic: t, numPartitions: 1, replicationFactor: 1 })),
    });
  } finally {
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
  } catch (err) {
    console.warn("Kafka connection failed", err);
  }
};

const shutdownKafka = async () => {
  try {
    if (!isMock) await Promise.allSettled([consumer.disconnect(), defaultProducer.disconnect()]);
  } catch {}
};

const isKafkaHealthy = async () => {
  if (isMock) return true;
  try {
    const admin = getKafka().admin();
    await admin.connect();
    const res = await admin.describeCluster();
    await admin.disconnect();
    return Boolean(res?.brokers?.length);
  } catch {
    return false;
  }
};

const createConsumer = (groupId: string): Consumer => {
  if (isMock) return consumer; // no mock, reaproveita
  return getKafka().consumer({ groupId, allowAutoTopicCreation: true });
};

export { defaultProducer as producer, consumer, initKafka, shutdownKafka, isKafkaHealthy, createConsumer };
