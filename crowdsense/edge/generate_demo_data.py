#!/usr/bin/env python3
# edge/generate_demo_data.py
# ─────────────────────────────────────────────────────────────────────────────
# Pre-processes a crowd video through YOLOv8 + DeepSORT and writes a CSV.
# The sensor agent replays this CSV for the demo — looks 100% real.
#
# Usage:
#   python generate_demo_data.py --video demo_data/crowd_demo.mp4 \
#                                 --output demo_data/readings_cache.csv
#   python generate_demo_data.py --video demo_data/crowd_demo.mp4 \
#                                 --output demo_data/readings_cache.csv \
#                                 --sample-every 5   (sample every 5 seconds of video)
#
# The output CSV has one row per sampled frame with columns:
#   person_count, crowd_level, confidence, positions (JSON), interval_s
# ─────────────────────────────────────────────────────────────────────────────

import argparse
import csv
import json
import logging
import sys
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)


def process_video(video_path: str, output_path: str, sample_every_seconds: float = 5.0):
    try:
        import cv2
    except ImportError:
        logger.error("opencv-python not installed: pip install opencv-python")
        sys.exit(1)
    try:
        from ultralytics import YOLO
        from deep_sort_realtime.deepsort_tracker import DeepSort
    except ImportError:
        logger.error("Install: pip install ultralytics deep-sort-realtime")
        sys.exit(1)
    from crowd_detector import classify_crowd

    logger.info(f"Loading YOLOv8n…")
    model   = YOLO("yolov8n.pt")
    tracker = DeepSort(max_age=30, n_init=3, nn_budget=100, embedder="mobilenet")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"Cannot open video: {video_path}")
        sys.exit(1)

    fps         = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames= int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_s  = total_frames / fps
    sample_step = max(1, int(fps * sample_every_seconds))

    logger.info(f"Video: {total_frames} frames @ {fps:.1f} fps = {duration_s:.0f}s")
    logger.info(f"Sampling every {sample_every_seconds}s (every {sample_step} frames)")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    rows_written = 0
    frame_idx    = 0

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["person_count", "crowd_level", "confidence", "positions", "interval_s"]
        )
        writer.writeheader()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_step == 0:
                # ── Run detection + tracking ──────────────────────────────
                results  = model(frame, classes=[0], verbose=False)
                raw_dets = []
                for box in results[0].boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    raw_dets.append(([x1, y1, x2 - x1, y2 - y1], float(box.conf[0]), "person"))

                tracks    = tracker.update_tracks(raw_dets, frame=frame)
                confirmed = [t for t in tracks if t.is_confirmed()]

                positions = []
                for t in confirmed:
                    ltrb = t.to_ltrb()
                    positions.append({
                        "id": int(t.track_id),
                        "cx": round((ltrb[0] + ltrb[2]) / 2, 1),
                        "cy": round((ltrb[1] + ltrb[3]) / 2, 1),
                    })

                count  = len(confirmed)
                level  = classify_crowd(count)
                confs  = [float(b.conf[0]) for b in results[0].boxes]
                avg_cf = round(sum(confs) / len(confs), 3) if confs else 0.88

                writer.writerow({
                    "person_count": count,
                    "crowd_level":  level,
                    "confidence":   avg_cf,
                    "positions":    json.dumps(positions),
                    "interval_s":   sample_every_seconds,
                })
                rows_written += 1

                pct = frame_idx / max(total_frames, 1) * 100
                logger.info(f"  [{pct:5.1f}%] frame {frame_idx:5d}: {count:3d} people ({level})")

            frame_idx += 1

    cap.release()
    logger.info(f"\n✓ Done. {rows_written} rows written to {output_path}")
    logger.info(f"  Run: python sensor_agent.py  (SENSOR_MODE='DEMO_VIDEO' in config.py)")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--video",        required=True,  help="Path to input video file")
    p.add_argument("--output",       required=True,  help="Path to output CSV")
    p.add_argument("--sample-every", type=float, default=5.0,
                   help="Sample one frame every N seconds of video (default 5)")
    args = p.parse_args()
    process_video(args.video, args.output, args.sample_every)