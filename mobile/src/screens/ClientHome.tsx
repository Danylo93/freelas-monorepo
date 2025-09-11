import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, Modal } from "react-native";
import * as Location from "expo-location";
import { api } from "../lib/api";
import { useAuth } from "../state/auth";

export default function ClientHome({ navigation }:any) {
  const { token } = useAuth();
  const [pos,setPos]=useState<{lat:number;lng:number}|null>(null);
  const [list,setList]=useState<any[]>([]);
  const [sel,setSel]=useState<any|null>(null);
  const [requestId,setRequestId]=useState<string|null>(null);
  const [status,setStatus]=useState<string>("");

  useEffect(()=>{ (async()=>{
    const { status } = await Location.requestForegroundPermissionsAsync();
    if(status!=="granted") return;
    const l = await Location.getCurrentPositionAsync({});
    setPos({ lat:l.coords.latitude, lng:l.coords.longitude });
  })(); },[]);

  const loadMarket = async ()=>{
    if(!pos) return;
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/providers/market?lat=${pos.lat}&lng=${pos.lng}`);
    setList(await res.json());
  };

  useEffect(()=>{ if(pos) loadMarket(); },[pos]);

  const confirm = async ()=>{
    if(!pos || !sel) return;
    setStatus("Solicitando serviço…");
    try{
      const r = await api("/requests","POST",{ serviceType: sel.serviceType, lat: pos.lat, lng: pos.lng, details: "Descrição do cliente" }, token!);
      setRequestId(r.requestId);
      setStatus("Aguardando prestador aceitar… conectando você ao prestador");
      navigation.navigate("Offers",{ requestId: r.requestId, initialStatus: status });
    }catch(e:any){ Alert.alert("Erro", e.message); }
  };

  return (
    <View style={{flex:1,padding:12}}>
      <Text style={{fontWeight:"800",fontSize:18, marginBottom:8}}>Prestadores próximos (online/offline)</Text>
      <FlatList
        data={list}
        keyExtractor={(i)=>i.providerId}
        renderItem={({item})=>(
          <TouchableOpacity style={{padding:12,borderWidth:1,borderColor:"#ddd",borderRadius:12, marginBottom:8}}
            onPress={()=>setSel(item)}>
            <Text style={{fontWeight:"700"}}>{item.serviceType} — R$ {item.price}, {item.distanceKm}km — {item.isOnline?"online":"offline"}</Text>
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
      <Modal visible={!!sel} transparent animationType="slide">
        <View style={{flex:1,backgroundColor:"#0008",justifyContent:"center",padding:16}}>
          <View style={{backgroundColor:"#fff",borderRadius:16,padding:16,gap:8}}>
            <Text style={{fontWeight:"700",fontSize:16}}>Confirmar solicitação?</Text>
            {sel && <Text>{sel.name} — {sel.serviceType} — {sel.distanceKm}km — {sel.isOnline?"online":"offline"}</Text>}
            <View style={{flexDirection:"row",gap:8,marginTop:8}}>
              <TouchableOpacity style={{flex:1,backgroundColor:"#ccc",padding:12,borderRadius:10}} onPress={()=>setSel(null)}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={{flex:1,backgroundColor:"#111",padding:12,borderRadius:10}} onPress={confirm}><Text style={{color:"#fff",textAlign:"center"}}>Confirmar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
