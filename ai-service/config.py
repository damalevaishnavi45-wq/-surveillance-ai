"""
Central config — reads .env once, everything else imports from here.
Change DEVICE to 'cpu', 'cuda', or 'mps' and nothing else needs to change.
"""
import os
from dotenv import load_dotenv

load_dotenv()


def _bool(key, default="false"):
    return os.getenv(key, default).strip().lower() in ("1", "true", "yes")


class Config:
    # Backend
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000/api")
    BACKEND_EMAIL = os.getenv("BACKEND_EMAIL")
    BACKEND_PASSWORD = os.getenv("BACKEND_PASSWORD")

    # Device — auto-falls back to cpu if cuda unavailable
    DEVICE = os.getenv("DEVICE", "cpu")

    # Camera
    CAMERA_SOURCE = os.getenv("CAMERA_SOURCE", "0")
    CAMERA_ID = os.getenv("CAMERA_ID", "CAM-001")

    # Models
    YOLO_MODEL = os.getenv("YOLO_MODEL", "yolov8n.pt")
    FACE_MODEL = os.getenv("FACE_MODEL", "ArcFace")

    # Thresholds
    PERSON_CONF_THRESHOLD = float(os.getenv("PERSON_CONF_THRESHOLD", 0.5))
    FACE_MATCH_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", 0.6))
    LOITERING_SECONDS = int(os.getenv("LOITERING_SECONDS", 30))
    ALERT_COOLDOWN_SECONDS = int(os.getenv("ALERT_COOLDOWN_SECONDS", 60))

    # Feature toggles
    ENABLE_FACE_RECOGNITION = _bool("ENABLE_FACE_RECOGNITION", "true")
    ENABLE_ACTIVITY_CLASSIFIER = _bool("ENABLE_ACTIVITY_CLASSIFIER", "true")
    ENABLE_LOITERING_DETECTION = _bool("ENABLE_LOITERING_DETECTION", "true")
    SAVE_SNAPSHOTS = _bool("SAVE_SNAPSHOTS", "true")

    # Performance
    PROCESS_EVERY_NTH_FRAME = int(os.getenv("PROCESS_EVERY_NTH_FRAME", 3))
    DISPLAY_WINDOW = _bool("DISPLAY_WINDOW", "true")

    @classmethod
    def resolve_device(cls):
        """Returns a safe device string — falls back to CPU if requested device unavailable."""
        if cls.DEVICE == "cuda":
            try:
                import torch
                if torch.cuda.is_available():
                    return "cuda"
                print("⚠️  CUDA requested but not available — falling back to CPU")
            except ImportError:
                pass
            return "cpu"
        if cls.DEVICE == "mps":
            try:
                import torch
                if torch.backends.mps.is_available():
                    return "mps"
            except (ImportError, AttributeError):
                pass
            return "cpu"
        return "cpu"


config = Config()
