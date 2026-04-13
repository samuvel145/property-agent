from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DEEPGRAM_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    CARTESIA_API_KEY: str = ""
    CARTESIA_VOICE_ID: str = "default"
    JLL_API_BASE_URL: str = "https://jll-backend.ibism.com/api"
    
    SAMPLE_RATE: int = 16000
    FRAME_DURATION_MS: int = 20
    CHANNELS: int = 1
    
    @property
    def FRAME_SIZE(self) -> int:
        return self.SAMPLE_RATE * 2 * self.FRAME_DURATION_MS // 1000  # equals 640 bytes

    VAD_AGGRESSIVENESS: int = 2
    SILENCE_THRESHOLD_MS: int = 800
    MAX_HISTORY_TURNS: int = 10
    LLM_MODEL: str = "llama-3.1-8b-instant"
    LLM_MAX_TOKENS: int = 500
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local"), 
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
