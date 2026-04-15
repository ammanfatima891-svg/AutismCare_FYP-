import io
import os
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# TensorFlow can be heavy; keep imports local-ish but still load at startup for speed.
import tensorflow as tf

from server.ml.facial_screening_service.labeling import classify_probability


def _env(name: str, default: str) -> str:
    val = os.getenv(name)
    return val if val is not None and val != "" else default


MODEL_PATH = _env("FACIAL_SCREENING_MODEL_PATH", os.path.join(os.getcwd(), "server", "ml", "models", "inception_v3.h5"))
THRESHOLD = float(_env("FACIAL_SCREENING_THRESHOLD", "0.5"))

app = FastAPI(title="Facial Screening Inference Service", version="1.0.0")

# Allow local dev; tighten in prod.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


model: Optional[tf.keras.Model] = None

def load_model_once() -> tf.keras.Model:
    global model
    if model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. Set FACIAL_SCREENING_MODEL_PATH to your .h5 file path."
            )
        model = tf.keras.models.load_model(MODEL_PATH)
    return model


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    # Match training: resize to 299x299, scale by 1/255.
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((299, 299))
    arr = np.asarray(img).astype("float32") / 255.0
    arr = np.expand_dims(arr, axis=0)  # (1, 299, 299, 3)
    return arr


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    try:
        m = load_model_once()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model load failed: {e}") from e

    b = await image.read()
    if not b:
        raise HTTPException(status_code=400, detail="Empty image upload.")

    try:
        x = preprocess_image(b)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="Could not read this image. Use a standard JPG or PNG photo.",
        ) from e

    try:
        # sigmoid output shape (1, 1)
        prob = float(m.predict(x, verbose=0)[0][0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}") from e

    label = classify_probability(prob, THRESHOLD)
    return {"probability": prob, "threshold": THRESHOLD, "label": label}

