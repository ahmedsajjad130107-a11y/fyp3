"""
Simple script to run the FastAPI server.
Run this from the backend directory: python run_server.py

Railway (and other hosts) set PORT and expect the app to listen on 0.0.0.0.
"""

import os

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    # 0.0.0.0 is required for Docker / Railway; still reachable as http://127.0.0.1:PORT locally
    host = "0.0.0.0"
    reload = os.environ.get("RAILWAY_ENVIRONMENT") is None
    uvicorn.run("main:app", host=host, port=port, reload=reload)

