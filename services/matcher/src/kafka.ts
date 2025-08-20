import { Kafka } from "kafkajs";
import { config } from "./config";

const kafka = new Kafka({ clientId: "freelas-matcher", brokers: config.kafkaBrokers });

export const consumer = kafka.consumer({ groupId: "matcher" });
export const producer = kafka.producer();

export async function initKafka() {
  await consumer.connect();
  await producer.connect();
}
