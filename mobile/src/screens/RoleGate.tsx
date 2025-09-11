import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../state/auth";

export default function RoleGate({ navigation }:any) {
  const { setAuth } = useAuth();
  return (
    <View style={s.c}>
      <Text style={s.h1}>Freelas</Text>
      <TouchableOpacity style={s.btn} onPress={()=>{ setAuth({ role:"client" }); navigation.replace("Login"); }}>
        <Text style={s.bt}>Entrar como Cliente</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btn} onPress={()=>{ setAuth({ role:"provider" }); navigation.replace("Login"); }}>
        <Text style={s.bt}>Entrar como Prestador</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={()=>navigation.navigate("Register")}><Text style={{marginTop:12}}>Cadastro</Text></TouchableOpacity>
    </View>
  );
}
const s=StyleSheet.create({c:{flex:1,justifyContent:"center",alignItems:"center",gap:12},h1:{fontSize:28,fontWeight:"800"},btn:{backgroundColor:"#111",padding:14,borderRadius:12},bt:{color:"#fff",fontWeight:"700"}});
