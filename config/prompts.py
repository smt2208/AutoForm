"""
Prompt templates for form field mapping
"""
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import Dict


class FormFieldMapping(BaseModel):
    """Structured output model for form field mapping"""
    mapped_fields: Dict[str, str] = Field(
        description="Dictionary mapping field IDs to extracted values. Example: {'field_1': 'John Doe', 'email_input': 'john@example.com'}"
    )


def get_form_mapping_prompt() -> tuple[PromptTemplate, JsonOutputParser]:
    """
    Get the prompt template for form field mapping
    
    Returns:
        Tuple of (PromptTemplate, JsonOutputParser)
    """
    parser = JsonOutputParser(pydantic_object=FormFieldMapping)
    
    prompt_template = PromptTemplate(
        template="""You are a form-filling assistant. Extract information from the user's voice input and map it to the form fields.

                FORM FIELDS:
                {fields_json}

                USER'S SPEECH:
                "{transcribed_text}"

                RULES:
                1. Only extract information that was explicitly mentioned in the speech.
                2. Match the user's intent to the correct field ID.
                3. For dates: Use YYYY-MM-DD format (e.g., "Jan 5" -> "2026-01-05").
                4. For phone numbers: Keep only digits.
                5. For email: Keep as lowercase, remove spaces.
                6. For checkboxes/radio: Use "true" if user wants to check/enable, "false" if user wants to uncheck/disable.
                   - Examples: "check terms", "enable notifications" -> "true"
                   - Examples: "uncheck", "remove", "disable", "don't", "no" -> "false"
                7. If a field is not mentioned, don't include it.
                8. Return a JSON object with field IDs as keys and extracted values.
                9. If no relevant information found, return empty JSON {{}}.

                {format_instructions}""",
        input_variables=["fields_json", "transcribed_text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    return prompt_template, parser
