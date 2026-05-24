from ultralytics import YOLO
from config import ALERT_THRESHOLDS
import random  # for simulation mode

model = None

def load_model():
    global model
    # Downloads yolov8n.pt automatically on first run
    model = YOLO("yolov8n.pt")
    print("[AI] YOLOv8 model loaded.")

def detect_crowd_from_frame(frame):
    """Run YOLOv8 on a frame. Returns (person_count, crowd_level, confidence)."""
    if model is None:
        load_model()
    results = model(frame, classes=[0], verbose=False)  # class 0 = person
    person_count = len(results[0].boxes)
    confidence = float(results[0].boxes.conf.mean()) if person_count > 0 else 0.0
    return person_count, classify_crowd(person_count), round(confidence, 3)

def simulate_crowd_reading():
    """Generate a fake reading for testing without camera."""
    person_count = random.randint(0, 90)
    return person_count, classify_crowd(person_count), round(random.uniform(0.7, 0.99), 3)

def classify_crowd(count):
    if count < ALERT_THRESHOLDS["LOW"]:
        return "LOW"
    elif count < ALERT_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    elif count < ALERT_THRESHOLDS["HIGH"]:
        return "HIGH"
    else:
        return "CRITICAL"