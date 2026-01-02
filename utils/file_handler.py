"""
File handling utilities for FormFiller
"""
import os
import shutil
from pathlib import Path
from typing import Optional
from config.settings import settings


class FileHandler:
    """Handles temporary file operations for audio uploads"""
    
    @staticmethod
    def save_upload(file_path: str, filename: str) -> str:
        """
        Save uploaded file to temporary directory
        
        Args:
            file_path: Path to the uploaded file
            filename: Original filename
            
        Returns:
            Path to the saved file
        """
        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        destination = upload_dir / filename
        shutil.copy2(file_path, destination)
        
        return str(destination)
    
    @staticmethod
    def delete_file(file_path: str) -> bool:
        """
        Delete a temporary file
        
        Args:
            file_path: Path to the file to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        except Exception as e:
            print(f"Error deleting file {file_path}: {str(e)}")
            return False
        return False
    
    @staticmethod
    def cleanup_directory() -> None:
        """Clean up all temporary files in upload directory"""
        try:
            upload_dir = Path(settings.UPLOAD_DIR)
            if upload_dir.exists():
                shutil.rmtree(upload_dir)
                upload_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Error cleaning up directory: {str(e)}")
