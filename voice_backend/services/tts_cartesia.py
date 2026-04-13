import asyncio
from cartesia import AsyncCartesia
from typing import AsyncGenerator
import os
import sys

# Ensure config is available globally easily
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

class CartesiaTTS:
    def __init__(self):
        try:
            self.client = AsyncCartesia(api_key=settings.CARTESIA_API_KEY)
            self.voice_id = settings.CARTESIA_VOICE_ID if settings.CARTESIA_VOICE_ID else "a0e99841-438c-4a64-b6a9-ae082307590a" # Default sonic-2 voice
        except Exception as e:
            print(f"Failed to initialize Cartesia: {e}")
            self.client = None

    async def synthesize(self, text: str) -> AsyncGenerator[bytes, None]:
        if not self.client or not text.strip():
            return
            
        try:
            ws = await self.client.tts.websocket()
            
            # Request audio generation
            await ws.send({
                "model_id": "sonic-english",
                "transcript": text,
                "voice": {
                    "mode": "id",
                    "id": self.voice_id,
                },
                "output_format": {
                    "container": "raw",
                    "encoding": "pcm_s16le",
                    "sample_rate": settings.SAMPLE_RATE,
                },
            })

            # Stream chunks from the websocket
            async for chunk in ws.receive():
                if "audio" in chunk:
                    yield chunk["audio"]
                if chunk.get("done"):
                    break
                    
            await ws.close()
            
        except Exception as e:
            print(f"Cartesia TTS error: {e}")

# Singleton
tts_service = CartesiaTTS()
