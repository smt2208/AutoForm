"""
API routes for FormFiller
"""
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
import json
import tempfile
import shutil
import os
from services.whisper_service import get_whisper_service
from services.ollama_service import get_ollama_service
from utils.logger import logger

router = APIRouter(prefix="/api", tags=["form-filling"])


class ProcessResponse(BaseModel):
    """Response model for process endpoint"""
    success: bool
    transcribed_text: str
    form_data: dict
    message: str


@router.post("/process", response_model=ProcessResponse)
async def process_audio(
    audio_file: UploadFile = File(...),
    form_data_json: str = Form(default="{}")
):
    """
    Process audio file and extract form filling information
    
    Args:
        audio_file: Audio file upload (WAV, MP3, OGG, etc.)
        form_data_json: JSON string containing form structure and metadata
        
    Returns:
        ProcessResponse with transcribed text and mapped form data
    """
    try:
        # Parse form data JSON
        try:
            form_data = json.loads(form_data_json) if form_data_json else {}
        except json.JSONDecodeError:
            return ProcessResponse(
                success=False,
                transcribed_text="",
                form_data={},
                message="Invalid JSON in form_data_json"
            )
        
        # Handle Audio File using tempfile
        original_filename = audio_file.filename or ""
        
        # Determine the extension to help Whisper identify the format
        file_ext = os.path.splitext(original_filename)[1]
        if not file_ext:
            file_ext = ".wav"

        # Create a temporary file that auto-deletes on close
        temp_audio = tempfile.NamedTemporaryFile(suffix=file_ext, delete=False)
        temp_file_path = temp_audio.name
        
        try:
            logger.info(f"Processing audio via temporary file: {temp_file_path}")
            
            shutil.copyfileobj(audio_file.file, temp_audio)
            
            # Flush the buffer to ensure data is physically written
            temp_audio.flush()
            temp_audio.close()
            
            # Transcribe audio using Whisper
            whisper_service = get_whisper_service()
            transcribed_text = whisper_service.transcribe(temp_file_path)
            
        finally:
            # Clean up the temporary file
            try:
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    logger.debug(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up temporary file {temp_file_path}: {cleanup_error}")
        
        # Map text to form fields using Ollama
        ollama_service = get_ollama_service()
        mapped_form_data = ollama_service.map_text_to_fields(
            transcribed_text,
            json.dumps(form_data)
        )
        
        response = ProcessResponse(
            success=True,
            transcribed_text=transcribed_text,
            form_data=mapped_form_data,
            message="Audio processed and form fields mapped successfully"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error in process endpoint: {str(e)}")
        # Ideally, log the full stack trace in production
        # logger.exception(e)
        return ProcessResponse(
            success=False,
            transcribed_text="",
            form_data={},
            message=f"Error processing audio: {str(e)}"
        )