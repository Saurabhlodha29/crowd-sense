# edge/wifi_probe.py
# WiFi probe crowd counter.
#
# REAL MODE (Raspberry Pi):
#   Uses Scapy to passively sniff 802.11 probe requests.
#   Counts unique MAC addresses in a sliding 60-second window.
#   Applies RSSI-based zone estimation and device-to-person correction factor.
#
# SIMULATION MODE (Laptop):
#   CorrelatedWiFiSimulator generates counts that track the camera count
#   with realistic noise, so the fusion engine has believable inputs.

import time
import hashlib
import logging
import threading
from config import SENSOR_MODE

logger = logging.getLogger(__name__)


# ── Real probe (Raspberry Pi with WiFi adapter in monitor mode) ───────────────

class RealWiFiProbe:
    WINDOW_SECONDS = 60
    CORRECTION_CLOSE = 0.80   # MACs with RSSI > -60 dBm (within ~10 m)
    CORRECTION_FAR   = 0.60   # MACs with RSSI ≤ -60 dBm (farther away)

    def __init__(self, interface: str = "wlan1"):
        self.interface = interface
        self._mac_timestamps: dict = {}
        self._mac_rssi:       dict = {}
        self._lock = threading.Lock()

    def start(self):
        from scapy.all import sniff, Dot11
        logger.info(f"[WIFI] Starting probe on {self.interface}")
        threading.Thread(
            target=lambda: sniff(
                iface=self.interface,
                prn=self._process_packet,
                store=False,
            ),
            daemon=True,
        ).start()

    def _process_packet(self, pkt):
        from scapy.all import Dot11
        if pkt.haslayer(Dot11):
            mac = pkt.addr2
            if not mac or mac == "ff:ff:ff:ff:ff:ff":
                return
            # Anonymise: SHA-256 → first 12 hex chars
            anon = hashlib.sha256(mac.encode()).hexdigest()[:12]
            with self._lock:
                self._mac_timestamps[anon] = time.time()
                if hasattr(pkt, "dBm_AntSignal"):
                    self._mac_rssi[anon] = pkt.dBm_AntSignal

    def get_count(self) -> tuple:
        """Returns (corrected_person_estimate, raw_mac_count)."""
        cutoff = time.time() - self.WINDOW_SECONDS
        with self._lock:
            active = {m: t for m, t in self._mac_timestamps.items() if t > cutoff}

        close = sum(1 for m in active if self._mac_rssi.get(m, -100) > -60)
        far   = len(active) - close

        corrected = int(close * self.CORRECTION_CLOSE + far * self.CORRECTION_FAR)
        return corrected, len(active)


# ── Simulation probe ──────────────────────────────────────────────────────────

class CorrelatedWiFiSimulator:
    """
    Generates WiFi MAC counts that CORRELATE with a given camera count series.
    Not random — follows the same crowd pattern with ±10 % noise.
    Makes the fusion engine receive believable, correlated inputs.
    """

    # Approx fraction of people detectable via WiFi probes
    # (some have WiFi off, some have 2 devices, etc.)
    DETECTION_RATIO = 0.42

    def __init__(self):
        self._last_camera_count = 0

    def update_reference(self, camera_count: int):
        """Feed latest camera estimate so WiFi stays correlated."""
        self._last_camera_count = camera_count

    def get_count(self) -> tuple:
        import random
        base = self._last_camera_count * self.DETECTION_RATIO
        # ±3 device noise + 0–5 passers-by outside camera frame
        raw_macs = max(0, int(base + random.gauss(0, 3) + random.randint(0, 5)))
        corrected = max(0, int(raw_macs / self.DETECTION_RATIO))
        return corrected, raw_macs


# ── Factory ───────────────────────────────────────────────────────────────────

def create_wifi_probe(interface: str = "wlan1"):
    """Return the appropriate probe for the current sensor mode."""
    if SENSOR_MODE == "LIVE":
        probe = RealWiFiProbe(interface=interface)
        probe.start()
        return probe
    else:
        logger.info("[WIFI] Using correlated simulation probe.")
        return CorrelatedWiFiSimulator()