import { useEffect, useState, useRef } from "react";
import { Client } from "@stomp/stompjs";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

// Shared singleton client — prevents duplicate connections across re-renders
let sharedClient = null;
const subscribers = new Set();

function getOrCreateClient(onMessage) {
  if (sharedClient && sharedClient.connected) {
    return sharedClient;
  }

  const wsUrl = BACKEND_URL.replace(/^http/, "ws") + "/ws/websocket";

  sharedClient = new Client({
    brokerURL: wsUrl,
    reconnectDelay: 5000,
    onConnect: () => {
      console.log("[WS] Connected to CrowdSense backend");
      sharedClient.subscribe("/topic/crowd", (msg) => {
        try {
          const data = JSON.parse(msg.body);
          subscribers.forEach((cb) => cb({ type: "crowd", data }));
        } catch (e) {
          console.warn("[WS] Bad crowd message", e);
        }
      });
      sharedClient.subscribe("/topic/alerts", (msg) => {
        try {
          const data = JSON.parse(msg.body);
          subscribers.forEach((cb) => cb({ type: "alert", data }));
        } catch (e) {
          console.warn("[WS] Bad alert message", e);
        }
      });
    },
    onDisconnect: () => console.log("[WS] Disconnected"),
    onStompError: (frame) => console.error("[WS] STOMP error:", frame),
  });

  sharedClient.activate();
  return sharedClient;
}

export function useWebSocket() {
  const [latestCrowdUpdate, setLatestCrowdUpdate] = useState(null);
  const [latestAlert, setLatestAlert] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const handler = ({ type, data }) => {
      if (type === "crowd") {
        setLatestCrowdUpdate(data);
        setConnected(true);
      } else if (type === "alert") {
        setLatestAlert(data);
      }
    };

    subscribers.add(handler);
    getOrCreateClient(handler);

    return () => {
      subscribers.delete(handler);
    };
  }, []);

  return { latestCrowdUpdate, latestAlert, connected };
}