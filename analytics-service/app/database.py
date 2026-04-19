from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_db():
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/fairgig_earnings")
    db_instance.client = AsyncIOMotorClient(uri)
    db_instance.db = db_instance.client.get_default_database()
    print("MongoDB connected (analytics-service)")

async def close_db():
    if db_instance.client:
        db_instance.client.close()

def get_db():
    return db_instance.db
