from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.analyzer import analyze_anomaly

router = APIRouter()

class EarningSnapshot(BaseModel):
    gross_amount: float = 0
    deductions: float = 0
    net_amount: float = 0
    hours_worked: float = 0
    hourly_rate: float = 0

class AnalyzeTrendRequest(BaseModel):
    current_earning: Dict[str, Any]
    historical_earnings: List[Dict[str, Any]] = []

@router.post("/analyze-trend")
async def analyze_trend(request: AnalyzeTrendRequest):
    try:
        result = analyze_anomaly(request.current_earning, request.historical_earnings)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/batch-analyze")
async def batch_analyze(earnings: List[Dict[str, Any]]):
    results = []
    for i, earning in enumerate(earnings):
        historical = earnings[max(0, i-10):i]
        result = analyze_anomaly(earning, historical)
        results.append({"index": i, "earning_id": earning.get("id"), "anomaly": result})
    return {"results": results, "total": len(results)}
