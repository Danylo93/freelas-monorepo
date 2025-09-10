// src/websocket.ts (ou onde está esse código)
import { Topics } from "./shared.js";
import { consumer } from "./kafka.js";
export async function registerKafkaConsumers(io) {
    await consumer.subscribe({ topic: Topics.ServiceOffer, fromBeginning: false });
    await consumer.subscribe({ topic: Topics.ServiceAccepted, fromBeginning: false });
    await consumer.run({
        // use o tipo do kafkajs (ou remova a anotação e deixe o TS inferir)
        eachMessage: async ({ topic, message }) => {
            // value pode ser Buffer OU null
            const valueStr = message.value?.toString();
            if (!valueStr)
                return;
            const payload = JSON.parse(valueStr);
            if (topic === Topics.ServiceOffer) {
                io.to(`request:${payload.requestId}`).emit("offer", payload);
            }
            else if (topic === Topics.ServiceAccepted) {
                io.to(`request:${payload.requestId}`).emit("accepted", payload);
            }
        },
    });
}
