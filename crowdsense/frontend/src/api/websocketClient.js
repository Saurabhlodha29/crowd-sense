// frontend/src/api/websocketClient.js
import { Client } from "@stomp/stompjs";

const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
const WS_URL = BASE.replace(/^http/, "ws") + "/ws/websocket";

let client = null;
const handlers = { crowd: [], alerts: [], sensorStatus: [] };

export function connectWebSocket() {
  if (client && client.active) return;

  client = new Client({
    brokerURL:       WS_URL,
    reconnectDelay:  5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log("[WS] Connected to CrowdSense backend");

      client.subscribe("/topic/crowd", (msg) => {
        const data = JSON.parse(msg.body);
        handlers.crowd.forEach((fn) => fn(data));
      });

      client.subscribe("/topic/alerts", (msg) => {
        const data = JSON.parse(msg.body);
        handlers.alerts.forEach((fn) => fn(data));
      });

      client.subscribe("/topic/sensor-status", (msg) => {
        const data = JSON.parse(msg.body);
        handlers.sensorStatus.forEach((fn) => fn(data));
      });
    },

    onDisconnect: () => console.warn("[WS] Disconnected — will retry"),
    onStompError: (frame) => console.error("[WS] STOMP error:", frame.headers?.message),
  });

  client.activate();
}

export function subscribeEventTopic(eventId, callback) {
  if (!client || !client.active) return () => {};
  const sub = client.subscribe(`/topic/events/${eventId}`, (msg) => {
    callback(JSON.parse(msg.body));
  });
  return () => sub.unsubscribe();
}

export function onCrowdUpdate(fn)      { handlers.crowd.push(fn);        return () => { handlers.crowd        = handlers.crowd.filter(h => h !== fn); }; }
export function onAlert(fn)           { handlers.alerts.push(fn);       return () => { handlers.alerts       = handlers.alerts.filter(h => h !== fn); }; }
export function onSensorStatus(fn)    { handlers.sensorStatus.push(fn); return () => { handlers.sensorStatus = handlers.sensorStatus.filter(h => h !== fn); }; }

export function disconnectWebSocket() {
  if (client) { client.deactivate(); client = null; }
}