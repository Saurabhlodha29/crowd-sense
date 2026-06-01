# edge/fusion_engine.py
# Kalman filter that fuses camera-based person count with WiFi probe count
# into a single smoothed estimate.  Works even if one sensor goes offline.
#
# State vector: [count, velocity]
#   count    = estimated current person count
#   velocity = rate of change (persons/interval)
#
# Usage:
#   fusion = CrowdFusionKalman()
#   ...in your 5-second loop...
#   fused = fusion.fuse(camera_count=42, wifi_count=38)

import numpy as np


class CrowdFusionKalman:
    def __init__(self):
        # ── State ─────────────────────────────────────────────────────────────
        self.x = np.array([0.0, 0.0])           # [count, velocity]

        # ── Covariance ────────────────────────────────────────────────────────
        self.P = np.eye(2) * 100.0              # high initial uncertainty

        # ── State transition: x_k = F * x_{k-1} ──────────────────────────────
        # count_{k} = count_{k-1} + velocity_{k-1}
        self.F = np.array([[1.0, 1.0],
                           [0.0, 1.0]])

        # ── Measurement matrices ──────────────────────────────────────────────
        # Both camera and WiFi measure 'count' directly (first state component)
        self.H = np.array([[1.0, 0.0]])

        # ── Measurement noise covariances ─────────────────────────────────────
        # Camera: std ≈ 5 persons  → variance = 25
        self.R_camera = np.array([[25.0]])
        # WiFi:   std ≈ 10 persons → variance = 100
        self.R_wifi   = np.array([[100.0]])

        # ── Process noise (allows model to track real crowd dynamics) ─────────
        self.Q = np.array([[1.0,  0.0],
                           [0.0,  0.1]])

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _predict(self):
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q

    def _update(self, measurement: float, R: np.ndarray):
        y = np.array([measurement]) - self.H @ self.x   # innovation
        S = self.H @ self.P @ self.H.T + R               # innovation covariance
        K = self.P @ self.H.T @ np.linalg.inv(S)         # Kalman gain
        self.x = self.x + (K @ y).flatten()
        self.P = (np.eye(2) - K @ self.H) @ self.P

    # ── Public API ────────────────────────────────────────────────────────────

    def fuse(self, camera_count=None, wifi_count=None) -> int:
        """
        Fuse camera and/or WiFi readings into a single crowd estimate.

        Parameters
        ----------
        camera_count : int | None
            Person count from YOLOv8 / CSRNet.  Pass None if camera is offline.
        wifi_count : int | None
            Corrected device count from WiFi probe.  Pass None if probe offline.

        Returns
        -------
        int
            Smoothed, non-negative crowd estimate.
        """
        self._predict()

        if camera_count is not None:
            self._update(float(camera_count), self.R_camera)

        if wifi_count is not None:
            self._update(float(wifi_count), self.R_wifi)

        # Both offline → return last estimate (degraded mode)
        return max(0, int(round(self.x[0])))

    @property
    def current_estimate(self) -> int:
        return max(0, int(round(self.x[0])))

    @property
    def velocity(self) -> float:
        """Persons-per-interval rate of change (positive = crowd growing)."""
        return float(self.x[1])

    def reset(self):
        """Reset to zero — call when sensor is replaced or location changes."""
        self.x = np.array([0.0, 0.0])
        self.P = np.eye(2) * 100.0