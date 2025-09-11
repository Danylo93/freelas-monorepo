import { io, Socket } from "socket.io-client";
import Constants from "expo-constants";
const extra = Constants.expoConfig?.extra as any;
const URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? extra?.socketUrl;
const PATH = process.env.EXPO_PUBLIC_SOCKET_PATH ?? extra?.socketPath ?? "/socket.io";
export function makeSocket(): Socket {
  return io(URL!, { path: PATH, transports:["websocket"] });
}
