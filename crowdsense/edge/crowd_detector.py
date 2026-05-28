import random
from config import ALERT_THRESHOLDS

# Optional: real YOLOv8 model (only loaded when USE_SIMULATION=False)
_model = None

def load_model():
    global _model
    from ultralytics import YOLO
    _model = YOLO("models/yolov8n.pt")
    print("[AI] YOLOv8 model loaded")

def detect_from_frame(frame):
    """Run YOLOv8 on an OpenCV frame. Returns (person_count, crowd_level, confidence)."""
    if _model is None:
        load_model()
    results = _model(frame, classes=[0], verbose=False)
    count = len(results[0].boxes)
    conf  = float(results[0].boxes.conf.mean()) if count > 0 else 0.0
    return count, classify_crowd(count), round(conf, 3)

def simulate_crowd_reading(scenario="random"):
    """Generate realistic fake reading for testing without camera."""
    import time
    hour = (time.localtime().tm_hour + time.localtime().tm_min / 60)

    if scenario == "random":
        # Time-based realistic pattern
        if 0 <= hour < 6:
            count = random.randint(0, 5)
        elif 6 <= hour < 9:
            count = random.randint(5, 40)   # morning rush
        elif 9 <= hour < 12:
            count = random.randint(20, 60)
        elif 12 <= hour < 14:
            count = random.randint(40, 80)  # lunch peak
        elif 14 <= hour < 18:
            count = random.randint(25, 65)
        elif 18 <= hour < 21:
            count = random.randint(35, 90)  # evening peak
        else:
            count = random.randint(5, 25)
    elif scenario == "critical":
        count = random.randint(75, 100)
    elif scenario == "low":
        count = random.randint(0, 9)
    else:
        count = random.randint(0, 90)

    # Add slight noise
    count = max(0, count + random.randint(-3, 3))
    confidence = round(random.uniform(0.72, 0.98), 3)
    return count, classify_crowd(count), confidence

def classify_crowd(count: int) -> str:
    if count < ALERT_THRESHOLDS["LOW"]:
        return "LOW"
    elif count < ALERT_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    elif count < ALERT_THRESHOLDS["HIGH"]:
        return "HIGH"
    else:
        return "CRITICAL"