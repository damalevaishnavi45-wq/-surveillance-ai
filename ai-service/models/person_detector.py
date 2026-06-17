"""
Person detection using YOLOv8. Works on CPU (nano model) or GPU (bigger models)
with zero code changes — device comes from config.resolve_device().
"""
from ultralytics import YOLO
from config import config


class PersonDetector:
    PERSON_CLASS_ID = 0  # COCO class 0 = "person"

    def __init__(self):
        self.device = config.resolve_device()
        print(f"📦 Loading YOLO model '{config.YOLO_MODEL}' on device: {self.device}")
        self.model = YOLO(config.YOLO_MODEL)

    def detect(self, frame):
        """
        Returns list of dicts: [{box: (x1,y1,x2,y2), confidence: float}, ...]
        Only returns 'person' class detections above PERSON_CONF_THRESHOLD.
        """
        results = self.model(
            frame,
            device=self.device,
            classes=[self.PERSON_CLASS_ID],
            conf=config.PERSON_CONF_THRESHOLD,
            verbose=False,
        )

        detections = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                detections.append({
                    "box": (int(x1), int(y1), int(x2), int(y2)),
                    "confidence": conf,
                })
        return detections
