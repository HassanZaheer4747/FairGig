from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.anomaly import router as anomaly_router

app = FastAPI(
    title="FairGig Anomaly Detection Service",
    description="Detects income anomalies, abnormal deductions, and hourly rate issues",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(anomaly_router, tags=["Anomaly Detection"])

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "anomaly-service", "port": 8002}
