"""Data models and schemas for ML service."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class BikeCandidate(BaseModel):
    """Candidate bike for matching."""
    bike_id: str
    distance_km: float = Field(..., ge=0, description="Distance from user in km")
    battery_pct: float = Field(..., ge=0, le=100, description="Battery percentage")
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")
    nearest_dock_distance_km: float = Field(..., ge=0, description="Distance to nearest dock")
    speed_kmh: float = Field(default=0, ge=0, description="Current speed")
    status: str = Field(default="available", description="Bike status")


class RiderContext(BaseModel):
    """Context about the rider for better matching."""
    user_id: Optional[str] = None
    user_history_count: int = Field(default=0, description="Number of previous rides")
    avg_ride_duration_min: float = Field(default=0, description="Average ride duration")
    preferred_distance_km: float = Field(default=2.0, description="Typical ride distance")
    time_of_day: str = Field(default="afternoon", description="Morning/Afternoon/Evening/Night")
    is_peak_hour: bool = Field(default=False, description="Is this peak demand hour?")


class MatchRequest(BaseModel):
    """Request to match rider to bike."""
    user_lat: float = Field(..., ge=-90, le=90, description="User latitude")
    user_lng: float = Field(..., ge=-180, le=180, description="User longitude")
    bike_candidates: List[BikeCandidate] = Field(..., min_items=1, description="Available bikes to match from")
    context: Optional[RiderContext] = None
    max_distance_km: float = Field(default=2.0, description="Maximum acceptable distance")


class MatchResponse(BaseModel):
    """Response with matched bike and confidence."""
    bike_id: str
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")
    reason: str = Field(default="", description="Why this bike was selected")
    alternatives: Optional[List[str]] = None


class AnomalyType(str, Enum):
    """Types of ride anomalies."""
    NORMAL = "normal"
    ROUTE_DEVIATION = "route_deviation"
    SPEED_VIOLATION = "speed_violation"
    GEOFENCE_BREACH = "geofence_breach"
    POSSIBLE_THEFT = "possible_theft"
    ACCIDENT = "accident"


class TrainingMetrics(BaseModel):
    """Model training metrics."""
    episodes_completed: int
    average_reward: float
    best_reward: float
    loss: float
    last_updated: str
