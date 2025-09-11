import { Platform } from "react-native";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({
    android: "http://10.0.2.2:3000",
    ios: "http://localhost:3000",
    default: "http://192.168.100.3:3000",
  })!;

export async function apiFetch(path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 7000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // simple console log so every request appears in Expo terminal
    console.log(`[apiFetch] ${rest.method ?? 'GET'} ${path}`);
    const res = await fetch(`${API_URL}${path}`, { ...rest, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}
