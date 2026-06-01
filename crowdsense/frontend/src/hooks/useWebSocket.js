// frontend/src/hooks/useWebSocket.js
import { useEffect, useState, useRef } from "react";
import {
  connectWebSocket,
  onCrowdUpdate,
  onAlert,
  onSensorStatus,
} from "../api/websocketClient";

export function useWebSocket() {
  const [latestCrowd,   setLatestCrowd]   = useState(null);
  const [latestAlert,   setLatestAlert]   = useState(null);
  const [sensorStatus,  setSensorStatus]  = useState(null);
  const [connected,     setConnected]     = useState(false);

  // Crowd readings keyed by locationId for easy lookup
  const [crowdMap, setCrowdMap] = useState({});

  useEffect(() => {
    connectWebSocket();

    const unsubCrowd  = onCrowdUpdate((data) => {
      setLatestCrowd(data);
      setConnected(true);
      setCrowdMap((prev) => ({ ...prev, [data.locationId]: data }));
    });

    const unsubAlert  = onAlert((data) => {
      setLatestAlert(data);
    });

    const unsubSensor = onSensorStatus((data) => {
      setSensorStatus(data);
    });

    return () => {
      unsubCrowd();
      unsubAlert();
      unsubSensor();
    };
  }, []);

  return { latestCrowd, latestAlert, sensorStatus, connected, crowdMap };
}