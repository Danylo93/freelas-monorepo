import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "react-native";
import ProviderScreen from "./src/screens/ProviderScreen";
import ClientScreen from "./src/screens/ClientScreen";
import OffersScreen from "./src/screens/OffersScreen";
import LoginScreen from "./src/screens/LoginScreen";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import OrdersScreen from "./src/screens/OrdersScreen";
import { RequestsProvider } from "./src/contexts/RequestsContext";

export type RootTabParamList = {
  Prestador: undefined;
  Cliente: undefined;
  Ofertas: { requestId?: string } | undefined;
  Pedidos: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function Tabs() {
  const { role } = useAuth();
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      {role === "provider" && (
        <Tab.Screen name="Prestador" component={ProviderScreen} />
      )}
      {role === "client" && (
        <>
          <Tab.Screen name="Cliente" component={ClientScreen} />
          <Tab.Screen name="Pedidos" component={OrdersScreen} />
        </>
      )}
      <Tab.Screen name="Ofertas" component={OffersScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { role } = useAuth();
  if (!role) return <LoginScreen />;
  return <Tabs />;
}

export default function App() {
  return (
    <AuthProvider>
      <RequestsProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" />
          <Root />
        </NavigationContainer>
      </RequestsProvider>
    </AuthProvider>
  );
}

