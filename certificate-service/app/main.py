from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.certificate import router as cert_router
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="FairGig Certificate Service",
    description="Generates income verification certificates for verified gig workers",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cert_router, prefix="/api/certificate", tags=["Certificate"])

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "certificate-service", "port": 8004}
