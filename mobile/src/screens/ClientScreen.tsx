import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as Location from "expo-location";
import { apiFetch } from "../lib/api";
import type { ServiceType } from "../types";
import { useNavigation } from "@react-navigation/native";
import type { RootTabParamList } from "../../App";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAuth } from "../contexts/AuthContext";
import { useRequests } from "../contexts/RequestsContext";

export default function ClientScreen() {
  const nav = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [creating, setCreating] = useState(false);
  const { userId } = useAuth();
  const { addRequest, requests } = useRequests();

  const services: { type: ServiceType; label: string }[] = [
    { type: "plumber", label: "Encanador" },
    { type: "electrician", label: "Eletricista" },
    { type: "carpenter", label: "Carpinteiro" },
    { type: "general", label: "Serviço Geral" },
  ];

  const hasActive = (t: ServiceType) =>
    requests.some(r => r.serviceType === t && r.status !== "completed");

  const createRequest = async (serviceType: ServiceType) => {
    setCreating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("Sem permissão de localização.");
      const loc = await Location.getCurrentPositionAsync({});
      const body = {
        clientId: userId ?? "cli-demo",
        serviceType,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        bairro: "Pinheiros",
        details: "Vazamento na pia"
      };

      // check if there are providers available nearby before creating request
      const nearRes = await apiFetch(`/providers/nearby?serviceType=${body.serviceType}&lat=${body.lat}&lng=${body.lng}&radiusKm=8&count=1`);
      const nearData = await nearRes.json();
      if (!nearData?.providers?.length) {
        throw new Error("Nenhum prestador disponível nas proximidades");
      }

      const res = await apiFetch("/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data?.nearest) {
        Alert.alert(
          "Prestador disponível",
          `Distância: ${data.nearest.distanceKm.toFixed(2)} km\nValor estimado: R$ ${data.nearest.priceEstimate.toFixed(2)}`,
          [ { text: "OK", onPress: () => nav.navigate("Ofertas", { requestId: data.requestId }) } ]
        );
      } else {
        nav.navigate("Ofertas", { requestId: data.requestId });
      }
      addRequest(data.requestId, serviceType);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível criar pedido.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Cliente</Text>
      <Text style={styles.sub}>Crie um pedido no seu local atual e veja ofertas chegando em tempo real.</Text>
      {services.map((s) => (
        <TouchableOpacity
          key={s.type}
          style={[styles.btn, hasActive(s.type) && styles.btnDisabled]}
          onPress={() => createRequest(s.type)}
          disabled={creating || hasActive(s.type)}
        >
          <Text style={styles.btnText}>{s.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  sub: { color: "#666" },
  btn: { backgroundColor: "#111", padding: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  btnDisabled: { opacity: 0.5 }
});
