import { Topics } from "./shared.js";
import { consumer } from "./kafka.js";
export async function registerKafkaConsumers(io) {
    await consumer.subscribe({ topic: Topics.ServiceOffer, fromBeginning: false });
    await consumer.subscribe({ topic: Topics.ServiceAccepted, fromBeginning: false });
    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            if (!message.value)
                return;
            const payload = JSON.parse(message.value.toString());
            if (topic === Topics.ServiceOffer) {
                io.to(`request:${payload.requestId}`).emit("offer", payload);
            }
            if (topic === Topics.ServiceAccepted) {
                io.to(`request:${payload.requestId}`).emit("accepted", payload);
            }
        },
    });
}
