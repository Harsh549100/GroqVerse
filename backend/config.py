import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration settings for the application."""
    
    # API keys
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    
    # Allowed file extensions
    ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg', 'webm'}
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # File size limits (in bytes)
    MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_IMAGE_SIZE = 5 * 1024 * 1024   # 5MB
    
    # Rate limiting
    REQUEST_RATE_LIMIT = 20  # requests per minute
    
    # Model configurations
    DEFAULT_MODEL = "llama3-70b-8192"
    AVAILABLE_MODELS = [
        "llama3-70b-8192",
        "llama3-8b-8192",
        "gemma-7b-it"
    ]
    
    # Response configurations
    MAX_TOKENS = 1024
    DEFAULT_TEMPERATURE = 0.7
    
    # Temporary file storage
    TEMP_FOLDER = "temp"
    
    @classmethod
    def validate_config(cls):
        """Validate that all required configuration variables are set."""
        if not cls.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set. Please set it in your .env file.")
        
        # Create temp folder if it doesn't exist
        if not os.path.exists(cls.TEMP_FOLDER):
            os.makedirs(cls.TEMP_FOLDER)
            
        return True