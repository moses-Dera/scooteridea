"""ML Service entry point - FastAPI application for matching engine with PPO."""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import logging

from src.services.matching import PPOMatchingEngine
from src.models.schemas import BikeCandidate, MatchRequest, MatchResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="E-Bike ML Service", version="1.0.0")

# Initialize matching engine
matching_engine = PPOMatchingEngine()


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="ml-service",
        version="1.0.0"
    )


@app.post("/match", response_model=MatchResponse)
async def match_bike(request: MatchRequest):
    """
    Match a rider to the best available bike using PPO reinforcement learning.
    
    Args:
        request: MatchRequest containing user location and candidate bikes
    
    Returns:
        MatchResponse with best bike ID and confidence score
    
    Raises:
        HTTPException: If matching fails
    """
    try:
        logger.info(f"Matching request: user at ({request.user_lat}, {request.user_lng})")
        
        result = matching_engine.match(
            user_lat=request.user_lat,
            user_lng=request.user_lng,
            candidates=request.bike_candidates,
            context=request.context
        )
        
        logger.info(f"Match result: {result.bike_id} (confidence: {result.confidence})")
        
        return result
    
    except Exception as e:
        logger.error(f"Matching failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train")
async def train_model(background_tasks: BackgroundTasks):
    """
    Trigger asynchronous training of PPO model with historical ride data.
    
    This endpoint queues a background task to train the RL model.
    Training updates the agent's policy based on real ride patterns.
    """
    try:
        background_tasks.add_task(matching_engine.train_async)
        return {"status": "training_queued", "message": "Model training started in background"}
    
    except Exception as e:
        logger.error(f"Training failed to start: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model/status")
async def model_status():
    """Get current model training status and metrics."""
    return {
        "trained": matching_engine.is_trained(),
        "model_version": matching_engine.get_model_version(),
        "last_training": matching_engine.get_last_training_time(),
        "total_episodes": matching_engine.get_episode_count()
    }


@app.post("/anomaly-detect")
async def detect_anomaly(ride_data: dict):
    """
    Detect anomalous ride patterns (potential theft, accidents, misuse).
    
    Args:
        ride_data: Ride telemetry data (GPS history, speed, etc.)
    
    Returns:
        Anomaly score (0-1) and classification
    """
    try:
        score = matching_engine.detect_anomaly(ride_data)
        return {
            "anomaly_score": score,
            "is_anomalous": score > 0.7,
            "classification": "high_risk" if score > 0.8 else "medium_risk" if score > 0.5 else "normal"
        }
    
    except Exception as e:
        logger.error(f"Anomaly detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
