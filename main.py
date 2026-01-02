"""
FormFiller - Privacy-First AI Agent for Web Form Filling
Main application entry point
"""
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from api.routes import router
from utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    # Startup code
    logger.info("Initializing AI models...")
    from services.whisper_service import get_whisper_service
    from services.ollama_service import get_ollama_service
    
    # Initialize services in background to avoid blocking startup if possible, 
    # but for now we'll do it synchronously to ensure readiness
    try:
        get_whisper_service()
        get_ollama_service()
        logger.info("AI models initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize AI models on startup: {e}")
    
    yield
    
    # Shutdown code (if needed in the future)


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Privacy-first AI agent that automates web form filling using voice commands",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware to allow requests from Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "http://localhost:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/", tags=["root"])
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "status": "running",
        "message": "FormFiller backend is active. Send POST requests to /api/process"
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": settings.WHISPER_MODEL,
        "device": settings.WHISPER_DEVICE
    }


if __name__ == "__main__":
    logger.info(f"Starting {settings.APP_NAME} server...")
    logger.info(f"Server will run at http://{settings.API_HOST}:{settings.API_PORT}")
    logger.info(f"API documentation available at http://{settings.API_HOST}:{settings.API_PORT}/docs")
    
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
