"""
Enrollment helper: computes a face embedding from a photo and saves it to the
backend's watchlist entry. The React dashboard uploads the photo file itself,
but the embedding (the actual math used for matching) is computed here by the
AI service, since that's where DeepFace lives.

Usage:
    python enroll_face.py <personId> <path_to_face_photo.jpg>

Example:
    python enroll_face.py WL-A1B2C3D4 ./photos/suspect1.jpg
"""
import sys
import cv2
from deepface import DeepFace
from config import config
from backend_client import backend


def enroll(person_id, image_path):
    print(f"📸 Reading {image_path}...")
    frame = cv2.imread(image_path)
    if frame is None:
        print("❌ Could not read image — check the path")
        return

    print(f"🧠 Extracting face embedding ({config.FACE_MODEL})...")
    try:
        result = DeepFace.represent(
            img_path=image_path,
            model_name=config.FACE_MODEL,
            enforce_detection=True,  # require an actual face this time
            detector_backend="opencv",
        )
    except Exception as e:
        print(f"❌ No face detected or extraction failed: {e}")
        return

    embedding = result[0]["embedding"]
    print(f"✅ Embedding extracted ({len(embedding)} dimensions)")

    if not backend.login():
        print("❌ Could not authenticate with backend — embedding NOT saved")
        return

    resp = backend.session.patch(
        f"{config.BACKEND_URL}/watchlist/{person_id}",
        json={"faceEmbedding": embedding},
        timeout=10,
    )

    if resp.status_code == 200:
        print(f"✅ Embedding saved to watchlist entry {person_id}")
    else:
        print(f"❌ Failed to save: {resp.status_code} {resp.text}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python enroll_face.py <personId> <path_to_photo>")
        sys.exit(1)
    enroll(sys.argv[1], sys.argv[2])
