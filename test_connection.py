import os

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

load_dotenv()  # Load environment variables from .env file

# --- CONNECT ---
try:
    client = MongoClient(os.getenv("MONGODB_URI"), serverSelectionTimeoutMS=5000)
    db = client[os.getenv("DB_NAME")]

    # Force connection test (ping the server)
    client.admin.command("ping")

    print("Successfully connected to MongoDB Atlas!")
    print(f"onnected to database: {db.name}")

    # Optional: list collections (will be empty if new)
    print("Existing collections:", db.list_collection_names())

except ConnectionFailure as e:
    print("Could not connect to MongoDB:", e)
