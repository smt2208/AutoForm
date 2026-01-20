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
    WHISPER_DEVICE: str = "cuda"  # Options: cpu, cuda
    
    # Ollama
    OLLAMA_MODEL: str = "ministral-3:3b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Groq
    GOOGLE_API_KEY : Any = None
    GOOGLE_MODEL: str = "gemini-2.5-flash-lite"
    
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
