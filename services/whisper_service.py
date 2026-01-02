"""
Whisper transcription service for FormFiller
"""
from faster_whisper import WhisperModel
from config.settings import settings
from utils.logger import logger


class WhisperService:
    """Service for audio transcription using Faster-Whisper"""
    
    def __init__(self):
        """Initialize Whisper model"""
        self.model = None
        self._load_model()
    
    def _load_model(self) -> None:
        """Load the Whisper model with configured settings"""
        try:
            logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL}")
            self.model = WhisperModel(
                settings.WHISPER_MODEL,
                device=settings.WHISPER_DEVICE,
                compute_type="int8"
            )
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading Whisper model: {str(e)}")
            raise
    
    def transcribe(self, audio_file_path: str) -> str:
        """
        Transcribe audio file to text
        
        Args:
            audio_file_path: Path to the audio file
            
        Returns:
            Transcribed text
            
        Raises:
            Exception: If transcription fails
        """
        try:
            if self.model is None:
                raise RuntimeError("Whisper model not initialized")
            
            logger.info(f"Transcribing audio file: {audio_file_path}")
            
            segments, info = self.model.transcribe(
                audio_file_path,
                beam_size=5,
                language="en"
            )
            
            # Combine all segments into single text
            transcribed_text = " ".join(segment.text for segment in segments)
            
            logger.info(f"Transcription completed. Detected language: {info.language}")
            logger.debug(f"Transcribed text: {transcribed_text}")
            
            return transcribed_text
            
        except Exception as e:
            logger.error(f"Error during transcription: {str(e)}")
            raise


# Singleton instance
_whisper_service = None


def get_whisper_service() -> WhisperService:
    """
    Get or create Whisper service instance
    
    Returns:
        WhisperService instance
    """
    global _whisper_service
    if _whisper_service is None:
        _whisper_service = WhisperService()
    return _whisper_service
