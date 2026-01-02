"""
API routes for FormFiller
"""
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
import json
from services.whisper_service import get_whisper_service
from services.ollama_service import get_ollama_service
from utils.file_handler import FileHandler
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
    temp_file_path = None
    
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
        
        # Save uploaded audio file temporarily
        temp_file_path = f"temp_uploads/{audio_file.filename}"
        
        with open(temp_file_path, "wb") as buffer:
            contents = await audio_file.read()
            buffer.write(contents)
        
        logger.info(f"Audio file saved temporarily at: {temp_file_path}")
        
        # Transcribe audio using Whisper
        whisper_service = get_whisper_service()
        transcribed_text = whisper_service.transcribe(temp_file_path)
        
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
        return ProcessResponse(
            success=False,
            transcribed_text="",
            form_data={},
            message=f"Error processing audio: {str(e)}"
        )
    
    finally:
        # Clean up temporary file
        if temp_file_path:
            FileHandler.delete_file(temp_file_path)
