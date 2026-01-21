"""
Configuration settings for FormFiller application
"""
import os
from typing import Any
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    APP_NAME: str = "FormFiller"
    DEBUG: bool = True
    
    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # Audio processing
    UPLOAD_DIR: str = "temp_uploads"
    WHISPER_MODEL: str = "medium"  # Options: tiny, base, small, medium, large-v3
    WHISPER_DEVICE: str = "cpu"  # Options: cpu, cuda
    
    # Ollama
    OLLAMA_MODEL: str = "gemma3:1b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Gemini
    GOOGLE_API_KEY : Any = os.getenv("GOOGLE_API_KEY", None)
    GOOGLE_MODEL: str = "gemini-2.5-flash-lite"

    OPENAI_API_KEY: Any = os.getenv("OPENAI_API_KEY", None)
    OPENAI_MODEL: str = "gpt-4.1-2025-04-14"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"
    
    def __init__(self, **data):
        super().__init__(**data)
        # Create upload directory if it doesn't exist
        Path(self.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


# Create settings instance
settings = Settings()
