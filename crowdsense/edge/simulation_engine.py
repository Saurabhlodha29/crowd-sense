# edge/simulation_engine.py
import time
import random
import argparse
from datetime import datetime

try:
    from config import ALERT_THRESHOLDS
except ImportError:
    ALERT_THRESHOLDS = {"LOW": 10, "MEDIUM": 25, "HIGH": 50, "CRITICAL": 75}

def classify_crowd(count):
    if count < ALERT_THRESHOLDS["LOW"]:      return "LOW"
    elif count < ALERT_THRESHOLDS["MEDIUM"]: return "MEDIUM"
    elif count < ALERT_THRESHOLDS["HIGH"]:   return "HIGH"
    else:                                    return "CRITICAL"

def get_time_based_count():
    hour = datetime.now().hour + datetime.now().minute / 60.0
    if 0 <= hour < 6:       base = random.randint(1, 8)
    elif 6 <= hour < 9:     base = int(5 + ((hour - 6) / 3.0) * 70) + random.randint(-5, 5)
    elif 9 <= hour < 12:    base = random.randint(35, 60)
    elif 12 <= hour < 14:   base = random.randint(55, 80)
    elif 14 <= hour < 17:   base = random.randint(30, 55)
    elif 17 <= hour < 20:   base = random.randint(50, 85)
    elif 20 <= hour < 22:   base = random.randint(15, 40)
    else:                   base = random.randint(2, 15)
    return max(0, min(100, base))

def simulate_reading():
    count = get_time_based_count()
    return count, classify_crowd(count), round(random.uniform(0.75, 0.97), 3)

def event_spike_scenario(duration_minutes=10, target=85):
    print(f"[SIM] Event spike: rising to {target} over {duration_minutes} min")
    steps = duration_minutes * 12
    start = get_time_based_count()
    for i in range(steps):
        if i < steps * 0.3:
            count = int(start + (i / (steps * 0.3)) * (target - start))
        else:
            count = target + random.randint(-6, 6)
        count = max(0, min(100, count))
        yield count, classify_crowd(count), round(random.uniform(0.80, 0.96), 3)
        time.sleep(5)

def morning_rush_scenario(duration_minutes=120):
    print(f"[SIM] Morning rush: {duration_minutes} min")
    steps = duration_minutes * 12
    for i in range(steps):
        count = max(0, min(100, int(5 + (i / steps) * 78 + random.randint(-4, 4))))
        yield count, classify_crowd(count), round(random.uniform(0.78, 0.95), 3)
        time.sleep(5)

def evacuation_scenario(duration_minutes=5):
    print(f"[SIM] Evacuation: clearing over {duration_minutes} min")
    steps = duration_minutes * 12
    start = 80
    for i in range(steps):
        count = max(0, int(start * (1 - i / steps) + random.randint(-3, 3)))
        yield count, classify_crowd(count), round(random.uniform(0.82, 0.97), 3)
        time.sleep(5)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", choices=["time_based","event_spike","morning_rush","evacuation"], default="time_based")
    args = parser.parse_args()
    print(f"[SIM] Scenario: {args.scenario} | Press Ctrl+C to stop\n")
    try:
        if args.scenario == "event_spike":
            for c, l, conf in event_spike_scenario():
                print(f"[SIM] {datetime.now().strftime('%H:%M:%S')} | {c:3d} people | {l:8s} | conf={conf}")
        elif args.scenario == "morning_rush":
            for c, l, conf in morning_rush_scenario():
                print(f"[SIM] {datetime.now().strftime('%H:%M:%S')} | {c:3d} people | {l:8s} | conf={conf}")
        elif args.scenario == "evacuation":
            for c, l, conf in evacuation_scenario():
                print(f"[SIM] {datetime.now().strftime('%H:%M:%S')} | {c:3d} people | {l:8s} | conf={conf}")
        else:
            while True:
                c, l, conf = simulate_reading()
                print(f"[SIM] {datetime.now().strftime('%H:%M:%S')} | {c:3d} people | {l:8s} | conf={conf}")
                time.sleep(5)
    except KeyboardInterrupt:
        print("\n[SIM] Stopped.")