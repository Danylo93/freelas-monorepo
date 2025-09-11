import React, { useState } from "react";
import { View, TextInput, Text, TouchableOpacity, Alert } from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../state/auth";

export default function Login({ navigation }:any) {
  const { role, setAuth } = useAuth();
  const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const submit = async ()=>{
    try {
      const { token, profile } = await api("/auth/login","POST",{ email, password: pass });
      setAuth({ token, userId: profile.userId, role: profile.userType===1?"provider":"client" });
      navigation.replace(profile.userType===1?"ProviderHome":"ClientHome");
    } catch(e:any){ Alert.alert("Erro", e.message); }
  };
  return (
    <View style={{padding:20, gap:8}}>
      <Text style={{fontSize:20,fontWeight:"700"}}>Login ({role==="provider"?"Prestador":"Cliente"})</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" style={{borderWidth:1,padding:12,borderRadius:10}}/>
      <TextInput placeholder="Senha" value={pass} onChangeText={setPass} secureTextEntry style={{borderWidth:1,padding:12,borderRadius:10}}/>
      <TouchableOpacity onPress={submit} style={{backgroundColor:"#111",padding:12,borderRadius:10,marginTop:8}}>
        <Text style={{color:"#fff",fontWeight:"700",textAlign:"center"}}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}
