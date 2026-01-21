"""
Ollama LLM service for form field mapping
"""
from langchain_ollama import ChatOllama
from config.settings import settings
from dotenv import load_dotenv
from config.prompts import get_form_mapping_prompt
from utils.logger import logger
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI


class OllamaService:
    """Service for LLM-based form field mapping using Ollama"""
    
    def __init__(self):
        """Initialize Ollama LLM"""
        self.model = None
        self._load_model()
        load_dotenv()
    
    def _load_model(self) -> None:
        """Load the Ollama model"""
        try:
            if settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY.strip():
                logger.info("Google API key found, using Gemini model instead of Ollama.")
                self.model = ChatGoogleGenerativeAI(
                    model=settings.GOOGLE_MODEL, 
                    temperature=0.2
                )
                logger.info("Gemini model loaded successfully")
            else:
                logger.info(f"No Google API key found, loading Ollama model: {settings.OLLAMA_MODEL}...")
                self.model = ChatOllama(
                    model=settings.OLLAMA_MODEL,
                    base_url=settings.OLLAMA_BASE_URL,
                    temperature=0.2,
                    format="json"  # Enforces JSON mode on the model side
                )
                logger.info("Ollama model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
    def map_text_to_fields(self, transcribed_text: str, fields_json: str) -> dict:
        """
        Map transcribed text to form fields using LLM with structured parsing
        
        Args:
            transcribed_text: The transcribed audio text
            fields_json: JSON string containing form fields structure
            
        Returns:
            Dictionary with mapped field values
        """
        try:
            if self.model is None:
                raise RuntimeError("Model is not initialized")
            
            logger.info(f"Processing transcription: {transcribed_text[:50]}...")
            
            prompt_template, parser = get_form_mapping_prompt()

            chain = prompt_template | self.model | parser
            
            logger.info("Triggering the chain...")
            parsed_response = chain.invoke({
                "fields_json": fields_json, 
                "transcribed_text": transcribed_text
            })
            
            # The parser returns the Pydantic structure as a dict: {'mapped_fields': {...}}
            mapped_data = parsed_response.get("mapped_fields", {})
            
            logger.info(f"Raw parsed data: {mapped_data}")

            final_data = self._post_process_fields(mapped_data)
            
            logger.info(f"Final Mapped Data: {final_data}")
            return final_data
            
        except Exception as e:
            logger.error(f"Error during field mapping: {str(e)}")
            return {}
    
    def _post_process_fields(self, fields: dict) -> dict:
        """
        Post-process extracted fields to ensure correct formatting
        """
        cleaned = {}
        for key, value in fields.items():
            # Strict filtering of empty/invalid values
            if value is None:
                continue
            
            if isinstance(value, str):
                value = value.strip()
                if value == "" or value.lower() in ["none", "null", "n/a"]:
                    continue
                
            # Normalize email fields to lowercase
            if 'email' in key.lower() and isinstance(value, str):
                value = value.lower().replace(' ', '')
            
            # Clean up phone numbers
            elif 'phone' in key.lower() and isinstance(value, str):
                value = ''.join(filter(str.isdigit, value))
            
            # Normalize gender to lowercase
            elif 'gender' in key.lower() and isinstance(value, str):
                value = value.lower().strip()
                if value in ['m', 'man', 'boy']:
                    value = 'male'
                elif value in ['f', 'woman', 'girl']:
                    value = 'female'
            
            cleaned[key] = value
        
        return cleaned


# Singleton instance
_ollama_service = None

def get_ollama_service() -> OllamaService:
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaService()
    return _ollama_service