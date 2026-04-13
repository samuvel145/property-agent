import webrtcvad
import os
import sys

# Ensure config is available globally easily
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from .audio_buffer import AudioBuffer

class VADProcessor:
    def __init__(self):
        self.vad = webrtcvad.Vad(settings.VAD_AGGRESSIVENESS)
        self.buffer = AudioBuffer()
        self.silence_frames = 0
        self.silence_frames_threshold = settings.SILENCE_THRESHOLD_MS // settings.FRAME_DURATION_MS

    def process(self, frame: bytes) -> tuple[bool, bool]:
        """
        Returns (is_speech, speech_ended)
        """
        # webrtcvad expects to process 10, 20, or 30 ms frames.
        # Ensure frame is correctly sized; pad if necessary.
        if len(frame) < settings.FRAME_SIZE:
            frame = frame.ljust(settings.FRAME_SIZE, b'\0')
        elif len(frame) > settings.FRAME_SIZE:
            frame = frame[:settings.FRAME_SIZE]
            
        try:
            is_speech = self.vad.is_speech(frame, settings.SAMPLE_RATE)
        except Exception:
            # If vad fails (e.g. malformed chunk), treat as silence
            is_speech = False

        if is_speech:
            self.buffer.append(frame)
            self.silence_frames = 0
            return True, False
        else:
            if self.buffer.has_data():
                self.silence_frames += 1
                if self.silence_frames >= self.silence_frames_threshold:
                    return False, True
                else:
                    self.buffer.append(frame)
                    return False, False
            return False, False

    def get_audio_buffer(self) -> bytes:
        return self.buffer.get_audio()

    def has_buffered_audio(self) -> bool:
        return self.buffer.has_data()

    def reset(self):
        self.buffer.reset()
        self.silence_frames = 0
