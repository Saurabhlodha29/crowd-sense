# edge/crowd_detector.py
# Adaptive crowd detection:
#   count < 30   → YOLOv8n + DeepSORT tracking (most accurate for sparse crowds)
#   count 30-99  → YOLOv8n detection (fast, good balance)
#   count ≥ 100  → CSRNet density estimation (best for dense crowds)
#
# DeepSORT gives persistent IDs across frames → counts unique people, not boxes.
# CSRNet produces a density heatmap → sum = crowd count + spatial heatmap for frontend.

import numpy as np
import logging
from config import ALERT_THRESHOLDS

logger = logging.getLogger(__name__)

# ── Lazy-loaded models (import only when needed) ──────────────────────────────
_yolo_model   = None
_deepsort     = None
_csrnet       = None
_prev_count   = 0   # used to select model adaptively


def _load_yolo():
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        _yolo_model = YOLO("yolov8n.pt")
        logger.info("[DETECTOR] YOLOv8n loaded.")
    return _yolo_model


def _load_deepsort():
    global _deepsort
    if _deepsort is None:
        from deep_sort_realtime.deepsort_tracker import DeepSort
        _deepsort = DeepSort(max_age=30, n_init=3, nn_budget=100, embedder="mobilenet")
        logger.info("[DETECTOR] DeepSORT loaded.")
    return _deepsort


def _load_csrnet():
    global _csrnet
    if _csrnet is None:
        try:
            from csrnet_estimator import CSRNetEstimator
            _csrnet = CSRNetEstimator()
            logger.info("[DETECTOR] CSRNet loaded.")
        except Exception as e:
            logger.warning(f"[DETECTOR] CSRNet unavailable: {e}. Will use YOLOv8 only.")
    return _csrnet


# ── Core detection ────────────────────────────────────────────────────────────

def detect_from_frame(frame: np.ndarray) -> tuple:
    """
    Run crowd detection on a single frame.

    Returns
    -------
    (person_count: int, crowd_level: str, confidence: float, positions: list)
        positions = [{"id": track_id, "cx": float, "cy": float}, ...] (pixel coords)
                    or [] when count is high (CSRNet mode)
    """
    global _prev_count

    model_used = _select_model(_prev_count)

    if model_used == "deepsort":
        count, positions = _detect_deepsort(frame)
        confidence = 0.90
    elif model_used == "yolo":
        count, positions = _detect_yolo(frame)
        confidence = 0.85
    else:  # csrnet
        count, positions = _detect_csrnet(frame)
        confidence = 0.80

    _prev_count = count
    level = classify_crowd(count)
    return count, level, round(confidence, 3), positions


def _select_model(prev_count: int) -> str:
    if prev_count < 30:
        return "deepsort"
    elif prev_count < 100:
        return "yolo"
    else:
        return "csrnet"


def _detect_deepsort(frame):
    model     = _load_yolo()
    tracker   = _load_deepsort()
    results   = model(frame, classes=[0], verbose=False)

    raw_dets = []
    for box in results[0].boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        conf = float(box.conf[0])
        raw_dets.append(([x1, y1, x2 - x1, y2 - y1], conf, "person"))

    tracks    = tracker.update_tracks(raw_dets, frame=frame)
    confirmed = [t for t in tracks if t.is_confirmed()]

    positions = []
    for t in confirmed:
        ltrb = t.to_ltrb()
        cx   = (ltrb[0] + ltrb[2]) / 2
        cy   = (ltrb[1] + ltrb[3]) / 2
        positions.append({"id": int(t.track_id), "cx": round(cx, 1), "cy": round(cy, 1)})

    return len(confirmed), positions


def _detect_yolo(frame):
    model   = _load_yolo()
    results = model(frame, classes=[0], verbose=False)
    boxes   = results[0].boxes

    positions = []
    for i, box in enumerate(boxes):
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        positions.append({"id": i, "cx": round(cx, 1), "cy": round(cy, 1)})

    return len(boxes), positions


def _detect_csrnet(frame):
    csrnet = _load_csrnet()
    if csrnet is None:
        # Fallback to YOLOv8 if CSRNet unavailable
        return _detect_yolo(frame)
    count, _heatmap = csrnet.estimate(frame)
    return count, []   # no individual positions in dense mode


# ── Simulation helpers ────────────────────────────────────────────────────────

def simulate_crowd_reading() -> tuple:
    """
    Generate a CORRELATED fake reading.
    Uses a sine-wave-based daily pattern so readings look realistic
    (gradual rise/fall) rather than random noise.
    """
    import time, random, math
    hour = (time.time() / 3600) % 24
    # Daily crowd curve: low at night, peaks at 12:00 and 20:00
    base = (
        40 * math.sin(math.pi * (hour - 6) / 12) ** 2 +   # midday peak
        20 * math.sin(math.pi * (hour - 16) / 6)  ** 2    # evening peak
    )
    base = max(0, base)
    noise        = random.gauss(0, 3)
    person_count = max(0, int(base + noise))
    level        = classify_crowd(person_count)
    confidence   = round(random.uniform(0.80, 0.97), 3)
    # Fake pixel positions for dot cloud
    positions    = [{"id": i, "cx": random.uniform(50, 600), "cy": random.uniform(50, 400)}
                    for i in range(min(person_count, 50))]
    return person_count, level, confidence, positions


# ── Classify crowd level ──────────────────────────────────────────────────────

def classify_crowd(count: int) -> str:
    if count < ALERT_THRESHOLDS["LOW"]:
        return "LOW"
    elif count < ALERT_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    elif count < ALERT_THRESHOLDS["HIGH"]:
        return "HIGH"
    else:
        return "CRITICAL"