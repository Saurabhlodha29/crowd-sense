// frontend/src/hooks/useGeolocation.js
import { useState, useEffect } from "react";

export function useGeolocation() {
  const [location,   setLocation]   = useState(null);
  const [permission, setPermission] = useState("unknown");
  const [error,      setError]      = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      return;
    }
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        setPermission(result.state);
        if (result.state === "granted") {
          _fetch();
        }
        result.onchange = () => setPermission(result.state);
      })
      .catch(() => setPermission("unknown"));
  }, []);

  function _fetch() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermission("granted");
        setError(null);
      },
      (err) => {
        setError(err.message);
        setPermission("denied");
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  // Watch position for routing updates
  function startTracking(onUpdate) {
    if (!navigator.geolocation) return () => {};
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        onUpdate?.(loc);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }

  return { location, permission, error, requestLocation: _fetch, startTracking };
}