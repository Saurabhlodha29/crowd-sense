import { useEffect, useState, useRef } from "react";
import { Client } from "@stomp/stompjs";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

let sharedClient = null;
const listeners = new Set();
const alertListeners = new Set();

function getClient() {
  if (sharedClient) return sharedClient;
  
  const wsUrl = BACKEND_URL.replace(/^http/, 'ws') + "/ws/websocket";
  
  sharedClient = new Client({
    brokerURL: wsUrl,
    onConnect: () => {
      sharedClient.subscribe("/topic/crowd", (msg) => {
        const data = JSON.parse(msg.body);
        listeners.forEach((fn) => fn(data));
      });
      sharedClient.subscribe("/topic/alerts", (msg) => {
        const data = JSON.parse(msg.body);
        alertListeners.forEach((fn) => fn(data));
      });
    },
    onStompError: () => {},
    reconnectDelay: 5000,
  });
  sharedClient.activate();
  return sharedClient;
}

export function useWebSocket(onCrowdUpdate, onAlertUpdate) {
  const [connected, setConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);

  useEffect(() => {
    const client = getClient();

    const crowdFn = (data) => {
      setConnected(true);
      setLastHeartbeat(new Date().toISOString());
      onCrowdUpdate && onCrowdUpdate(data);
    };
    const alertFn = (data) => {
      onAlertUpdate && onAlertUpdate(data);
    };

    listeners.add(crowdFn);
    alertListeners.add(alertFn);

    // Check connection state
    const poll = setInterval(() => {
      setConnected(client.connected);
    }, 2000);

    return () => {
      listeners.delete(crowdFn);
      alertListeners.delete(alertFn);
      clearInterval(poll);
    };
  }, [onCrowdUpdate, onAlertUpdate]);

  return { connected, lastHeartbeat };
}
