import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "react-native";
import ProviderScreen from "./src/screens/ProviderScreen";
import ClientScreen from "./src/screens/ClientScreen";
import OffersScreen from "./src/screens/OffersScreen";

export type RootTabParamList = {
  Prestador: undefined;
  Cliente: undefined;
  Ofertas: { requestId?: string } | undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Tab.Navigator screenOptions={{ headerShown: true }}>
        <Tab.Screen name="Prestador" component={ProviderScreen} />
        <Tab.Screen name="Cliente" component={ClientScreen} />
        <Tab.Screen name="Ofertas" component={OffersScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
