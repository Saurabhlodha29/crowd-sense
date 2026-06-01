# edge/mqtt_client.py
# Publishes crowd readings to a local Mosquitto MQTT broker.
# Works entirely offline — no internet needed.
# The Spring Boot backend subscribes to this same broker via MqttConfig.java.

import json
import logging
from config import MQTT_BROKER, MQTT_PORT, MQTT_TOPIC, MQTT_ENABLED

logger = logging.getLogger(__name__)
_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    try:
        import paho.mqtt.client as mqtt

        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                logger.info(f"[MQTT] Connected to broker at {MQTT_BROKER}:{MQTT_PORT}")
            else:
                logger.warning(f"[MQTT] Connection failed (rc={rc})")

        def on_disconnect(client, userdata, rc):
            logger.warning(f"[MQTT] Disconnected (rc={rc}) — will auto-reconnect")

        c = mqtt.Client(client_id="crowdsense-edge", clean_session=True)
        c.on_connect    = on_connect
        c.on_disconnect = on_disconnect
        c.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=60)
        c.loop_start()   # background thread
        _client = c
        return c
    except Exception as e:
        logger.warning(f"[MQTT] Setup failed: {e}")
        return None


def publish(reading: dict) -> bool:
    """
    Publish a crowd reading dict to the MQTT broker.
    Returns True on success, False if broker is unreachable.
    """
    if not MQTT_ENABLED:
        return False
    client = _get_client()
    if client is None:
        return False
    try:
        payload = json.dumps(reading)
        result  = client.publish(MQTT_TOPIC, payload, qos=1, retain=False)
        if result.rc == 0:
            return True
        logger.warning(f"[MQTT] Publish failed (rc={result.rc})")
        return False
    except Exception as e:
        logger.warning(f"[MQTT] Publish error: {e}")
        return False


def stop():
    """Graceful shutdown — call at process exit."""
    global _client
    if _client:
        _client.loop_stop()
        _client.disconnect()
        _client = None