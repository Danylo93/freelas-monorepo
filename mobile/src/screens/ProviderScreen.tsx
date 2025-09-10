import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Alert, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { apiFetch, API_URL } from "../lib/api";
import { useSocket } from "../hooks/useSocket";

type LatLng = { lat: number; lng: number };

const DEFAULT_COORDS = { lat: -23.55052, lng: -46.633308 };

export default function ProviderScreen() {
  const [providerId] = useState(() => `prov-${Math.floor(Math.random() * 10000)}`);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [netOnline, setNetOnline] = useState<boolean | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const { socket, connected } = useSocket();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPos(null); setGpsLoading(false); return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setGpsLoading(false);
    })();
  }, []);

 useEffect(() => {
  // pega o tipo automaticamente a partir da função
  let sub: ReturnType<typeof Network.addNetworkStateListener> | undefined;

  (async () => {
    try {
      const st = await Network.getNetworkStateAsync();
      setNetOnline(!!(st.isConnected && st.isInternetReachable));
    } catch {
      setNetOnline(null);
    }
    sub = Network.addNetworkStateListener((s) => {
      setNetOnline(!!(s.isConnected && s.isInternetReachable));
    });
  })();

  return () => sub?.remove?.();
}, []);

  useEffect(() => {
    (async () => {
      try { const r = await apiFetch("/healthz", { timeoutMs: 2000 }); setApiOnline(r?.ok ?? false); }
      catch { setApiOnline(false); }
    })();
  }, [netOnline]);

  useEffect(() => {
    if (socket && connected) {
      socket.emit("join", `provider:${providerId}`);
    }
  }, [socket, connected, providerId]);

  const coords = pos ?? DEFAULT_COORDS;
  const canCallApi = apiOnline === true;

  const goOnline = async () => {
    if (!pos) { Alert.alert("Localização necessária", "Ative a localização para ficar online."); return; }
    if (!canCallApi) { Alert.alert("API offline", "Tente novamente quando estiver online."); return; }
    try {
      const res = await apiFetch("/providers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          name: "Prestador Demo",
          lat: pos.lat, lng: pos.lng,
          serviceType: "plumber",
          bairroWhitelist: ["Vila Carmosina"],
          isOnline: true
        }),
        timeoutMs: 4000
      });
      if (!res.ok) throw new Error(await res.text());
      setIsOnline(true);
      Alert.alert("Online", "Você está visível para clientes elegíveis.");
    } catch (e: any) {
      Alert.alert("Erro", "Não foi possível ficar online agora.");
    }
  };

  const pushLocation = async () => {
    if (!pos) return;
    try {
      await apiFetch(`/providers/${providerId}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng })
      });
      Alert.alert("OK", "Localização enviada.");
    } catch {
      Alert.alert("Erro", "Falha ao enviar localização.");
    }
  };

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
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: coords.lat, longitude: coords.lng,
          latitudeDelta: 0.02, longitudeDelta: 0.02
        }}
      >
        {pos && <Marker coordinate={{ latitude: pos.lat, longitude: pos.lng }} title="Você" />}
      </MapView>

      <View style={styles.sheet}>
        <Text style={styles.title}>Prestador</Text>
        <Text style={styles.sub}>ID: <Text style={{ fontWeight: "700" }}>{providerId}</Text></Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, isOnline ? styles.btnOn : styles.btnPrimary]} onPress={goOnline} disabled={!canCallApi}>
            <Text style={styles.btnText}>{isOnline ? "Online ✅" : "Ficar Online"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={pushLocation} disabled={!canCallApi}>
            <Text style={styles.btnText}>Enviar Localização</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>{canCallApi ? `Socket: ${connected ? "conectado" : "desconectado"}` : "API offline"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12, elevation: 10 },
  title: { fontSize: 18, fontWeight: "700" },
  sub: { color: "#666" },
  row: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnPrimary: { backgroundColor: "#111" },
  btnSecondary: { backgroundColor: "#444" },
  btnOn: { backgroundColor: "#059669" },
  btnText: { color: "#fff", fontWeight: "700" },
  hint: { color: "#666", fontSize: 12 }
});
