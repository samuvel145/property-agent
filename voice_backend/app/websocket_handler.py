from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import os
import sys
import json

# Ensure config is available globally easily
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session.session_manager import session_manager
from audio.vad import VADProcessor
from services.stt_deepgram import stt_service
from services.llm_groq import llm_service
from services.tts_cartesia import tts_service
from mcp.jll_tools import JLL_TOOLS

async def handle_voice_session(websocket: WebSocket, session_id: str):
    session = session_manager.get_or_create(session_id)
    vad = VADProcessor()
    
    await websocket.send_json({"type": "state", "state": "idle"})
    
    try:
        while True:
            # Using receive() handles both text and bytes
            message = await websocket.receive()
            
            if "bytes" in message:
                frame = message["bytes"]
                is_speech, speech_ended = vad.process(frame)
                
                if speech_ended and vad.has_buffered_audio():
                    # End of speech detected! Let's process it.
                    await websocket.send_json({"type": "state", "state": "processing"})
                    
                    audio_bytes = vad.get_audio_buffer()
                    transcript = await stt_service.transcribe(audio_bytes)
                    
                    if not transcript:
                        vad.reset()
                        await websocket.send_json({"type": "state", "state": "idle"})
                        continue
                        
                    print(f"Transcript: {transcript}")
                    await websocket.send_json({"type": "transcript", "text": transcript})
                    
                    # Call LLM
                    llm_text, tool_result = await llm_service.generate(
                        transcript=transcript,
                        history=session.get_history(),
                        tools=JLL_TOOLS
                    )
                    
                    # Update properties if tool was used
                    if tool_result:
                        await websocket.send_json({
                            "type": "properties",
                            "data": tool_result.get("data", []),
                            "total": tool_result.get("total", 0)
                        })
                        
                    print(f"LLM Response: {llm_text}")
                    await websocket.send_json({"type": "llm_text", "text": llm_text})
                    await websocket.send_json({"type": "state", "state": "speaking"})
                    
                    # Stream TTS
                    async for audio_chunk in tts_service.synthesize(llm_text):
                        await websocket.send_bytes(audio_chunk)
                        
                    # Save context
                    session.add_turn(user_text=transcript, assistant_text=llm_text)
                    
                    # Ready for next turn
                    vad.reset()
                    await websocket.send_json({"type": "state", "state": "idle"})

            elif "text" in message:
                try:
                    payload = json.loads(message["text"])
                    msg_type = payload.get("type")
                    if msg_type == "start":
                        print(f"Session {session_id} started")
                    elif msg_type == "stop":
                        print(f"Session {session_id} stopped via client message")
                        break
                except json.JSONDecodeError:
                    pass

    except WebSocketDisconnect:
        print(f"Client disconnected for session {session_id}")
    finally:
        session_manager.delete(session_id)
