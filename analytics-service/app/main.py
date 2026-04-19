from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import connect_db, close_db
from app.routes.analytics import router as analytics_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(
    title="FairGig Analytics Service",
    description="City medians, platform trends, income distribution, and vulnerability flags",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics_router, tags=["Analytics"])

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "analytics-service", "port": 8003}
