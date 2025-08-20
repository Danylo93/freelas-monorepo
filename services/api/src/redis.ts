import Redis from "ioredis";
import { config } from "./config.js";

export const redis = new Redis(config.redisUrl);

export const GEO_KEY = (t: string) => `geo:providers:${t}`;
export const PROVIDER_KEY = (id: string) => `provider:${id}`;
export const REQUEST_KEY = (id: string) => `request:${id}`;
export const REQ_LOCK_KEY = (id: string) => `request:${id}:lock`;
