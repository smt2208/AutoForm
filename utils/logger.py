import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from config.settings import settings

def setup_logger(name: str = "FormFiller"):
    """
    Configure and return a logger instance with date-based log rotation
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
        
        # File Handler with Date-based Rotation (TimedRotatingFileHandler)
        # Creates a new log file every day at midnight
        # Example: app.log, app.log.2026-01-05, app.log.2026-01-06, etc.
        file_handler = TimedRotatingFileHandler(
            filename=log_dir / "app.log",
            when="midnight",  # Rotate at midnight
            interval=1,  # Every day
            backupCount=30,  # Keep last 30 days of logs
            encoding='utf-8'
        )
        # Add date format to the backup file names
        file_handler.suffix = "%Y-%m-%d"
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        # Reduce noise from third-party libraries
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("multipart").setLevel(logging.WARNING)
        logging.getLogger("uvicorn").setLevel(logging.INFO)
    
    return logger

logger = setup_logger()
