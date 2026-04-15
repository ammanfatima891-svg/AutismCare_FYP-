# ML Services

## Facial screening inference service (TensorFlow `.h5`)

This service loads the Keras model trained in `autism_model_training.py` (InceptionV3, input 299×299 RGB, rescale 1/255) and exposes an HTTP API.

### 1) Put the model in place

Copy your trained model file to:

- `server/ml/models/inception_v3.h5`

Or set an absolute path via `FACIAL_SCREENING_MODEL_PATH`.

### 2) Create Python env + install deps

From repo root:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r server/ml/facial_screening_service/requirements.txt
```

### 3) Run the service

```bash
set FACIAL_SCREENING_MODEL_PATH=C:\path\to\inception_v3.h5
set FACIAL_SCREENING_THRESHOLD=0.5
uvicorn server.ml.facial_screening_service.app:app --host 127.0.0.1 --port 8001
```

Health check:

- `GET /health`

Predict:

- `POST /predict` (multipart/form-data, `image=<file>`)

### 4) Node/Express API

The backend exposes:

- `POST /api/facial-screening/predict` (multipart/form-data, `image=<file>`)

It forwards the image to the Python service URL:

- `FACIAL_SCREENING_SERVICE_URL` (default `http://127.0.0.1:8001`)

