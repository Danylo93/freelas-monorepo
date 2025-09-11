import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import Constants from "expo-constants";

type SocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

type Options = {
  authToken?: string;
  namespace?: string;   // se o backend usa namespace (ex: "/providers")
};

export function useSocket(opts: Options = {}) {
  const { authToken, namespace } = opts;
  const extra = Constants.expoConfig?.extra as any;
  const URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ??
  extra?.socketUrl ??
  ""; 
const PATH =
  (process.env.EXPO_PUBLIC_SOCKET_PATH ?? extra?.socketPath ?? "/socket.io")
    .replace(/^[^/]/, (m: string) => "/" + m);
  const [status, setStatus] = useState<SocketStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const socket = useMemo(() => {
    if (!URL) return null;

    const fullUrl = namespace ? `${URL}${namespace}` : URL;

    const s = io(fullUrl, {
      path: PATH,
      transports: ["websocket"],      // evita fallback/long-polling confuso
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      autoConnect: false,
      auth: authToken ? { token: authToken } : undefined,
      extraHeaders: {
        // se precisar de headers extras/CORS, ajuste aqui
      }
    });

    return s;
  }, [URL, PATH, authToken, namespace]);

  useEffect(() => {
    if (!socket) return;
    socketRef.current = socket;

    const onConnect = () => {
      setStatus("connected");
      setLastError(null);
      // console.log("[socket] connected", socket.id);
    };
    const onDisconnect = (reason: string) => {
      setStatus("disconnected");
      setLastError(reason);
      // console.log("[socket] disconnected:", reason);
    };
    const onConnectError = (err: any) => {
      setStatus("error");
      setLastError(err?.message || String(err));
      // console.log("[socket] connect_error:", err?.message || err);
    };
    const onError = (err: any) => {
      setStatus("error");
      setLastError(err?.message || String(err));
      // console.log("[socket] error:", err?.message || err);
    };
    const onReconnectAttempt = (n: number) => {
      setStatus("connecting");
      // console.log("[socket] reconnect_attempt:", n);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("error", onError);
    socket.io.on("reconnect_attempt", onReconnectAttempt);

    // inicia
    setStatus("connecting");
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("error", onError);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.disconnect();
    };
  }, [socket]);

  return {
    socket,
    status,        // "connecting" | "connected" | "disconnected" | "error"
    lastError,     // motivo do erro/desconexão
    connected: status === "connected"
  };
}
