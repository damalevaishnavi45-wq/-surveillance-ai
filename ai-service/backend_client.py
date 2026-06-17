"""
Handles all communication from the AI service back to the Node.js backend:
login, sending alerts, fetching watchlist embeddings.
"""
import base64
import requests
from config import config


class BackendClient:
    def __init__(self):
        self.token = None
        self.session = requests.Session()

    def login(self):
        """Authenticate once at startup, reuse JWT for all subsequent calls."""
        try:
            resp = self.session.post(
                f"{config.BACKEND_URL}/auth/login",
                json={"email": config.BACKEND_EMAIL, "password": config.BACKEND_PASSWORD},
                timeout=10,
            )
            resp.raise_for_status()
            self.token = resp.json()["token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print("✅ AI service authenticated with backend")
            return True
        except Exception as e:
            print(f"❌ Backend login failed: {e}")
            return False

    def send_camera_status(self, status="online"):
        try:
            self.session.patch(
                f"{config.BACKEND_URL}/cameras/{config.CAMERA_ID}/status",
                json={"status": status},
                timeout=5,
            )
        except Exception as e:
            print(f"⚠️  Failed to update camera status: {e}")

    def fetch_watchlist(self):
        """Pull all watchlist persons with stored face embeddings."""
        try:
            resp = self.session.get(f"{config.BACKEND_URL}/watchlist", timeout=10)
            resp.raise_for_status()
            return resp.json().get("persons", [])
        except Exception as e:
            print(f"⚠️  Failed to fetch watchlist: {e}")
            return []

    def send_alert(self, alert_type, severity, confidence, description="",
                   persons=None, snapshot_frame=None):
        """
        Send a detected event to the backend, which stores it, emails admins
        (if high/critical), and broadcasts it over Socket.io to the dashboard.
        """
        payload = {
            "cameraId": config.CAMERA_ID,
            "type": alert_type,
            "severity": severity,
            "confidence": round(float(confidence), 3),
            "description": description,
            "persons": persons or [],
        }

        if snapshot_frame is not None and config.SAVE_SNAPSHOTS:
            payload["snapshotBase64"] = self._encode_frame(snapshot_frame)

        try:
            resp = self.session.post(f"{config.BACKEND_URL}/alerts", json=payload, timeout=15)
            resp.raise_for_status()
            print(f"🚨 Alert sent: {alert_type} ({severity}, {confidence:.2f})")
            return resp.json()
        except Exception as e:
            print(f"❌ Failed to send alert: {e}")
            return None

    @staticmethod
    def _encode_frame(frame):
        import cv2
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return base64.b64encode(buffer).decode("utf-8")


backend = BackendClient()
