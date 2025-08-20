import Redis from "ioredis";
import { config } from "./config";

export const redis = new Redis(config.redisUrl);

export const GEO_KEY = (t: string) => `geo:providers:${t}`;
export const PROVIDER_KEY = (id: string) => `provider:${id}`;
