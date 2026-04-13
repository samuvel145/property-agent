import os
import sys

# Ensure config is available globally easily
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

class AudioBuffer:
    def __init__(self):
        self._buffer: list[bytes] = []

    def append(self, frame: bytes):
        self._buffer.append(frame)

    def get_audio(self) -> bytes:
        return b"".join(self._buffer)

    def reset(self):
        self._buffer.clear()

    def has_data(self) -> bool:
        return len(self._buffer) > 0

    def duration_ms(self) -> int:
        total_bytes = sum(len(f) for f in self._buffer)
        # 16-bit audio = 2 bytes per sample
        return int(total_bytes / (settings.SAMPLE_RATE * 2) * 1000)
