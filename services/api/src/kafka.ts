import { Kafka } from "kafkajs";
import { EventEmitter } from "events";
import { config } from "./config.js";

let producer: any;
let consumer: any;
let initKafka: () => Promise<void>;

if (config.mockKafka) {
  const bus = new EventEmitter();
  producer = {
    async connect() {},
    async send({ topic, messages }: any) {
      for (const msg of messages) bus.emit(topic, msg);
    },
    async disconnect() {},
  };
  const topics = new Set<string>();
  consumer = {
    async connect() {},
    async subscribe({ topic }: any) {
      topics.add(topic);
    },
    async run({ eachMessage }: any) {
      for (const t of topics) {
        bus.on(t, async (m: any) => {
          await eachMessage({
            topic: t,
            partition: 0,
            message: {
              key: m.key ? Buffer.from(m.key) : undefined,
              value: m.value ? Buffer.from(m.value) : undefined,
            },
          });
        });
      }
    },
    async disconnect() {},
  };
  initKafka = async () => {};
} else {
  const kafka = new Kafka({ clientId: "freelas-api", brokers: config.kafkaBrokers });
  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: "api-forward" });
  initKafka = async () => {
    try {
      await producer.connect();
      await consumer.connect();
    } catch (err) {
      console.warn("Kafka connection failed", err);
    }
  };
}

export { producer, consumer, initKafka };
