import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn("[NOTIF] Push notifications require a physical device.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[NOTIF] Push notification permission denied.");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("[NOTIF] Expo push token:", token);
  return token;
}

export function addNotificationListener(handler) {
  return Notifications.addNotificationReceivedListener(handler);
}
