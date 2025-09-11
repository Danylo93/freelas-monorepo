import React, { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { useAuth } from "../state/auth";
import { makeSocket } from "../lib/socket";

export default function Offers({ route, navigation }:any) {
  const { token } = useAuth();
  const { requestId } = route.params;
  const socketRef = useRef(makeSocket());
  const [offers,setOffers]=useState<any[]>([]);
  const [status,setStatus]=useState<string>("Aguardando prestador aceitar…");
  const [client,setClient]=useState<{lat:number;lng:number}>({lat:-23.5615,lng:-46.656});
  const [prov,setProv]=useState<{lat:number;lng:number}|null>(null);

  useEffect(()=>{
    const s = socketRef.current;
    s.emit("join", `request:${requestId}`);
    const onOffer = (o:any)=> setOffers(prev=>{
      if(prev.find(x=>x.offerId===o.offerId)) return prev;
      return [o,...prev];
    });
    const onAccepted = ({providerId}:any)=>{ setStatus("Solicitação aceita!"); Alert.alert("Aceita", `Provider: ${providerId}`); };
    const onLoc = ({lat,lng}:any)=> setProv({lat,lng});
    const onStat = ({status}:any)=> setStatus(status);
    s.on("offer", onOffer);
    s.on("accepted", onAccepted);
    s.on("provider:location", onLoc);
    s.on("status", onStat);
    return ()=>{ s.emit("leave", `request:${requestId}`); s.off("offer",onOffer); s.off("accepted",onAccepted); s.off("provider:location",onLoc); s.off("status",onStat); s.disconnect(); };
  },[requestId]);

  const accept = async (o:any)=>{
    try{
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/requests/${requestId}/accept`,{
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ providerId: o.providerId })
      });
      setStatus("Conectado. Aguardando prestador iniciar rota…");
      navigation.navigate("Tracking",{ requestId, client, provider:o });
    }catch(e:any){ Alert.alert("Erro", e.message); }
  };

  return (
    <View style={{flex:1}}>
      <Text style={{padding:12, fontWeight:"700"}}>{status}</Text>
      <FlatList
        data={offers}
        keyExtractor={(i)=>i.offerId}
        renderItem={({item})=>(
          <View style={{padding:12,borderBottomWidth:1,borderColor:"#eee"}}>
            <Text style={{fontWeight:"700"}}>{item.providerId} — R$ {item.priceEstimate} — {item.distanceKm}km ({item.isProviderOnline?"online":"offline"})</Text>
            <TouchableOpacity onPress={()=>accept(item)} style={{marginTop:8, backgroundColor:"#111",padding:10,borderRadius:8}}>
              <Text style={{color:"#fff",textAlign:"center"}}>Aceitar</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
