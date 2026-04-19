from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class VerificationStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    unverifiable = "unverifiable"

class AnomalyResult(BaseModel):
    is_anomaly: bool = False
    score: float = 0.0
    type: str = "none"
    explanation: str = ""

class EarningCreate(BaseModel):
    date: str
    platform: str
    city: str
    gross_amount: float
    deductions: float = 0.0
    hours_worked: float
    trips_or_orders: Optional[int] = None
    notes: Optional[str] = None
    screenshot_url: Optional[str] = None

class EarningUpdate(BaseModel):
    date: Optional[str] = None
    platform: Optional[str] = None
    city: Optional[str] = None
    gross_amount: Optional[float] = None
    deductions: Optional[float] = None
    hours_worked: Optional[float] = None
    trips_or_orders: Optional[int] = None
    notes: Optional[str] = None
    verification_status: Optional[VerificationStatus] = None

class EarningResponse(BaseModel):
    id: str
    worker_id: str
    date: str
    platform: str
    city: str
    gross_amount: float
    deductions: float
    net_amount: float
    hours_worked: float
    hourly_rate: float
    trips_or_orders: Optional[int]
    notes: Optional[str]
    screenshot_url: Optional[str]
    verification_status: str
    anomaly: Optional[dict]
    created_at: str
    updated_at: str
