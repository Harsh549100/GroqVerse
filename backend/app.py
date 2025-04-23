import sys
import os
sys.path.append(os.path.dirname(__file__))

from flask import Flask, request, jsonify, send_from_directory

from flask_cors import CORS
import os
import uuid
import base64
from dotenv import load_dotenv
import time
from utils.groq_client import GroqClient
from utils.audio_processor import transcribe_audio
from utils.image_processor import process_image
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Verify API key exists
if not os.getenv("GROQ_API_KEY"):
    raise ValueError("GROQ_API_KEY environment variable is not set")

# Initialize Groq client
try:
    groq_client = GroqClient(api_key=os.getenv("GROQ_API_KEY"))
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {str(e)}")
    raise

# Store conversation history
conversations = {}

def validate_session(session_id):
    """Validate and return session ID."""
    return session_id if session_id else str(uuid.uuid4())

@app.errorhandler(Exception)
def handle_error(error):
    """Global error handler"""
    logger.error(f"An error occurred: {str(error)}")
    return jsonify({
        "error": "An internal error occurred",
        "details": str(error)
    }), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle text-based chat requests."""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        user_input = data.get('message', '').strip()
        if not user_input:
            return jsonify({"error": "Message cannot be empty"}), 400

        session_id = validate_session(data.get('sessionId'))
        language = data.get('language', 'en')

        if session_id not in conversations:
            conversations[session_id] = []
        
        conversations[session_id].append({"role": "user", "content": user_input})
        
        start_time = time.time()
        try:
            response = groq_client.generate_response(
                conversations[session_id], 
                language=language
            )
        except Exception as e:
            logger.error(f"Groq API error: {str(e)}")
            return jsonify({"error": "Failed to generate response"}), 500

        end_time = time.time()
        
        conversations[session_id].append({"role": "assistant", "content": response})
        
        return jsonify({
            "response": response,
            "sessionId": session_id,
            "processingTime": round(end_time - start_time, 2)
        })

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/audio', methods=['POST'])
def process_audio():
    """Handle audio input, transcribe it, and get a response."""
    temp_path = None
    try:
        audio_file = request.files.get('audio')
        if not audio_file:
            return jsonify({"error": "No audio file provided"}), 400

        session_id = validate_session(request.form.get('sessionId'))
        language = request.form.get('language', 'en')
        
        temp_path = f"temp_{uuid.uuid4()}.webm"
        audio_file.save(temp_path)
        
        transcription = transcribe_audio(temp_path, language)
        if not transcription:
            return jsonify({"error": "Failed to transcribe audio"}), 500

        if session_id not in conversations:
            conversations[session_id] = []
        
        conversations[session_id].append({"role": "user", "content": transcription})
        
        start_time = time.time()
        response = groq_client.generate_response(
            conversations[session_id],
            language=language
        )
        end_time = time.time()
        
        conversations[session_id].append({"role": "assistant", "content": response})
        
        return jsonify({
            "transcription": transcription,
            "response": response,
            "sessionId": session_id,
            "processingTime": round(end_time - start_time, 2)
        })
    
    except Exception as e:
        logger.error(f"Audio processing error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.error(f"Failed to remove temporary file: {str(e)}")

@app.route('/api/image', methods=['POST'])
def process_image_request():
    """Handle image input, analyze it, and get a response."""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        image_data = data.get('image', '')
        prompt = data.get('prompt', 'Describe this image').strip()
        session_id = validate_session(data.get('sessionId'))
        language = data.get('language', 'en')
        
        # Validate image data
        if not image_data:
            return jsonify({"error": "Image data is required"}), 400
        if not isinstance(image_data, str):
            return jsonify({"error": "Image data must be a string"}), 400
        if not image_data.startswith('data:image'):
            return jsonify({"error": "Invalid image format. Must be base64 encoded data URL"}), 400
        
        # Process the image with error handling
        try:
            image_description = process_image(image_data)
            if not image_description:
                return jsonify({"error": "Failed to process image"}), 500
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            return jsonify({"error": "Failed to process image"}), 500

        # Initialize conversation if needed
        if session_id not in conversations:
            conversations[session_id] = []
        
        combined_prompt = f"{prompt}\n\nImage content: {image_description}"
        conversations[session_id].append({"role": "user", "content": combined_prompt})
        
        # Generate response with error handling
        start_time = time.time()
        try:
            response = groq_client.generate_response(
                conversations[session_id],
                language=language
            )
        except Exception as e:
            logger.error(f"Groq API error: {str(e)}")
            return jsonify({"error": "Failed to generate response"}), 500

        end_time = time.time()
        
        conversations[session_id].append({"role": "assistant", "content": response})
        
        return jsonify({
            "response": response,
            "sessionId": session_id,
            "processingTime": round(end_time - start_time, 2)
        })
    
    except Exception as e:
        logger.error(f"Image request error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route('/api/languages', methods=['GET'])
def get_languages():
    """Return list of supported languages."""
    languages = [
        {"code": "en", "name": "English"},
        {"code": "es", "name": "Spanish"},
        {"code": "fr", "name": "French"},
        {"code": "de", "name": "German"},
        {"code": "it", "name": "Italian"},
        {"code": "pt", "name": "Portuguese"},
        {"code": "zh", "name": "Chinese"},
        {"code": "ja", "name": "Japanese"},
        {"code": "ko", "name": "Korean"},
        {"code": "ru", "name": "Russian"},
        {"code": "ar", "name": "Arabic"},
        {"code": "hi", "name": "Hindi"}
    ]
    return jsonify(languages)

@app.route('/api/clear', methods=['POST'])
def clear_conversation():
    """Clear conversation history for a session."""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        session_id = data.get('sessionId')
        if not session_id:
            return jsonify({"error": "Session ID is required"}), 400
        
        if session_id in conversations:
            conversations[session_id] = []
            return jsonify({
                "status": "success",
                "message": "Conversation cleared successfully"
            })
        
        return jsonify({
            "status": "error",
            "message": "Session not found"
        }), 404
        
    except Exception as e:
        logger.error(f"Clear conversation error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Failed to clear conversation"
        }), 500

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "GroqVerse backend is running!"})

# Serve frontend HTML
@app.route('/')
def serve_index():
    return send_from_directory('frontend', 'index.html')

# Serve static files (CSS, JS)
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('frontend', path)


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=False, host='0.0.0.0', port=port)

