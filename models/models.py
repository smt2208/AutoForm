"""
Data models for AutoForm
"""
from pydantic import BaseModel, Field
from typing import Dict


class FormFieldMapping(BaseModel):
    """Structured output model for form field mapping"""
    mapped_fields: Dict[str, str] = Field(
        description="Dictionary mapping field IDs to extracted values. Example: {'field_1': 'John Doe', 'email_input': 'john@example.com'}"
    )