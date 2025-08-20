import { Topics } from "@freelas/shared";
import type { Server } from "socket.io";
import { consumer } from "./kafka";

export async function registerKafkaConsumers(io: Server) {
  await consumer.subscribe({ topic: Topics.ServiceOffer, fromBeginning: false });
  await consumer.subscribe({ topic: Topics.ServiceAccepted, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
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
