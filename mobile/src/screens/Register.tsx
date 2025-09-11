import React, { useState } from "react";
import { View, TextInput, Text, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../state/auth";
import { api } from "../lib/api";

export default function Register({ navigation }:any) {
  const { role } = useAuth();
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const submit = async ()=> {
    try{
      await api("/auth/register","POST",{ name, email, password:pass, userType: role==="provider"?1:2 });
      Alert.alert("Cadastro ok","Faça login"); navigation.goBack();
    }catch(e:any){ Alert.alert("Erro", e.message); }
  };
  return (
    <View style={{padding:20, gap:8}}>
      <Text style={{fontSize:20,fontWeight:"700"}}>Cadastro ({role==="provider"?"Prestador":"Cliente"})</Text>
      <TextInput placeholder="Nome" value={name} onChangeText={setName} style={{borderWidth:1,padding:12,borderRadius:10}}/>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" style={{borderWidth:1,padding:12,borderRadius:10}}/>
      <TextInput placeholder="Senha" value={pass} onChangeText={setPass} secureTextEntry style={{borderWidth:1,padding:12,borderRadius:10}}/>
      <TouchableOpacity onPress={submit} style={{backgroundColor:"#111",padding:12,borderRadius:10,marginTop:8}}>
        <Text style={{color:"#fff",fontWeight:"700",textAlign:"center"}}>Cadastrar</Text>
      </TouchableOpacity>
    </View>
  );
}
