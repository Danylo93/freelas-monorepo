import { Platform } from "react-native";

export const API_URL =
  Platform.select({
    android: "http://172.20.10.2:3000",
    ios: "http://172.20.10.2:3000",
    default: "http://172.20.10.2:3000",
  })!;

export async function apiFetch(path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 7000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, { ...rest, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}
