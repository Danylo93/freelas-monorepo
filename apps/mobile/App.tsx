import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Platform, View, Text, StyleSheet, Alert,
  TouchableOpacity, ActivityIndicator
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import * as Network from "expo-network";
import io, { Socket } from "socket.io-client";

const API_URL = Platform.select({
  android: "http://10.0.2.2:3001",
  ios: "http://localhost:3001",
  default: "http://localhost:3001",
});

// fallback: Centro de SP teste
const DEFAULT_COORDS = { lat: -23.55052, lng: -46.633308 };

type LatLng = { lat: number; lng: number };

async function safeFetch(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 5000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export default function Home() {
  // --- Hooks sempre no topo ---
  const [providerId] = useState(() => `prov-${Math.floor(Math.random() * 10000)}`);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);

  const [netOnline, setNetOnline] = useState<boolean | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // localização
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          // sem permissão: usa fallback e segue
          setPos(null); // manter null indica que não temos posição precisa
          setGpsLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setGpsLoading(false);
      } catch (e) {
        // erro de GPS: usa fallback e segue
        setPos(null);
        setGpsLoading(false);
      }
    })();
  }, []);

  // rede
  useEffect(() => {
    let sub: Network.NetworkStateSubscription | undefined;
    (async () => {
      const st = await Network.getNetworkStateAsync();
      setNetOnline(Boolean(st.isConnected && st.isInternetReachable));
      sub = Network.addNetworkStateListener((s) =>
        setNetOnline(Boolean(s.isConnected && s.isInternetReachable))
      );
    })();
    return () => sub?.remove();
  }, []);

  // ping API
  const pingApi = async () => {
    try {
      const res = await safeFetch(`${API_URL}/healthz`, { timeoutMs: 2000 });
      setApiOnline(res?.ok ?? false);
    } catch {
      setApiOnline(false);
    }
  };
  useEffect(() => {
    pingApi();
  }, [netOnline]);

  // socket só quando API on
  useEffect(() => {
    if (!apiOnline) {
      if (socketRef.current?.connected) socketRef.current.disconnect();
      return;
    }
    if (!socketRef.current) {
      socketRef.current = io(API_URL!, {
        autoConnect: false,
        transports: ["websocket"],
        reconnectionAttempts: 3,
        reconnectionDelay: 800,
      });
    }
    const s = socketRef.current;
    const onConnectError = () => setApiOnline(false);
    const onDisconnect = () => setApiOnline((prev) => prev ?? false);
    s.on("connect_error", onConnectError);
    s.on("disconnect", onDisconnect);

    s.connect();
    s.emit("join", `provider:${providerId}`);

    return () => {
      s.off("connect_error", onConnectError);
      s.off("disconnect", onDisconnect);
    };
  }, [apiOnline, providerId]);

  const coords = pos ?? DEFAULT_COORDS; // <- SEMPRE definido
  const canCallApi = apiOnline === true;

  const goOnline = async () => {
    if (!pos) {
      Alert.alert("Localização necessária", "Ative a localização para ficar online.");
      return;
    }
    if (!canCallApi) {
      Alert.alert("Sem conexão com a API", "Tente novamente quando ficar online.");
      return;
    }
    try {
      const res = await safeFetch(`${API_URL}/providers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeoutMs: 4000,
        body: JSON.stringify({
          providerId,
          name: "Prestador Demo",
          lat: pos.lat,
          lng: pos.lng,
          radiusKm: 5,
          serviceTypes: ["plumber"],
          bairroWhitelist: ["Vila Carmosina"],
          isOnline: true,
        }),
      });
      if (!res?.ok) throw new Error();
      setIsOnline(true);
      Alert.alert("Online", "Você está visível para clientes elegíveis.");
    } catch {
      Alert.alert("Erro", "Não foi possível ficar online agora.");
    }
  };

  const pushLocation = async () => {
    if (!pos) {
      Alert.alert("Localização necessária", "Ative a localização para enviar sua posição.");
      return;
    }
    if (!canCallApi) {
      Alert.alert("Sem conexão com a API", "Tente novamente quando ficar online.");
      return;
    }
    try {
      const res = await safeFetch(`${API_URL}/providers/${providerId}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeoutMs: 4000,
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng }),
      });
      if (!res?.ok) throw new Error();
    } catch {
      Alert.alert("Erro", "Não foi possível enviar localização.");
    }
  };

  const bannerText = useMemo(() => {
    if (netOnline === false) return "Sem internet";
    if (apiOnline === false) return "API offline — modo navegação";
    return null;
  }, [netOnline, apiOnline]);

  if (gpsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando localização…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f7f7" }}>
      {bannerText && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{bannerText}</Text>
        </View>
      )}

      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* Só coloca o marcador quando tiver posição real do usuário */}
        {pos && (
          <Marker coordinate={{ latitude: pos.lat, longitude: pos.lng }} title="Você" />
        )}
      </MapView>

      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Disponibilidade</Text>
        <Text style={styles.subtitle}>
          ID: <Text style={{ fontWeight: "600" }}>{providerId}</Text>
        </Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, isOnline ? styles.btnOn : styles.btnPrimary]}
            onPress={goOnline}
            disabled={!canCallApi}
          >
            <Text style={styles.btnText}>{isOnline ? "Online ✅" : "Ficar Online"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={pushLocation}
            disabled={!canCallApi}
          >
            <Text style={styles.btnText}>Enviar Localização</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          {canCallApi
            ? "Você está conectado à API. Solicitações elegíveis aparecerão aqui."
            : "Sem conexão com a API — você ainda pode visualizar o mapa e sua posição (aproximação)."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  banner: {
    position: "absolute",
    top: 48,
    alignSelf: "center",
    zIndex: 10,
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    opacity: 0.9,
  },
  bannerText: { color: "white", fontSize: 12 },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 24,
    backgroundColor: "white",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 10,
    gap: 12,
  },
  grabber: {
    width: 48, height: 5, borderRadius: 999,
    backgroundColor: "#ddd", alignSelf: "center", marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666" },
  row: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: "#111" },
  btnSecondary: { backgroundColor: "#444" },
  btnOn: { backgroundColor: "#059669" },
  btnText: { color: "white", fontWeight: "600" },
  hint: { fontSize: 12, color: "#666", marginTop: 8 },
});
