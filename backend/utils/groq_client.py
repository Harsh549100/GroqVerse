import groq
import time
import os

class GroqClient:
    """Client for interacting with the Groq API."""
    
    def __init__(self, api_key=None):
        """
        Initialize the Groq client.
        
        Args:
            api_key (str): Groq API key. If None, will try to load from environment.
        """
        if api_key is None:
            api_key = os.getenv("GROQ_API_KEY")
            
        if not api_key:
            raise ValueError("Groq API key not provided")
            
        self.client = groq.Client(api_key=api_key)
        
        # Default model - use the most capable LLaMA model
        self.model = "llama3-70b-8192"
        
        # System prompts for different functionalities
        self.system_prompts = {
            "general": """You are a helpful, intelligent assistant with multilingual capabilities.
                       You can understand and respond in multiple languages.
                       You should provide accurate, concise, and helpful information.""",
            
            "image_analysis": """You are an AI assistant specialized in analyzing and describing images.
                              Provide detailed observations about the content of images.
                              Focus on key elements, people, objects, text, colors, and emotions."""
        }
    
    def generate_response(self, messages, language="en", system_type="general", temperature=0.7):
        """
        Generate a response using the Groq API.
        
        Args:
            messages (list): List of message dictionaries with 'role' and 'content'.
            language (str): Language code for the response.
            system_type (str): Type of system prompt to use.
            temperature (float): Temperature for response generation.
            
        Returns:
            str: Generated response text.
        """
        try:
            # Add system message
            system_message = self.system_prompts[system_type]
            
            # Add language instruction if not English
            if language != "en":
                system_message += f"\nPlease respond in {language}."
            
            # Prepare the full conversation with system message
            conversation = [{"role": "system", "content": system_message}]
            conversation.extend(messages)
            
            # Generate response
            start_time = time.time()
            response = self.client.chat.completions.create(
                model=self.model,
                messages=conversation,
                temperature=temperature,
                max_tokens=1024
            )
            end_time = time.time()
            
            # Log performance metrics
            print(f"Groq API response time: {round(end_time - start_time, 2)}s")
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"Error in Groq API call: {str(e)}")
            return f"I'm sorry, I encountered an error: {str(e)}"
    
    def change_model(self, model_name):
        """
        Change the model being used.
        
        Args:
            model_name (str): Name of the Groq model to use.
        """
        self.model = model_name
        print(f"Model changed to: {model_name}")