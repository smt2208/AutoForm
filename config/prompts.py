"""
Prompt templates for form field mapping
"""
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from models.models import FormFieldMapping


def get_form_mapping_prompt() -> tuple[PromptTemplate, JsonOutputParser]:
    """
    Get the prompt template for form field mapping
    
    Returns:
        Tuple of (PromptTemplate, JsonOutputParser)
    """
    parser = JsonOutputParser(pydantic_object=FormFieldMapping)
    
    prompt_template = PromptTemplate(
        template="""You are an intelligent form-filling assistant. Extract information from the user's voice input and map it to the form fields. You must intelligently correct spelling errors, mishears, typos, and common mistakes in the transcription. Analyze each form field carefully and use context from field labels, types, and common patterns to make smart corrections.

                FORM FIELDS:
                {fields_json}

                USER'S SPEECH (RAW TRANSCRIPTION):
                "{transcribed_text}"

                INSTRUCTIONS:
                1. FIRST, analyze each form field:
                   - Look at the field label, type, and any placeholder text
                   - Determine what type of data it expects (name, email, phone, address, etc.)
                   - Consider common variations and misspellings for that field type

                2. CORRECT TRANSCRIPTION ERRORS:
                   - Fix obvious spelling mistakes: "jon" -> "John", "smoth" -> "Smith", "gmial" -> "gmail"
                   - Correct speech recognition errors: "at the rate" -> "@", "dot com" -> ".com", "won too three" -> "123"
                   - Handle homophones and similar sounding words using field context
                   - Fix common typos in names, addresses, emails, etc.

                3. INTELLIGENT MAPPING:
                   - Match user intent to correct field ID based on context
                   - If user says "name", map to appropriate name field (firstName, lastName, fullName)
                   - Use field labels to disambiguate (e.g., "billing address" vs "shipping address")

                4. DATA FORMATTING BY FIELD TYPE:
                   - NAMES: Capitalize properly, correct spellings (e.g., "jon doe" -> "John Doe")
                   - EMAILS: Lowercase, fix domains (e.g., "john at yahoo dot com" -> "john@yahoo.com")
                   - PHONES: Extract digits only, correct common formats
                   - ADDRESSES: Correct street types, city names, state abbreviations
                   - DATES: Convert to YYYY-MM-DD, handle various formats
                   - CHECKBOXES/RADIO: "true" for yes/agree/check, "false" for no/disagree/uncheck

                5. GENERAL SPELLING CORRECTIONS:
                   - Use phonetic similarity and context to correct words
                   - Common name corrections: "micheal" -> "Michael", "sarah" -> "Sarah"
                   - Address corrections: "california" -> "California", "newyork" -> "New York"
                   - Email domains: "gmail" from "gmial", "yahoo" from "yaho", "hotmail" from "hotmale"

                6. CONTEXT-AWARE CORRECTIONS:
                   - If field is "city", correct to known cities: "la" -> "Los Angeles", "nyc" -> "New York City"
                   - If field is "state", use abbreviations: "california" -> "CA", "texas" -> "TX"
                   - If field is "country", correct common misspellings: "united states" -> "United States"

                7. ONLY INCLUDE FIELDS MENTIONED:
                   - If user didn't mention a field, don't include it
                   - Return empty JSON {{}} if no relevant information

                EXAMPLES OF SMART CORRECTIONS:
                - Speech: "my name is jon smoth, email john at gmial dot com, phone won too three four five six seven eight nine"
                  -> firstName: "John", lastName: "Smith", email: "john@gmail.com", phone: "123456789"

                - Speech: "i live in nyu york on main streat, zip code won two three four five"
                  -> city: "New York", street: "Main Street", zipCode: "12345"

                - Speech: "check the terms and conditions, my birthdate is january fifteenth nineteen eighty five"
                  -> termsAccepted: "true", birthDate: "1985-01-15"

                {format_instructions}""",
        input_variables=["fields_json", "transcribed_text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    return prompt_template, parser
