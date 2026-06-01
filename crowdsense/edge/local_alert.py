# edge/local_alert.py
# Internet-independent alert system.
# Fires when crowd reaches CRITICAL even if the internet is completely down.
# Safe to import on non-Pi systems — GPIO and pygame fail gracefully.

import socket
import logging
from datetime import datetime
from config import GPIO_LED_PIN, LOCAL_ALERT_UDP_PORT, LOCAL_ALERT_ENABLED

logger = logging.getLogger(__name__)
_last_alert_level = None   # prevent repeated alerts for same level


def check_and_fire(person_count: int, crowd_level: str, location_id: str):
    """
    Call this on every reading cycle.
    Fires local alerts only when level changes to HIGH or CRITICAL.
    """
    global _last_alert_level
    if not LOCAL_ALERT_ENABLED:
        return
    if crowd_level == _last_alert_level:
        return   # no change, no repeated alert

    _last_alert_level = crowd_level

    if crowd_level in ("HIGH", "CRITICAL"):
        logger.warning(f"[LOCAL ALERT] {crowd_level} — {person_count} people at {location_id}")
        _write_log(person_count, crowd_level, location_id)
        _broadcast_udp(person_count, crowd_level, location_id)
        if crowd_level == "CRITICAL":
            _flash_led()
            _play_audio()


# ── Alert mechanisms ──────────────────────────────────────────────────────────

def _write_log(count, level, location_id):
    """Always works — just writes to a local file."""
    try:
        with open("data/local_alerts.log", "a") as f:
            f.write(f"{datetime.utcnow().isoformat()}Z | {level} | "
                    f"{count} people | {location_id}\n")
    except Exception as e:
        logger.error(f"[LOCAL ALERT] Log write failed: {e}")


def _broadcast_udp(count, level, location_id):
    """
    UDP broadcast on LAN so other Pi units and a local monitoring laptop
    can receive alerts without any internet.
    """
    try:
        msg = f"CROWD_ALERT:{level}:{location_id}:{count}".encode()
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.sendto(msg, ("<broadcast>", LOCAL_ALERT_UDP_PORT))
        sock.close()
        logger.info(f"[LOCAL ALERT] UDP broadcast sent: {msg.decode()}")
    except Exception as e:
        logger.warning(f"[LOCAL ALERT] UDP broadcast failed (OK on non-LAN): {e}")


def _flash_led():
    """Flash a red LED on GPIO pin — Raspberry Pi only."""
    try:
        import RPi.GPIO as GPIO
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(GPIO_LED_PIN, GPIO.OUT)
        for _ in range(6):
            GPIO.output(GPIO_LED_PIN, GPIO.HIGH)
            __import__("time").sleep(0.3)
            GPIO.output(GPIO_LED_PIN, GPIO.LOW)
            __import__("time").sleep(0.3)
    except (ImportError, RuntimeError):
        pass   # Not on a Pi — silently skip


def _play_audio():
    """Play an alert beep via Pi audio jack."""
    try:
        import pygame
        pygame.mixer.init()
        # Generate a 880 Hz beep programmatically — no audio file needed
        import numpy as np
        sample_rate = 44100
        duration    = 1.5
        t           = np.linspace(0, duration, int(sample_rate * duration))
        wave        = (np.sin(2 * np.pi * 880 * t) * 32767).astype(np.int16)
        stereo      = np.column_stack([wave, wave])
        sound       = pygame.sndarray.make_sound(stereo)
        sound.play()
        __import__("time").sleep(duration)
    except (ImportError, Exception):
        pass   # pygame not installed or no audio device — silently skip