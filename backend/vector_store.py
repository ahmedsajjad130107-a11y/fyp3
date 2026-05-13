# backend/vector_store.py

import os
import chromadb

# Base dir = backend folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Where Chroma will store its DB files
VECTOR_DB_DIR = os.path.join(BASE_DIR, "vector_db")
os.makedirs(VECTOR_DB_DIR, exist_ok=True)

# Lazy client: creating PersistentClient at import time slows / blocks cold starts
# (e.g. Railway health checks) and uses memory before any request needs Chroma.
_chroma_client = None

SPOTS_COLLECTION_NAME = "travel_spots"


def _get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=VECTOR_DB_DIR)
    return _chroma_client


def get_spots_collection():
    """
    Main collection for all city/spot embeddings.
    """
    return _get_chroma_client().get_or_create_collection(SPOTS_COLLECTION_NAME)
