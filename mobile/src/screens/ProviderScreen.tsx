import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Alert, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { apiFetch } from "../lib/api";
import { useSocket } from "../hooks/useSocket";
import AlertModal from "../components/AlertModal";
import Constants from "expo-constants";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../contexts/AuthContext";


type Provider = { providerId: string; name?: string; lat?: number; lng?: number; isOnline?: boolean };

type LatLng = { lat: number; lng: number };

const DEFAULT_COORDS = { lat: -23.55052, lng: -46.633308 };
// coloque sua Google API KEY aqui (ou pegue do .env)
const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "SUA_GOOGLE_KEY";

export default function ProviderScreen() {
  const { userId } = useAuth();
  const providerId = userId ?? `prov-${Math.floor(Math.random() * 10000)}`;
  const [pos, setPos] = useState<LatLng | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [netOnline, setNetOnline] = useState<boolean | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const [destination, setDestination] = useState<LatLng | null>(null);
  const [jobModalVisible, setJobModalVisible] = useState(false);
  const [pendingJob, setPendingJob] = useState<{ clientId: string; lat: number; lng: number; distanceKm?: number; price?: number; details?: string } | null>(null);

  
  const mapRef = useRef<MapView>(null);

  const extra = Constants.expoConfig?.extra as any;
  const API_URL = process.env.EXPO_PUBLIC_API_URL ?? extra?.apiUrl ?? "";

  const [providers, setProviders] = useState<Provider[]>([]);
  const [chosenProviderId, setChosenProviderId] = useState<string | null>(null);

  // se seu socket exigir token, passe aqui:
  const { socket, status: socketStatus, lastError, connected } = useSocket({
    authToken: undefined,      // ex: "Bearer x.y.z" se precisar
    namespace: ""              // ex: "/providers" se o backend usa namespace
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setPos(null); setGpsLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setGpsLoading(false);
    })();
  }, []);

  useEffect(() => {
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
      try {
        const r = await apiFetch("/healthz", { timeoutMs: 2000 });
        setApiOnline(r?.ok ?? false);
      } catch { setApiOnline(false); }
    })();
  }, [netOnline]);

  useEffect(() => {
    if (socket && connected) {
      socket.emit("join", `provider:${providerId}`);

      // <<< OPORTUNIDADE: ajuste o nome do evento conforme seu backend >>>
      const onJob = (payload: { clientId: string; lat: number; lng: number; distanceKm?: number; price?: number; details?: string }) => {
        setPendingJob(payload);
        setJobModalVisible(true); // abre modal com som
      };

      socket.on("job", onJob);
      return () => { socket.off("job", onJob); };
    }
  }, [socket, connected, providerId]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/providers?isOnline=true`, { method: "GET" });
        const list = await r.json();
        // normalize se a sua API retorna outro formato
        setProviders(list);
        if (list?.length && !chosenProviderId) {
          setChosenProviderId(list[0].providerId); // assume o primeiro para teste
        }
      } catch (e) {
        console.log("Falha ao carregar providers:", e);
      }
    })();
  }, [API_URL]);

   useEffect(() => {
    if (!socket || !connected || !chosenProviderId) return;
    socket.emit("join", `provider:${chosenProviderId}`, (ack?: any) => {
      // se seu backend envia ack, loga:
      // console.log("join ack:", ack);
    });
    // listener de oportunidades
    const onJob = (payload: { clientId: string; lat: number; lng: number; distanceKm?: number; price?: number; details?: string }) => {
      setPendingJob(payload);
      setJobModalVisible(true);
    };
    socket.on("job", onJob);

    return () => {
      socket.off("job", onJob);
      // se houver "leave":
      socket.emit?.("leave", `provider:${chosenProviderId}`);
    };
  }, [socket, connected, chosenProviderId]);

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
    } catch {
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

  // Aceitar/recusar oportunidade
  const acceptJob = async () => {
    if (!pendingJob) { setJobModalVisible(false); return; }
    setJobModalVisible(false);
    setDestination({ lat: pendingJob.lat, lng: pendingJob.lng });

    // animação “tipo Uber”: primeiro aproxima levemente do prestador,
    // depois o fit na rota ao carregar as direções
    mapRef.current?.animateToRegion({
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    }, 600);
  };

  const rejectJob = () => {
    setJobModalVisible(false);
    setPendingJob(null);
  };

  if (gpsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando localização…</Text>
      </View>
    );
  }

  const origin = { latitude: coords.lat, longitude: coords.lng };
  const dest = destination ? { latitude: destination.lat, longitude: destination.lng } : null;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: coords.lat, longitude: coords.lng,
          latitudeDelta: 0.02, longitudeDelta: 0.02
        }}
      >
        {pos && <Marker coordinate={{ latitude: pos.lat, longitude: pos.lng }} title="Você" />}
        {dest && (
          <>
            <Marker coordinate={dest} title="Cliente" />
            <MapViewDirections
              origin={origin}
              destination={dest}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={5}
              strokeColor="#1E3A8A"
              optimizeWaypoints
              mode="DRIVING"
              onReady={(res) => {
                // fit animado de toda a rota (efeito Uber)
                mapRef.current?.fitToCoordinates(res.coordinates, {
                  edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
                  animated: true
                });
              }}
              onError={(e) => console.log("Directions error:", e)}
            />
          </>
        )}
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
            <Text style={{ marginTop: 8 }}>
          Socket: <Text style={{ fontWeight: "700" }}>{socketStatus}</Text>
          {lastError ? ` — ${lastError}` : ""}
        </Text>      </View>

      <AlertModal
        visible={jobModalVisible}
        title="Nova oportunidade!"
        message={pendingJob ? `Cliente: ${pendingJob.clientId}\nDistância: ${pendingJob.distanceKm?.toFixed(2) ?? "?"} km\nGanho: R$ ${pendingJob.price?.toFixed(2) ?? "?"}\n${pendingJob.details ?? "Detalhes do serviço"}` : ""}
        confirmText="Aceitar"
        cancelText="Recusar"
        onConfirm={acceptJob}
        onCancel={rejectJob}
        playSound
      />
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
