# edge/wifi_probe.py
import time
import random
from datetime import datetime

try:
    from simulation_engine import get_time_based_count
except ImportError:
    def get_time_based_count(): return random.randint(5, 80)

def simulate_probe_reading(location_id="loc_001"):
    """
    Simulates WiFi probe crowd counting.
    In production: replace body with real Scapy sniffing (see commented block below).
    
    Why 0.7x correction: Modern iPhones randomize their MAC address, so one phone
    can appear as ~1.4 unique MACs over a 60-second window. We divide by 1.4 (multiply
    by 0.7) to correct for this inflation.
    """
    base_count = get_time_based_count()
    detected_macs = int(base_count * random.uniform(0.85, 1.15))
    corrected_count = int(detected_macs * 0.7)
    return {
        "source":          "wifi_probe_simulated",
        "location_id":     location_id,
        "unique_macs":     detected_macs,
        "corrected_count": corrected_count,
        "window_seconds":  60,
        "timestamp":       datetime.utcnow().isoformat() + "Z"
    }

# ── PRODUCTION MODE — uncomment on Raspberry Pi only ──────────────────────────
# Requires: pip install scapy | Must run as root: sudo python wifi_probe.py
# WiFi adapter must be in monitor mode: sudo iwconfig wlan1 mode monitor
#
# from scapy.all import sniff, Dot11ProbeReq
# import threading
#
# _mac_window = {}
# _lock = threading.Lock()
#
# def _handle_probe(pkt):
#     if pkt.haslayer(Dot11ProbeReq) and pkt.addr2:
#         with _lock:
#             _mac_window[pkt.addr2] = time.time()
#
# def _clean_window(seconds=60):
#     cutoff = time.time() - seconds
#     with _lock:
#         for mac in [m for m, t in _mac_window.items() if t < cutoff]:
#             del _mac_window[mac]
#
# def get_probe_count():
#     _clean_window()
#     with _lock: return len(_mac_window)
#
# def start_sniffing(interface="wlan1mon"):
#     sniff(iface=interface, prn=_handle_probe, store=False)
# ───────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("[WiFi Probe] Simulation mode | Ctrl+C to stop\n")
    try:
        while True:
            r = simulate_probe_reading()
            print(f"[PROBE] MACs: {r['unique_macs']:3d} | Corrected: {r['corrected_count']:3d} people | {r['timestamp']}")
            time.sleep(10)
    except KeyboardInterrupt:
        print("\n[PROBE] Stopped.")