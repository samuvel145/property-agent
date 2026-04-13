from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.websocket_handler import handle_voice_session

app = FastAPI(title="JLL Voice Agent")

# Allow all origins for Vercel/frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "jll-voice-agent"}

@app.websocket("/ws/voice/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    await handle_voice_session(websocket, session_id)

@app.get("/")
def read_root():
    return {"message": "JLL Voice Agent running", "ws": "/ws/voice/{session_id}"}
