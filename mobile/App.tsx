import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider } from "./src/state/auth";
import ClientHome from "./src/screens/ClientHome";
import Login from "./src/screens/Login";
import Offers from "./src/screens/Offers";
import ProviderHome from "./src/screens/ProviderHome";
import Register from "./src/screens/Register";
import RoleGate from "./src/screens/RoleGate";
import Tracking from "./src/screens/Tracking";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown:false }}>
          <Stack.Screen name="RoleGate" component={RoleGate}/>
          <Stack.Screen name="Login" component={Login}/>
          <Stack.Screen name="Register" component={Register}/>
          <Stack.Screen name="ClientHome" component={ClientHome}/>
          <Stack.Screen name="Offers" component={Offers}/>
          <Stack.Screen name="ProviderHome" component={ProviderHome}/>
          <Stack.Screen name="Tracking" component={Tracking}/>
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
