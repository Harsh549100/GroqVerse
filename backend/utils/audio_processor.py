import os
import speech_recognition as sr
from pydub import AudioSegment
import tempfile
import uuid

def transcribe_audio(audio_path, language="en-US"):
    """
    Transcribe audio file to text using speech recognition.
    
    Args:
        audio_path (str): Path to the audio file
        language (str): Language code for transcription
    
    Returns:
        str: Transcribed text
    """
    # Map language codes to speech recognition language codes
    language_map = {
        "en": "en-US",
        "es": "es-ES",
        "fr": "fr-FR",
        "de": "de-DE",
        "it": "it-IT",
        "pt": "pt-BR",
        "zh": "zh-CN",
        "ja": "ja-JP",
        "ko": "ko-KR",
        "ru": "ru-RU",
        "ar": "ar-SA",
        "hi": "hi-IN"
    }
    
    # Get speech recognition language code
    sr_language = language_map.get(language, "en-US")
    
    # Convert audio to wav format if needed
    if not audio_path.endswith('.wav'):
        temp_wav = f"temp_{uuid.uuid4()}.wav"
        
        # Determine file format from extension
        file_format = audio_path.split('.')[-1]
        
        # Convert to wav using pydub
        try:
            audio = AudioSegment.from_file(audio_path, format=file_format)
            audio.export(temp_wav, format="wav")
        except Exception as e:
            print(f"Error converting audio: {str(e)}")
            return f"Error transcribing audio: {str(e)}"
        
        # Use the converted wav file
        audio_path = temp_wav
    
    try:
        # Initialize recognizer
        recognizer = sr.Recognizer()
        
        # Load audio file
        with sr.AudioFile(audio_path) as source:
            # Record audio data
            audio_data = recognizer.record(source)
            
            # Use Google's speech recognition
            transcription = recognizer.recognize_google(audio_data, language=sr_language)
            
            return transcription
    
    except sr.UnknownValueError:
        return "Sorry, I couldn't understand the audio."
    except sr.RequestError as e:
        return f"Speech recognition service error: {str(e)}"
    except Exception as e:
        return f"Error transcribing audio: {str(e)}"
    finally:
        # Clean up temporary file if it exists
        if 'temp_wav' in locals() and os.path.exists(temp_wav):
            os.remove(temp_wav)