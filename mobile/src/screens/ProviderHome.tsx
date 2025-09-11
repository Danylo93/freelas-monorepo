import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { useAuth } from "../state/auth";
import { makeSocket } from "../lib/socket";
import { api } from "../lib/api";

export default function ProviderHome({ navigation }:any) {
  const { token, userId } = useAuth();
  const [pos,setPos]=useState<{lat:number;lng:number}|null>(null);
  const [job,setJob]=useState<any|null>(null);
  const socketRef = useRef(makeSocket());

  useEffect(()=>{ (async()=>{
    const { status } = await Location.requestForegroundPermissionsAsync();
    if(status!=="granted") return;
    const l = await Location.getCurrentPositionAsync({});
    const p = { lat:l.coords.latitude, lng:l.coords.longitude };
    setPos(p);
    await api("/providers/register","POST",{ providerId: userId, name:"Meu Perfil", serviceType:"plumber", lat:p.lat, lng:p.lng, isOnline:true }, token!);
  })(); },[]);

  useEffect(()=>{
    if(!userId) return;
    const s = socketRef.current;
    s.emit("join", `provider:${userId}`);
    const onJob = (payload:any)=> setJob(payload);
    s.on("job", onJob);
    return ()=>{ s.emit("leave", `provider:${userId}`); s.off("job", onJob); s.disconnect(); };
  },[userId]);

  const accept = async ()=>{
    if(!job) return;
    await api(`/requests/${job.requestId}/accept`,"POST",{ providerId: userId }, token!);
    navigation.navigate("Tracking",{ requestId: job.requestId, client: {lat:job.lat,lng:job.lng}, provider:{ providerId: userId, origin:pos } });
  };

  return (
    <View style={{flex:1}}>
      <MapView style={{flex:1}} initialRegion={{ latitude: pos?.lat ?? -23.56, longitude: pos?.lng ?? -46.65, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        {pos && <Marker coordinate={{latitude:pos.lat,longitude:pos.lng}} title="Você"/>}
        {job && <Marker coordinate={{latitude:job.lat,longitude:job.lng}} title="Cliente"/>}
      </MapView>
      <View style={{position:"absolute", bottom:0, left:0, right:0, backgroundColor:"#fff", padding:12, borderTopLeftRadius:16, borderTopRightRadius:16}}>
        {job ? (
          <>
            <Text style={{fontWeight:"800"}}>Oferta disponível</Text>
            <Text>{job.details}</Text>
            <View style={{flexDirection:"row", gap:8, marginTop:8}}>
              <TouchableOpacity onPress={()=>setJob(null)} style={{flex:1, backgroundColor:"#ccc", padding:12, borderRadius:10}}><Text>Recusar</Text></TouchableOpacity>
              <TouchableOpacity onPress={accept} style={{flex:1, backgroundColor:"#111", padding:12, borderRadius:10}}><Text style={{color:"#fff",textAlign:"center"}}>Aceitar</Text></TouchableOpacity>
            </View>
          </>
        ) : <Text>Nenhuma oferta ainda…</Text>}
      </View>
    </View>
  );
}
