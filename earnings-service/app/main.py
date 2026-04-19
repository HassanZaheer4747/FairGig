from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database import connect_db, close_db
from app.routes import earnings
from app.config import get_settings

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    os.makedirs(settings.upload_dir, exist_ok=True)
    yield
    await close_db()

app = FastAPI(
    title="FairGig Earnings Service",
    description="Earnings tracking, verification, and analysis for gig workers",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(earnings.router, prefix="/api/earnings", tags=["Earnings"])

if os.path.exists(settings.upload_dir):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "earnings-service", "port": settings.port}
