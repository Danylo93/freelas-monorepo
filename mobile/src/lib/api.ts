import Constants from "expo-constants";
const extra = Constants.expoConfig?.extra as any;
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? extra?.apiUrl;
export async function api(path:string, method="GET", body?:any, token?:string) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type":"application/json",
      ...(token?{Authorization:`Bearer ${token}`}:{})
    },
    body: body?JSON.stringify(body):undefined
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
