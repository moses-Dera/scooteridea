# 🧠 ML Service — Matching Engine with PPO

> Python FastAPI service for bike-rider matching using Proximal Policy Optimization.

---

## Overview

The ML Service provides an intelligent matching engine that learns from historical ride data to optimize bike-rider matches.

**Current features:**
- Heuristic-based matching (distance, battery, dock proximity)
- PPO model training framework
- Anomaly detection for suspicious rides
- RESTful API for real-time matching

**Planned features:**
- Trained PPO policy for dynamic matching
- LSTM autoencoder for anomaly detection
- Redis-backed model caching

---

## API Endpoints

### `GET /health`
Health check endpoint.

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "ml-service",
  "version": "1.0.0"
}
```

---

### `POST /match`
Match a rider to the best available bike.

**Request:**
```json
{
  "user_lat": 6.5244,
  "user_lng": 3.3792,
  "bike_candidates": [
    {
      "bike_id": "BK-001",
      "distance_km": 0.5,
      "battery_pct": 87,
      "lat": 6.5250,
      "lng": 3.3800,
      "nearest_dock_distance_km": 1.2
    }
  ],
  "context": {
    "user_id": "U-123",
    "user_history_count": 42,
    "avg_ride_duration_min": 15,
    "is_peak_hour": true
  }
}
```

**Response:**
```json
{
  "bike_id": "BK-001",
  "confidence": 0.92,
  "reason": "Optimal match: 92% confidence",
  "alternatives": ["BK-002", "BK-003"]
}
```

---

### `POST /train`
Queue async model training with historical data.

**Response:**
```json
{
  "status": "training_queued",
  "message": "Model training started in background"
}
```

---

### `GET /model/status`
Check current model training status.

**Response:**
```json
{
  "trained": true,
  "model_version": "1.0.0",
  "last_training": "2026-06-19T10:30:00",
  "total_episodes": 5000
}
```

---

### `POST /anomaly-detect`
Detect anomalous ride patterns.

**Request:**
```json
{
  "gps_history": [[6.52, 3.37], [6.52, 3.38], [6.53, 3.38]],
  "speeds": [0, 15, 22, 18, 20]
}
```

**Response:**
```json
{
  "anomaly_score": 0.15,
  "is_anomalous": false,
  "classification": "normal"
}
```

---

## Setup

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Locally

```bash
python -m uvicorn src.main:app --reload
```

Service runs at `http://localhost:8000`

---

## Project Structure

```
ml/
├── src/
│   ├── main.py              ← FastAPI app
│   ├── models/
│   │   └── schemas.py       ← Pydantic models
│   ├── services/
│   │   └── matching.py      ← Core matching logic
│   └── utils/
├── tests/
│   └── test_matching.py
├── requirements.txt
├── package.json
└── README.md
```

---

## Development

### Format Code

```bash
black src/ tests/
```

### Lint

```bash
flake8 src/ tests/
```

### Run Tests

```bash
pytest tests/ -v
```

---

## Next Steps

1. Integrate with Redis for model caching
2. Implement PPO training with Stable-Baselines3
3. Add LSTM autoencoder for anomaly detection
4. Benchmark against heuristic baseline
5. Add model versioning and A/B testing

---

See `src/services/matching.py` for implementation details.
