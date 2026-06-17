"""
Main entry point for the AI detection service.

Run modes (all controlled by .env, no code changes needed):
  - Laptop webcam, CPU:   DEVICE=cpu   CAMERA_SOURCE=0
  - Laptop webcam, GPU:   DEVICE=cuda  CAMERA_SOURCE=0
  - RTSP IP camera:       CAMERA_SOURCE=rtsp://user:pass@ip:554/stream
  - Video file (testing): CAMERA_SOURCE=/path/to/video.mp4
  - Colab/Kaggle:         DISPLAY_WINDOW=false (no GUI window in notebooks)

Usage:
    python main.py
"""
import time
import cv2

from config import config
from backend_client import backend
from models.person_detector import PersonDetector
from models.face_recognizer import FaceRecognizer
from models.activity_classifier import ActivityClassifier


def crop_box(frame, box, pad=10):
    h, w = frame.shape[:2]
    x1, y1, x2, y2 = box
    x1, y1 = max(0, x1 - pad), max(0, y1 - pad)
    x2, y2 = min(w, x2 + pad), min(h, y2 + pad)
    return frame[y1:y2, x1:x2]


def draw_overlay(frame, detections, events, face_matches):
    for det in detections:
        x1, y1, x2, y2 = det["box"]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (80, 200, 255), 2)
        cv2.putText(frame, f"{det['confidence']:.2f}", (x1, y1 - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 200, 255), 1)

    for match in face_matches:
        cv2.putText(frame, f"⚠ {match['name']} ({match['riskLevel']})", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    y_offset = 70
    for ev in events:
        cv2.putText(frame, f"ALERT: {ev['type']} [{ev['severity']}]", (20, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        y_offset += 28

    cv2.putText(frame, f"Persons: {len(detections)}", (20, frame.shape[0] - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    return frame


def main():
    print("=" * 60)
    print("  AI Suspicious Activity Detection — Service Starting")
    print("=" * 60)

    if not backend.login():
        print("⚠️  Continuing without backend connection — alerts will only print locally")

    backend.send_camera_status("online")

    detector = PersonDetector()
    face_recognizer = FaceRecognizer() if config.ENABLE_FACE_RECOGNITION else None
    classifier = ActivityClassifier()

    if face_recognizer:
        face_recognizer.refresh_watchlist(backend.fetch_watchlist())

    source = int(config.CAMERA_SOURCE) if config.CAMERA_SOURCE.isdigit() else config.CAMERA_SOURCE
    cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        print(f"❌ Could not open camera source: {source}")
        return

    print(f"🎥 Camera opened: {source} | Device: {config.resolve_device()}")
    print("Press 'q' to quit (if display window enabled)\n")

    frame_count = 0
    last_watchlist_refresh = time.time()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("⚠️  Camera feed ended or unreadable")
                break

            frame_count += 1

            # Skip frames for performance on slower hardware
            if frame_count % config.PROCESS_EVERY_NTH_FRAME != 0:
                if config.DISPLAY_WINDOW:
                    cv2.imshow("SurveillanceAI", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                continue

            # Refresh watchlist cache every 60s in case admin added someone
            if face_recognizer and time.time() - last_watchlist_refresh > 60:
                face_recognizer.refresh_watchlist(backend.fetch_watchlist())
                last_watchlist_refresh = time.time()

            # 1) Person detection
            detections = detector.detect(frame)

            # 2) Face recognition on each detected person
            face_matches = []
            person_payload = []
            if face_recognizer and detections:
                for det in detections:
                    face_crop = crop_box(frame, det["box"])
                    if face_crop.size == 0:
                        continue
                    embedding = face_recognizer.get_embedding(face_crop)
                    match = face_recognizer.match(embedding)
                    if match:
                        face_matches.append(match)
                        person_payload.append({
                            "boundingBox": {
                                "x": det["box"][0], "y": det["box"][1],
                                "width": det["box"][2] - det["box"][0],
                                "height": det["box"][3] - det["box"][1],
                            },
                            "faceMatchId": match["personId"],
                            "faceMatchName": match["name"],
                            "faceMatchConfidence": match["score"],
                            "isInWatchlist": True,
                        })

            # Send watchlist face-match alerts immediately (these are high priority)
            for match in face_matches:
                severity = "critical" if match["riskLevel"] in ("high", "critical") else "high"
                backend.send_alert(
                    alert_type="face_match",
                    severity=severity,
                    confidence=match["score"],
                    description=f"Watchlist match: {match['name']} ({match['riskLevel']} risk)",
                    persons=person_payload,
                    snapshot_frame=frame,
                )

            # 3) Activity classification (loitering, crowd, erratic motion)
            events = []
            if config.ENABLE_ACTIVITY_CLASSIFIER:
                events, _tracks = classifier.analyze(detections)
                for ev in events:
                    backend.send_alert(
                        alert_type=ev["type"],
                        severity=ev["severity"],
                        confidence=ev["confidence"],
                        description=ev["description"],
                        snapshot_frame=frame,
                    )

            # 4) Display
            if config.DISPLAY_WINDOW:
                annotated = draw_overlay(frame.copy(), detections, events, face_matches)
                cv2.imshow("SurveillanceAI", annotated)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

    except KeyboardInterrupt:
        print("\n🛑 Stopped by user")
    finally:
        backend.send_camera_status("offline")
        cap.release()
        if config.DISPLAY_WINDOW:
            cv2.destroyAllWindows()
        print("👋 AI service shut down cleanly")


if __name__ == "__main__":
    main()
