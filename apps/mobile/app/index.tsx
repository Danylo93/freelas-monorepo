import React, { useEffect, useRef, useState } from "react";
import { Platform, View, Text, Button, StyleSheet, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import io from "socket.io-client";

const API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";

export default function Home() {
  const [providerId] = useState(() => `prov-${Math.floor(Math.random() * 10000)}`);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão negada", "Precisamos da localização para funcionar.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    const s = io(API_URL);
    socketRef.current = s;
    s.emit("join", `provider:${providerId}`);
    return () => { s.disconnect(); };
  }, [providerId]);

  const goOnline = async () => {
    if (!pos) return;
    await fetch(`${API_URL}/providers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        name: "Prestador Demo",
        lat: pos.lat,
        lng: pos.lng,
        radiusKm: 5,
        serviceTypes: ["plumber"],
        bairroWhitelist: ["Vila Carmosina"],
        isOnline: true
      })
    });
    Alert.alert("Online", "Você está visível para clientes elegíveis.");
  };

  const pushLocation = async () => {
    if (!pos) return;
    await fetch(`${API_URL}/providers/${providerId}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: pos.lat, lng: pos.lng })
    });
  };

  if (!pos) {
    return (
      <View style={styles.center}>
        <Text>Carregando localização…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: pos.lat,
          longitude: pos.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        }}
      >
        <Marker coordinate={{ latitude: pos.lat, longitude: pos.lng }} title="Você" />
      </MapView>
      <View style={styles.panel}>
        <Text>ID: {providerId}</Text>
        <Button title="Ficar Online" onPress={goOnline} />
        <View style={{ height: 8 }} />
        <Button title="Enviar Localização" onPress={pushLocation} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  panel: { padding: 12, backgroundColor: "white" }
});
