import logging
import sys
from pathlib import Path
from config.settings import settings

def setup_logger(name: str = "FormFiller"):
    """
    Configure and return a logger instance
    """
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    logger = logging.getLogger(name)
    
    # Only configure if handlers haven't been added yet
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        if settings.DEBUG:
            logger.setLevel(logging.DEBUG)
        
        # Formatters
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Console Handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        # File Handler
        file_handler = logging.FileHandler(log_dir / "app.log", encoding='utf-8')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        # Reduce noise from third-party libraries
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("multipart").setLevel(logging.WARNING)
        logging.getLogger("uvicorn").setLevel(logging.INFO)
    
    return logger

logger = setup_logger()
