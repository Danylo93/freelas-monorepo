import { Kafka } from "kafkajs";
import { config } from "./config.js";

const kafka = new Kafka({ clientId: "freelas-api", brokers: config.kafkaBrokers });

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "api-forward" });

export async function initKafka() {
  await producer.connect();
  await consumer.connect();
}
