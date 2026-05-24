import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "react-native";

import HomeScreen from "./screens/HomeScreen.jsx";
import MapScreen from "./screens/MapScreen.jsx";
import AlertsScreen from "./screens/AlertsScreen.jsx";
import SettingsScreen from "./screens/SettingsScreen.jsx";

const Tab = createBottomTabNavigator();

const THEME = {
  colors: {
    background: "#0a0e1a",
    card: "#111827",
    text: "#e8edf5",
    border: "#1e2d45",
    notification: "#ef4444",
    primary: "#3b82f6",
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={THEME}>
        <StatusBar style="light" backgroundColor="#0a0e1a" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              const icons = { Home: "⬤", Map: "◉", Alerts: "⚠", Settings: "⚙" };
              return <Text style={{ fontSize: size * 0.7, color }}>{icons[route.name]}</Text>;
            },
            tabBarActiveTintColor: "#3b82f6",
            tabBarInactiveTintColor: "#4a5568",
            tabBarStyle: {
              backgroundColor: "#111827",
              borderTopColor: "#1e2d45",
              height: 60,
              paddingBottom: 8,
            },
            headerStyle: { backgroundColor: "#0d1220" },
            headerTintColor: "#e8edf5",
            headerTitleStyle: { fontWeight: "bold" },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: "CrowdSense" }} />
          <Tab.Screen name="Map" component={MapScreen} />
          <Tab.Screen name="Alerts" component={AlertsScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
