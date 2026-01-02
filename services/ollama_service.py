"""
Ollama LLM service for form field mapping
"""
import json
from typing import Dict
from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field
from config.settings import settings
from utils.logger import logger


class FormFieldMapping(BaseModel):
    """Structured output model for form field mapping"""
    mapped_fields: Dict[str, str] = Field(
        description="Dictionary mapping field IDs to extracted values"
    )


class OllamaService:
    """Service for LLM-based form field mapping using Ollama"""
    
    def __init__(self):
        """Initialize Ollama LLM"""
        self.model = None
        self._load_model()
    
    def _load_model(self) -> None:
        """Load the Ollama model with structured output"""
        try:
            logger.info(f"Loading Ollama model: {settings.OLLAMA_MODEL}...")
            base_model = ChatOllama(
                model=settings.OLLAMA_MODEL,
                base_url=settings.OLLAMA_BASE_URL,
                temperature=0,
                format="json"
            )
            # Apply structured output schema
            self.model = base_model.with_structured_output(FormFieldMapping)
            logger.info("Ollama model loaded successfully with structured output")
        except Exception as e:
            logger.error(f"Error loading Ollama model: {str(e)}")
            raise
    
    def map_text_to_fields(self, transcribed_text: str, fields_json: str) -> dict:
        """
        Map transcribed text to form fields using LLM
        
        Args:
            transcribed_text: The transcribed audio text
            fields_json: JSON string containing form fields structure
            
        Returns:
            Dictionary with mapped field values
            
        Raises:
            Exception: If mapping fails
        """
        try:
            if self.model is None:
                raise RuntimeError("Ollama model not initialized")
            
            # Build improved prompt with specific formatting rules
            prompt = f"""You are a smart form-filling assistant. Your goal is to map the user's spoken instructions to the correct form fields.

            CONTEXT:
            The user is filling out a form. They might provide information for all fields at once, or just a few fields at a time (partial filling).
            
            Form Fields Structure:
            {fields_json}

            User's Speech:
            "{transcribed_text}"

            CRITICAL INSTRUCTIONS:
            1. **PARTIAL FILLING**: Only extract information that is EXPLICITLY mentioned in the speech.
            2. **NO HALLUCINATIONS**: If the speech talks about "Address", DO NOT touch the "Name" or "Email" fields. Leave them out of your response.
            3. **MAPPING**: Match the speech to the field 'label' or 'name'.
            4. **FORMATTING**:
               - Email: lowercase, no spaces.
               - Date: YYYY-MM-DD.
               - Phone: digits and hyphens only.
               - Gender: lowercase (male/female).
            5. **OUTPUT**: Return a JSON object where keys are field IDs and values are the extracted strings.
            
            IMPORTANT: If a field is not mentioned in the speech, DO NOT include it in the JSON output.

            Task: Generate the JSON mapping."""
            
            logger.info(f"Sending prompt to Ollama model...")
            logger.debug(f"Transcribed Text: {transcribed_text}")
            
            # Invoke model with structured output
            response = self.model.invoke(prompt)
            
            # Extract mapped fields from structured response
            # Handle both Pydantic model and dictionary return types
            if isinstance(response, dict):
                mapped_data = response.get("mapped_fields", {})
            elif hasattr(response, "mapped_fields"):
                mapped_data = getattr(response, "mapped_fields")
            else:
                logger.warning(f"Unexpected response type: {type(response)}")
                mapped_data = {}
            
            # Post-process to ensure email is lowercase and clean up values
            mapped_data = self._post_process_fields(mapped_data)
            
            logger.info(f"LLM Response (Processed): {mapped_data}")
            
            return mapped_data
            
        except Exception as e:
            logger.error(f"Error during field mapping: {str(e)}")
            raise
    
    def _post_process_fields(self, fields: dict) -> dict:
        """
        Post-process extracted fields to ensure correct formatting
        
        Args:
            fields: Dictionary of field values
            
        Returns:
            Cleaned dictionary of field values
        """
        cleaned = {}
        for key, value in fields.items():
            # Strict filtering of empty/invalid values
            if value is None:
                continue
            
            if isinstance(value, str):
                value = value.strip()
                if value == "" or value.lower() == "none" or value.lower() == "null" or value.lower() == "n/a":
                    continue
                
            # Normalize email fields to lowercase
            if 'email' in key.lower() and isinstance(value, str):
                value = value.lower().strip()
                # Remove spaces from email
                value = value.replace(' ', '')
            
            # Clean up phone numbers
            elif 'phone' in key.lower() and isinstance(value, str):
                # Remove all non-digit characters, keep only digits
                value = ''.join(filter(str.isdigit, value))
            
            # Normalize gender to lowercase
            elif 'gender' in key.lower() and isinstance(value, str):
                value = value.lower().strip()
                # Map common variations
                if value in ['m', 'man', 'boy']:
                    value = 'male'
                elif value in ['f', 'woman', 'girl']:
                    value = 'female'
            
            cleaned[key] = value
        
        return cleaned


# Singleton instance
_ollama_service = None


def get_ollama_service() -> OllamaService:
    """
    Get or create Ollama service instance
    
    Returns:
        OllamaService instance
    """
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaService()
    return _ollama_service
