"""
Face recognition: extracts a face embedding from a cropped person image,
then matches it against the watchlist embeddings fetched from the backend.

DeepFace handles detection + embedding extraction; we do the cosine-similarity
matching ourselves so it works identically whether matching happens locally
or via the backend's /watchlist/match endpoint.
"""
import numpy as np
from deepface import DeepFace
from config import config


class FaceRecognizer:
    def __init__(self):
        self.model_name = config.FACE_MODEL
        self.watchlist_cache = []  # [{personId, name, riskLevel, embedding}, ...]
        print(f"📦 Face recognition ready (model: {self.model_name})")

    def refresh_watchlist(self, persons):
        """Call this periodically with backend.fetch_watchlist() output."""
        cache = []
        for p in persons:
            embedding = p.get("faceEmbedding")
            if embedding:
                cache.append({
                    "personId": p["personId"],
                    "name": p["name"],
                    "riskLevel": p.get("riskLevel", "medium"),
                    "embedding": np.array(embedding, dtype=np.float32),
                })
        self.watchlist_cache = cache
        print(f"🔄 Watchlist cache updated: {len(cache)} persons with embeddings")

    def get_embedding(self, face_crop):
        """Extract a 128/512-d embedding from a cropped face image (numpy array)."""
        try:
            result = DeepFace.represent(
                img_path=face_crop,
                model_name=self.model_name,
                enforce_detection=False,  # crop is already a person region
                detector_backend="opencv",
            )
            if result:
                return np.array(result[0]["embedding"], dtype=np.float32)
        except Exception as e:
            print(f"⚠️  Embedding extraction failed: {e}")
        return None

    def match(self, embedding):
        """
        Compares embedding against cached watchlist via cosine similarity.
        Returns best match dict or None if nothing clears the threshold.
        """
        if embedding is None or not self.watchlist_cache:
            return None

        best_match, best_score = None, -1
        for entry in self.watchlist_cache:
            score = self._cosine_similarity(embedding, entry["embedding"])
            if score > best_score:
                best_score, best_match = score, entry

        if best_score >= config.FACE_MATCH_THRESHOLD:
            return {**best_match, "score": float(best_score)}
        return None

    @staticmethod
    def _cosine_similarity(a, b):
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))
