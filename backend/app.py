from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import base64
from dotenv import load_dotenv
import time
from utils.groq_client import GroqClient
from utils.audio_processor import transcribe_audio
from utils.image_processor import process_image

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Groq client
groq_client = GroqClient(api_key=os.getenv("GROQ_API_KEY"))

# Store conversation history in memory (in production, use a database)
conversations = {}

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle text-based chat requests."""
    data = request.json
    user_input = data.get('message', '')
    session_id = data.get('sessionId', str(uuid.uuid4()))
    language = data.get('language', 'en')
    
    # Get or create conversation history
    if session_id not in conversations:
        conversations[session_id] = []
    
    # Add user message to history
    conversations[session_id].append({"role": "user", "content": user_input})
    
    # Get response from Groq
    start_time = time.time()
    response = groq_client.generate_response(
        conversations[session_id], 
        language=language
    )
    end_time = time.time()
    
    # Add assistant response to history
    conversations[session_id].append({"role": "assistant", "content": response})
    
    return jsonify({
        "response": response,
        "sessionId": session_id,
        "processingTime": round(end_time - start_time, 2)
    })

@app.route('/api/audio', methods=['POST'])
def process_audio():
    """Handle audio input, transcribe it, and get a response."""
    audio_file = request.files.get('audio')
    session_id = request.form.get('sessionId', str(uuid.uuid4()))
    language = request.form.get('language', 'en')
    
    if not audio_file:
        return jsonify({"error": "No audio file provided"}), 400
    
    # Save audio file temporarily
    temp_path = f"temp_{uuid.uuid4()}.webm"
    audio_file.save(temp_path)
    
    try:
        # Transcribe audio
        transcription = transcribe_audio(temp_path, language)
        
        # Get or create conversation history
        if session_id not in conversations:
            conversations[session_id] = []
        
        # Add transcribed message to history
        conversations[session_id].append({"role": "user", "content": transcription})
        
        # Get response from Groq
        start_time = time.time()
        response = groq_client.generate_response(
            conversations[session_id],
            language=language
        )
        end_time = time.time()
        
        # Add assistant response to history
        conversations[session_id].append({"role": "assistant", "content": response})
        
        return jsonify({
            "transcription": transcription,
            "response": response,
            "sessionId": session_id,
            "processingTime": round(end_time - start_time, 2)
        })
    
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route('/api/image', methods=['POST'])
def process_image_request():
    """Handle image input, analyze it, and get a response."""
    image_data = request.json.get('image', '')
    prompt = request.json.get('prompt', 'Describe this image')
    session_id = request.json.get('sessionId', str(uuid.uuid4()))
    language = request.json.get('language', 'en')
    
    # Decode base64 image
    if not image_data or not image_data.startswith('data:image'):
        return jsonify({"error": "Invalid image data"}), 400
    
    try:
        # Process the image
        image_description = process_image(image_data)
        
        # Combine prompt with image description
        combined_prompt = f"{prompt}\n\nImage content: {image_description}"
        
        # Get or create conversation history
        if session_id not in conversations:
            conversations[session_id] = []
        
        # Add image prompt to history
        conversations[session_id].append({"role": "user", "content": combined_prompt})
        
        # Get response from Groq
        start_time = time.time()
        response = groq_client.generate_response(
            conversations[session_id],
            language=language
        )
        end_time = time.time()
        
        # Add assistant response to history
        conversations[session_id].append({"role": "assistant", "content": response})
        
        return jsonify({
            "response": response,
            "sessionId": session_id,
            "processingTime": round(end_time - start_time, 2)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
    data = request.json
    session_id = data.get('sessionId')
    
    if session_id and session_id in conversations:
        conversations[session_id] = []
        return jsonify({"status": "Conversation cleared"})
    
    return jsonify({"error": "Session not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)