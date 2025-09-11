import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert, Image } from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../state/auth";
import { makeSocket } from "../lib/socket";

const GOOGLE = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!;

function distanceKm(a:{lat:number;lng:number}, b:{lat:number;lng:number}) {
  const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const la1=a.lat*Math.PI/180, la2=b.lat*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.sin(dLng/2)**2*Math.cos(la1)*Math.cos(la2);
  return 2*R*Math.asin(Math.sqrt(x));
}

export default function Tracking({ route, navigation }:any) {
  const { role, token, userId } = useAuth();
  const { requestId, client, provider } = route.params;
  const [prov,setProv]=useState(provider?.origin ?? null);
  const [eta,setEta]=useState<number|null>(null);
  const mapRef = useRef<MapView>(null);
  const sck = useRef(makeSocket());

  useEffect(()=>{
    const s = sck.current;
    s.emit("join", `request:${requestId}`);
    s.on("provider:location", ({lat,lng}) => setProv({lat,lng}));
    return ()=>{ s.emit("leave", `request:${requestId}`); s.disconnect(); };
  },[requestId]);

  useEffect(()=>{
    if (prov && mapRef.current) {
      mapRef.current.animateCamera({ center: { latitude:prov.lat, longitude:prov.lng }, pitch:0, heading:0, zoom:15 }, { duration:600 });
    }
  },[prov]);

  const startService = async ()=>{
    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/requests/${requestId}/start`,{ method:"POST", headers:{ Authorization:`Bearer ${token}` }});
    Alert.alert("Serviço iniciado");
  };

  const completeService = async ()=>{
    const pick = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality:0.6 });
    if (pick.canceled) return;
    const form = new FormData();
    form.append("photo", { uri: pick.assets[0].uri, name: "proof.jpg", type: "image/jpeg" } as any);
    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/requests/${requestId}/complete`,{ method:"POST", headers:{ Authorization:`Bearer ${token}` }, body: form as any });
    Alert.alert("Serviço concluído");
    navigation.goBack();
  };

  return (
    <View style={{flex:1}}>
      <MapView ref={mapRef} style={{flex:1}}
        initialRegion={{ latitude: client.lat, longitude: client.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        <Marker coordinate={{latitude:client.lat,longitude:client.lng}} title="Cliente"/>
        {prov && <Marker coordinate={{latitude:prov.lat,longitude:prov.lng}} title="Prestador"/>}
        {prov && (
          <MapViewDirections
            origin={{latitude:prov.lat,longitude:prov.lng}}
            destination={{latitude:client.lat,longitude:client.lng}}
            apikey={GOOGLE}
            strokeWidth={5}
            strokeColor="#111"
            onReady={(res)=>{ setEta(Math.round(res.duration)); mapRef.current?.fitToCoordinates(res.coordinates,{ edgePadding:{ top:120,right:60,bottom:280,left:60 }, animated:true }); }}
          />
        )}
      </MapView>
      <View style={{position:"absolute",bottom:0,left:0,right:0, backgroundColor:"#fff", padding:12, borderTopLeftRadius:16, borderTopRightRadius:16}}>
        <Text style={{fontWeight:"800"}}>{eta ? `Chegada ~ ${eta} min` : "Calculando rota…"}</Text>
        <View style={{flexDirection:"row", gap:8, marginTop:8}}>
          {role==="provider" ? (
            <>
              <TouchableOpacity onPress={startService} style={{flex:1, backgroundColor:"#111", padding:12, borderRadius:10}}>
                <Text style={{color:"#fff",textAlign:"center"}}>Iniciar Serviço</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={completeService} style={{flex:1, backgroundColor:"#0a7", padding:12, borderRadius:10}}>
                <Text style={{color:"#fff",textAlign:"center"}}>Concluir (+foto)</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text>Aguardando o prestador…</Text>
          )}
        </View>
      </View>
    </View>
  );
}
