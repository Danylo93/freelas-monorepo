import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSocket } from "../hooks/useSocket";
import { apiFetch } from "../lib/api";
import type { ServiceOffer } from "../types";
import { Audio } from "expo-av";
import AlertModal from "../components/AlertModal";

type RouteParams = { requestId?: string };

export default function OffersScreen() {
  const route = useRoute();
  const { requestId } = (route.params as RouteParams) || {};
  const { socket, connected } = useSocket();
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [accepted, setAccepted] = useState<any | null>(null);
  const [newOfferModal, setNewOfferModal] = useState<{ providerId: string; price: number } | null>(null);


  const loadOffers = async () => {
    if (!requestId) return;
    const res = await apiFetch(`/requests/${requestId}/offers`);
    if (!res.ok) return;
    const data = await res.json();
    setOffers(data.offers ?? []);
  };

  const loadAccepted = async () => {
    if (!requestId) return;
    const res = await apiFetch(`/requests/${requestId}/accepted`);
    if (!res.ok) return;
    const data = await res.json();
    setAccepted(data);
  };

  const onOffer = async (o: ServiceOffer) => {
  setOffers((prev) => {
    const exists = prev.find((x) => x.offerId === o.offerId);
    return exists ? prev : [o, ...prev];
  });
  // abre modal simples + som curto (uma vez só)
  setNewOfferModal({ providerId: o.providerId, price: o.priceEstimate });
};

  useEffect(() => { loadOffers(); loadAccepted(); }, [requestId]);

  useEffect(() => {
  if (!socket || !connected || !requestId) return;
  socket.emit("join", `request:${requestId}`);
  const onOffer = (offer: any) => { /* add na lista */ };
  const onAccepted = (data: any) => { /* UI de aceito */ };
  socket.on("offer", onOffer);
  socket.on("accepted", onAccepted);
  return () => {
    socket.off("offer", onOffer);
    socket.off("accepted", onAccepted);
    socket.emit("leave", `request:${requestId}`);
  };
}, [socket, connected, requestId]);

  const accept = async (offer: ServiceOffer) => {
    if (!requestId) return;
    const res = await apiFetch(`/requests/${requestId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: offer.providerId })
    });
    if (!res.ok) {
      Alert.alert("Erro", "Não foi possível aceitar.");
      return;
    }
    const data = await res.json();
    setAccepted(data.accepted);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Ofertas</Text>
      {!requestId && <Text style={styles.sub}>Crie um pedido na aba Cliente.</Text>}
      {accepted && (
        <View style={styles.accepted}>
          <Text style={{ fontWeight: "700" }}>Aceito:</Text>
          <Text>Provider: {accepted.providerId}</Text>
          <Text>Offer: {accepted.offerId}</Text>
        </View>
      )}

      <FlatList
        data={offers}
        keyExtractor={(item) => item.offerId}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prestador {item.providerId}</Text>
            <Text>Distância: {item.distanceKm.toFixed(2)} km</Text>
            <Text>ETA: {item.etaMin} min</Text>
            <Text>Preço estimado: R$ {item.priceEstimate.toFixed(2)}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => accept(item)}>
              <Text style={styles.btnText}>Aceitar</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: "#666" }}>
          {connected ? "Aguardando ofertas..." : "Conectando..."}</Text>}
      />
        <AlertModal
    visible={!!newOfferModal}
    title="Nova oferta recebida"
    message={
        newOfferModal
        ? `Prestador ${newOfferModal.providerId}\nPreço: R$ ${newOfferModal.price.toFixed(2)}`
        : ""
    }
    confirmText="Ok"
    cancelText="Fechar"
    onConfirm={() => setNewOfferModal(null)}
    onCancel={() => setNewOfferModal(null)}
    playSound
    />
    </View>
    
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  sub: { color: "#666" },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: 12, elevation: 3 },
  cardTitle: { fontWeight: "700", marginBottom: 4 },
  btn: { marginTop: 8, backgroundColor: "#111", padding: 10, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  accepted: { backgroundColor: "#E6FFED", borderRadius: 12, padding: 12, gap: 4 }
});
