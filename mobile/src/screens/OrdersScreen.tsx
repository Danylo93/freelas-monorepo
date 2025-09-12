import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RootTabParamList } from "../../App";
import { useRequests } from "../contexts/RequestsContext";

export default function OrdersScreen() {
  const { requests, completeRequest } = useRequests();
  const nav = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const active = requests.filter(r => r.status !== "completed");

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Pedidos em andamento</Text>
      <FlatList
        data={active}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.serviceType}</Text>
            <Text>Status: {item.status === "accepted" ? "Aceito" : "Aguardando"}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.btn} onPress={() => nav.navigate("Ofertas", { requestId: item.id })}>
                <Text style={styles.btnText}>Ver ofertas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => completeRequest(item.id)}>
                <Text style={styles.btnText}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.sub}>Nenhum pedido em andamento.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  sub: { color: "#666" },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: 12, gap: 4, elevation: 3 },
  cardTitle: { fontWeight: "700" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { flex: 1, backgroundColor: "#111", padding: 10, borderRadius: 10, alignItems: "center" },
  btnSecondary: { backgroundColor: "#444" },
  btnText: { color: "#fff", fontWeight: "700" },
});

