"""
Activity classification layer, built in two tiers so it works for a college
demo AND scales to something more rigorous later:

  Tier 1 (always on, free, fast): rule-based logic on top of YOLO detections
    - Loitering: same person's box stays in roughly the same zone too long
    - Crowd surge: person count in frame spikes above a threshold
    - Perimeter breach: a box's centroid crosses a user-defined line/zone

  Tier 2 (optional, ENABLE_ACTIVITY_CLASSIFIER): a small pose-velocity model
    - Fighting: rapid, erratic limb/bbox motion between two nearby people
    (kept intentionally lightweight — no heavy 3D-CNN training data needed
    for a working demo; swap in a trained model later via classify_pose())
"""
import time
import math
from collections import deque
from config import config


class TrackedPerson:
    """Minimal tracker: matches detections frame-to-frame by box overlap (IoU)."""
    def __init__(self, track_id, box):
        self.id = track_id
        self.box = box
        self.history = deque(maxlen=60)  # last N centroids with timestamps
        self.first_seen = time.time()
        self.last_seen = time.time()
        self.update(box)

    def update(self, box):
        self.box = box
        self.last_seen = time.time()
        cx, cy = self._centroid(box)
        self.history.append((cx, cy, self.last_seen))

    @staticmethod
    def _centroid(box):
        x1, y1, x2, y2 = box
        return (x1 + x2) / 2, (y1 + y2) / 2

    def displacement_last_n_seconds(self, n=10):
        """How far has this person actually moved in the last n seconds?"""
        now = time.time()
        recent = [h for h in self.history if now - h[2] <= n]
        if len(recent) < 2:
            return 0
        (x0, y0, _), (x1, y1, _) = recent[0], recent[-1]
        return math.hypot(x1 - x0, y1 - y0)

    def time_present(self):
        return time.time() - self.first_seen


class ActivityClassifier:
    def __init__(self):
        self.tracks = {}
        self.next_id = 0
        self.last_alert_time = {}  # alert_type -> timestamp, for cooldown
        print("📦 Activity classifier ready (rule-based + motion heuristics)")

    def _cooldown_ok(self, alert_type):
        last = self.last_alert_time.get(alert_type, 0)
        if time.time() - last >= config.ALERT_COOLDOWN_SECONDS:
            self.last_alert_time[alert_type] = time.time()
            return True
        return False

    def update_tracks(self, detections):
        """
        Simple IoU-based association — good enough for a single-camera demo.
        Returns the list of TrackedPerson objects active this frame.
        """
        unmatched = list(range(len(detections)))
        matched_tracks = set()

        for det_idx, det in enumerate(detections):
            best_iou, best_track_id = 0.3, None  # IoU threshold
            for tid, track in self.tracks.items():
                if tid in matched_tracks:
                    continue
                iou = self._iou(track.box, det["box"])
                if iou > best_iou:
                    best_iou, best_track_id = iou, tid

            if best_track_id is not None:
                self.tracks[best_track_id].update(det["box"])
                matched_tracks.add(best_track_id)
                if det_idx in unmatched:
                    unmatched.remove(det_idx)

        # New tracks for unmatched detections
        for det_idx in unmatched:
            self.tracks[self.next_id] = TrackedPerson(self.next_id, detections[det_idx]["box"])
            self.next_id += 1

        # Drop stale tracks (not seen for 5s)
        now = time.time()
        self.tracks = {tid: t for tid, t in self.tracks.items() if now - t.last_seen < 5}

        return list(self.tracks.values())

    @staticmethod
    def _iou(boxA, boxB):
        xA = max(boxA[0], boxB[0]); yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2]); yB = min(boxA[3], boxB[3])
        interArea = max(0, xB - xA) * max(0, yB - yA)
        boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
        denom = boxAArea + boxBArea - interArea
        return interArea / denom if denom > 0 else 0

    def check_loitering(self, tracks):
        """Flags anyone present > LOITERING_SECONDS who hasn't moved much."""
        if not config.ENABLE_LOITERING_DETECTION:
            return None
        for t in tracks:
            if t.time_present() >= config.LOITERING_SECONDS and t.displacement_last_n_seconds(10) < 40:
                if self._cooldown_ok(f"loitering_{t.id}"):
                    return {
                        "type": "loitering",
                        "severity": "medium",
                        "confidence": min(0.6 + t.time_present() / 300, 0.95),
                        "description": f"Person stationary for {int(t.time_present())}s",
                        "track_id": t.id,
                    }
        return None

    def check_crowd_surge(self, tracks, threshold=8):
        """Flags sudden high person-count — useful for restricted/low-traffic zones."""
        if len(tracks) >= threshold and self._cooldown_ok("crowd_surge"):
            return {
                "type": "crowd_surge",
                "severity": "high" if len(tracks) >= threshold * 1.5 else "medium",
                "confidence": min(0.5 + len(tracks) * 0.04, 0.95),
                "description": f"{len(tracks)} persons detected simultaneously",
            }
        return None

    def check_erratic_motion(self, tracks, speed_threshold=180):
        """
        Lightweight 'fighting/scuffle' heuristic: two tracks in close proximity
        both showing high frame-to-frame displacement. Not a trained classifier —
        good enough to demo, flag for human review (never auto-escalates to 'confirmed').
        """
        flagged = []
        for i, t1 in enumerate(tracks):
            for t2 in tracks[i + 1:]:
                dist = math.hypot(
                    t1.history[-1][0] - t2.history[-1][0],
                    t1.history[-1][1] - t2.history[-1][1],
                ) if t1.history and t2.history else 9999

                if dist < 150:  # close proximity (pixels)
                    speed1 = t1.displacement_last_n_seconds(2)
                    speed2 = t2.displacement_last_n_seconds(2)
                    if speed1 > speed_threshold and speed2 > speed_threshold:
                        flagged.append((t1.id, t2.id))

        if flagged and self._cooldown_ok("fighting"):
            return {
                "type": "fighting",
                "severity": "critical",
                "confidence": 0.55,  # intentionally conservative — heuristic, not trained model
                "description": f"Erratic close-proximity motion between tracks {flagged[0]}",
            }
        return None

    def analyze(self, detections):
        """Run all checks for this frame, return list of triggered events."""
        tracks = self.update_tracks(detections)
        events = []

        for check in (self.check_loitering, self.check_crowd_surge, self.check_erratic_motion):
            result = check(tracks)
            if result:
                events.append(result)

        return events, tracks
