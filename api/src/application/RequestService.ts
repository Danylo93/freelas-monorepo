import { nanoid } from "nanoid";
import { redis, PROVIDER_KEY, GEO_KEY, OFFERS_BY_REQUEST_KEY } from "../redis.js";
import { producer } from "../kafka.js";
import { Topics } from "../shared.js";

export class RequestService {
  async createRequest(input: { clientId: string; serviceType: string; lat: number; lng: number; bairro?: string; details?: string; }) {
    const requestId = nanoid();
    const payload = { ...input, requestId, createdAt: new Date().toISOString() };
    await redis.hset(OFFERS_BY_REQUEST_KEY(requestId), { json: JSON.stringify(payload) });
    await producer.send({ topic: Topics.ServiceRequested, messages: [{ key: requestId, value: JSON.stringify(payload) }] });
    return { requestId };
  }

  async acceptRequest(id: string, providerId: string) {
    const lock = await redis.set(OFFERS_BY_REQUEST_KEY(id), providerId, "EX", 30, "NX");
    if (!lock) return false;
    await producer.send({
      topic: Topics.ServiceAccepted,
      messages: [{ key: id, value: JSON.stringify({ requestId: id, providerId, acceptedAt: new Date().toISOString() }) }],
    });
    return true;
  }
}

