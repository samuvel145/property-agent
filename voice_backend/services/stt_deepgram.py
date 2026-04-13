import asyncio
from deepgram import DeepgramClient, DeepgramClientOptions, PrerecordedOptions
import os
import sys

# Ensure config is available globally easily
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

class DeepgramSTT:
    def __init__(self):
        try:
            options: DeepgramClientOptions = DeepgramClientOptions()
            self.client = DeepgramClient(settings.DEEPGRAM_API_KEY, options)
        except Exception as e:
            print(f"Failed to initialize Deepgram: {e}")
            self.client = None

    async def transcribe(self, audio_bytes: bytes) -> str:
        if not self.client:
            print("Deepgram client not initialized")
            return ""
            
        try:
            payload = {
                "buffer": audio_bytes
            }
            options = PrerecordedOptions(
                model="nova-2",
                language="en-IN",
                smart_format=True,
                punctuate=True,
                encoding="linear16",
                sample_rate=settings.SAMPLE_RATE
            )
            
            # Use async version of prerecorded
            response = await asyncio.to_thread(
                self.client.listen.prerecorded.v("1").transcribe_file,
                payload,
                options
            )
            
            # Since deepgram-sdk parses keys safely:
            transcript = response.results.channels[0].alternatives[0].transcript
            return transcript.strip()
            
        except Exception as e:
            print(f"Deepgram transcription error: {e}")
            return ""

# Singleton
stt_service = DeepgramSTT()
