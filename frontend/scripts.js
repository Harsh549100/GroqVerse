// Global variables
let sessionId = null;
let selectedLanguage = 'en';
let responseTimes = [];
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let imageBase64 = null;
let darkMode = localStorage.getItem('darkMode') === 'true';
// Initialize dark mode state
if (darkMode) {
    document.body.classList.add('dark-mode');
}

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const voiceButton = document.getElementById('voice-btn');
const imageButton = document.getElementById('image-btn');
const imageUpload = document.getElementById('image-upload');
const clearButton = document.getElementById('clear-btn');
const languageSelect = document.getElementById('language-select');
const recordingIndicator = document.getElementById('recording-indicator');
const recordingTime = document.getElementById('recording-time');
const stopRecordingButton = document.getElementById('stop-recording-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const imagePreviewModal = document.getElementById('image-preview-modal');
const imagePreview = document.getElementById('image-preview');
const imagePrompt = document.getElementById('image-prompt');
const imageSubmitButton = document.getElementById('image-submit-btn');
const closeModal = document.querySelector('.close-modal');
const avgResponseTime = document.getElementById('avg-response-time');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const body = document.body;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Generate a session ID
    sessionId = generateSessionId();
    
    // Load supported languages
    loadLanguages();
    
    // Event listeners
    setupEventListeners();
    
    // Resize textarea as needed
    setupTextareaAutoResize();
    
    // Initialize UI enhancements
    initUIEnhancements();
    
    // Apply dark mode if enabled
    if (darkMode) {
        body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true;
    }
    
    // Add typewriter effect to welcome message
    const welcomeMessage = document.querySelector('.welcome-message p');
    if (welcomeMessage) {
        const text = welcomeMessage.textContent;
        welcomeMessage.textContent = '';
        typewriterEffect(welcomeMessage, text, 50);
    }
});

// Setup event listeners
function setupEventListeners() {
    // Existing event listeners
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    voiceButton.addEventListener('click', startVoiceRecording);
    
    stopRecordingButton.addEventListener('click', stopVoiceRecording);
    
    imageButton.addEventListener('click', () => {
        imageUpload.click();
    });
    
    imageUpload.addEventListener('change', handleImageUpload);
    
    clearButton.addEventListener('click', clearChat);
    
    languageSelect.addEventListener('change', (e) => {
        selectedLanguage = e.target.value;
    });
    
    closeModal.addEventListener('click', () => {
        imagePreviewModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === imagePreviewModal) {
            imagePreviewModal.style.display = 'none';
        }
    });
    
    imageSubmitButton.addEventListener('click', submitImagePrompt);
    
    // New event listeners for UI enhancements
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', toggleDarkMode);
    }
    
    // Add parallax effect to background elements
    window.addEventListener('scroll', handleParallaxEffect);
    
    // Add 3D hover effects to buttons
    const buttons = document.querySelectorAll('button:not(.close-modal)');
    buttons.forEach(button => {
        button.addEventListener('mousemove', handle3DHoverEffect);
        button.addEventListener('mouseleave', reset3DHoverEffect);
    });
}

// Initialize UI enhancements
function initUIEnhancements() {
    // Add glassmorphism effect to chat container and controls
    addGlassmorphismEffect();
    
    // Create dark mode toggle if it doesn't exist
    if (!darkModeToggle) {
        createDarkModeToggle();
    }
    
    // Add animation classes to elements
    document.querySelectorAll('.message').forEach(message => {
        message.classList.add('animate-in');
    });
    
    // Add parallax elements to background
    addParallaxElements();
}

// Voice recording functions
function startVoiceRecording() {
    // Check if browser supports Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // Create speech recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Configure recognition
        recognition.lang = selectedLanguage;
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Show recording indicator with animation
        recordingIndicator.style.display = 'flex';
        recordingIndicator.classList.add('pulse-animation');
        
        // Start timer
        recordingSeconds = 0;
        recordingTimer = setInterval(() => {
            recordingSeconds++;
            recordingTime.textContent = `${recordingSeconds}s`;
            
            // Auto-stop after 60 seconds
            if (recordingSeconds >= 60) {
                recognition.stop();
            }
        }, 1000);
        
        // Start recognition
        recognition.start();
        
        // Handle results
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            
            // Auto-resize the textarea
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
            
            // Add subtle highlight animation to the input
            userInput.classList.add('highlight-animation');
            setTimeout(() => {
                userInput.classList.remove('highlight-animation');
            }, 1000);
        };
        
        // Handle end of speech recognition
        recognition.onend = function() {
            // Hide recording indicator
            recordingIndicator.style.display = 'none';
            recordingIndicator.classList.remove('pulse-animation');
            clearInterval(recordingTimer);
        };
        
        // Handle errors
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            recordingIndicator.style.display = 'none';
            recordingIndicator.classList.remove('pulse-animation');
            clearInterval(recordingTimer);
            showNotification('Speech recognition error: ' + event.error, 'error');
        };
        
        // Set stop recording button to stop recognition
        stopRecordingButton.onclick = function() {
            recognition.stop();
        };
    } else {
        showNotification('Your browser does not support speech recognition. Try using Chrome or Edge.', 'error');
    }
}

// Add message to chat with enhanced animations
function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    
    // Add entrance animation class
    messageDiv.classList.add('message-animate-in');
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    // Process content for code blocks and links
    const formattedContent = formatMessageContent(content);
    messageContent.innerHTML = formattedContent;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageMeta = document.createElement('div');
    messageMeta.classList.add('message-meta');
    messageMeta.textContent = timestamp;
    
    messageDiv.appendChild(messageContent);
    messageContent.appendChild(messageMeta);
    
    chatContainer.appendChild(messageDiv);
    
    // Apply 3D tilt effect on hover for messages
    messageDiv.addEventListener('mousemove', handleMessageTiltEffect);
    messageDiv.addEventListener('mouseleave', resetMessageTiltEffect);
    
    // Scroll to bottom with smooth animation
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
    
    // Highlight syntax for code blocks
    if (window.Prism) {
        Prism.highlightAllUnder(messageContent);
    }
}

// UI Enhancement Functions
function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', darkMode);
    
    // Add transition animation
    document.body.classList.add('theme-transition');
    setTimeout(() => {
        document.body.classList.remove('theme-transition');
    }, 1000);
    
    // Update toggle button state
    if (darkModeToggle) {
        darkModeToggle.checked = darkMode;
    }
}

function createDarkModeToggle() {
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'dark-mode-container';
    toggleContainer.innerHTML = `
        <label class="switch">
            <input type="checkbox" id="dark-mode-toggle" ${darkMode ? 'checked' : ''}>
            <span class="slider round"></span>
            <div class="toggle-icons">
                <span class="sun-icon">☀️</span>
                <span class="moon-icon">🌙</span>
            </div>
        </label>
    `;
    
    // Insert at the top of the page
    const header = document.querySelector('header') || document.body.firstChild;
    document.body.insertBefore(toggleContainer, header);
    
    // Update the reference
    darkModeToggle = document.getElementById('dark-mode-toggle');
    darkModeToggle.addEventListener('change', toggleDarkMode);
}

function addGlassmorphismEffect() {
    // Add glassmorphism class to elements
    const glassElements = [
        chatContainer,
        document.querySelector('.controls'),
        document.querySelector('.welcome-message'),
        imagePreviewModal
    ];
    
    glassElements.forEach(element => {
        if (element) element.classList.add('glassmorphism');
    });
}

function addParallaxElements() {
    // Create parallax background elements
    const parallaxContainer = document.createElement('div');
    parallaxContainer.className = 'parallax-background';
    
    // Add floating shapes
    for (let i = 0; i < 15; i++) {
        const shape = document.createElement('div');
        shape.className = 'parallax-shape';
        shape.style.left = `${Math.random() * 100}%`;
        shape.style.top = `${Math.random() * 100}%`;
        shape.style.animationDelay = `${Math.random() * 5}s`;
        shape.style.width = `${20 + Math.random() * 30}px`;
        shape.style.height = shape.style.width;
        
        // Randomly assign different shapes
        const shapeType = Math.floor(Math.random() * 3);
        if (shapeType === 0) {
            shape.style.borderRadius = '50%'; // Circle
        } else if (shapeType === 1) {
            shape.style.borderRadius = '0'; // Square
        } else {
            shape.style.borderRadius = '50% 0 50% 0'; // Custom shape
        }
        
        parallaxContainer.appendChild(shape);
    }
    
    // Insert at the beginning of body
    document.body.insertBefore(parallaxContainer, document.body.firstChild);
}

function handleParallaxEffect() {
    const scrollPosition = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.parallax-shape');
    
    parallaxElements.forEach((element, index) => {
        const speed = 0.05 + (index % 5) * 0.01;
        element.style.transform = `translateY(${scrollPosition * speed}px)`;
    });
}

function handle3DHoverEffect(e) {
    const button = e.currentTarget;
    const buttonRect = button.getBoundingClientRect();
    const x = e.clientX - buttonRect.left;
    const y = e.clientY - buttonRect.top;
    
    const centerX = buttonRect.width / 2;
    const centerY = buttonRect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    button.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    button.style.boxShadow = `0 5px 15px rgba(0,0,0,0.3)`;
}

function reset3DHoverEffect(e) {
    const button = e.currentTarget;
    button.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    button.style.boxShadow = '';
}

function handleMessageTiltEffect(e) {
    if (window.innerWidth < 768) return; // Skip on mobile
    
    const message = e.currentTarget;
    const messageRect = message.getBoundingClientRect();
    const x = e.clientX - messageRect.left;
    const y = e.clientY - messageRect.top;
    
    const centerX = messageRect.width / 2;
    const centerY = messageRect.height / 2;
    
    const rotateX = (y - centerY) / 30;
    const rotateY = (centerX - x) / 30;
    
    message.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function resetMessageTiltEffect(e) {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
}

function typewriterEffect(element, text, speed) {
    let i = 0;
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);
}

// Load supported languages
async function loadLanguages() {
    try {
        const response = await fetch('http://localhost:5000/api/languages');
        const languages = await response.json();
        
        // Populate language selector
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            languageSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading languages:', error);
    }
}

// Auto-resize textarea
function setupTextareaAutoResize() {
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

// Generate a session ID
function generateSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Send message to backend
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Show loading
    showLoading('Processing your message...');
    
    try {
        // Show typing indicator
        showTypingIndicator();
        
        // Send to backend
        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                sessionId: sessionId,
                language: selectedLanguage
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Update session ID if needed
        if (data.sessionId) {
            sessionId = data.sessionId;
        }
        
        // Add AI response to chat
        addMessageToChat('ai', data.response);
        
        // Update response time
        updateResponseTime(data.processingTime);
    } catch (error) {
        removeTypingIndicator();
        addMessageToChat('ai', `Sorry, I encountered an error: ${error.message}`);
        console.error('Error sending message:', error);
    } finally {
        hideLoading();
    }
}

// Add message to chat
function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    // Process content for code blocks and links
    const formattedContent = formatMessageContent(content);
    messageContent.innerHTML = formattedContent;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageMeta = document.createElement('div');
    messageMeta.classList.add('message-meta');
    messageMeta.textContent = timestamp;
    
    messageDiv.appendChild(messageContent);
    messageContent.appendChild(messageMeta);
    
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Format message content (parse code blocks, links, etc.)
function formatMessageContent(content) {
    // Handle code blocks (```code```)
    content = content.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, language, code) => {
        const lang = language || '';
        return `<pre><code class="language-${lang}">${code}</code></pre>`;
    });
    
    // Handle inline code (`code`)
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle links
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // Handle line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.id = 'typing-indicator';
    
    // Add three dots
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.classList.add('typing-dot');
        typingDiv.appendChild(dot);
    }
    
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Voice recording functions
function startVoiceRecording() {
    // Check if browser supports Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // Create speech recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Configure recognition
        recognition.lang = selectedLanguage;
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Show recording indicator
        recordingIndicator.style.display = 'flex';
        
        // Start timer
        recordingSeconds = 0;
        recordingTimer = setInterval(() => {
            recordingSeconds++;
            recordingTime.textContent = `${recordingSeconds}s`;
            
            // Auto-stop after 60 seconds
            if (recordingSeconds >= 60) {
                recognition.stop();
            }
        }, 1000);
        
        // Start recognition
        recognition.start();
        
        // Handle results
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            
            // Auto-resize the textarea
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
        };
        
        // Handle end of speech recognition
        recognition.onend = function() {
            // Hide recording indicator
            recordingIndicator.style.display = 'none';
            clearInterval(recordingTimer);
        };
        
        // Handle errors
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            recordingIndicator.style.display = 'none';
            clearInterval(recordingTimer);
            alert('Speech recognition error: ' + event.error);
        };
        
        // Set stop recording button to stop recognition
        stopRecordingButton.onclick = function() {
            recognition.stop();
        };
    } else {
        alert('Your browser does not support speech recognition. Try using Chrome or Edge.');
    }
}

function stopVoiceRecording() {
    // This function is now handled within the startVoiceRecording function
    // The onclick handler for stopRecordingButton is set there
    clearInterval(recordingTimer);
    recordingIndicator.style.display = 'none';
}

function processVoiceRecording() {
    // Hide recording indicator
    recordingIndicator.style.display = 'none';
    
    // Create blob from audio chunks
    // Use the MIME type that matches what the MediaRecorder is actually producing
    const mimeType = mediaRecorder.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    
    // Show loading overlay
    showLoading('Processing your voice recording...');
    
    // Show typing indicator
    showTypingIndicator();
    
    // Create form data
    const formData = new FormData();
    // Use the correct file extension based on the MIME type
    const fileExtension = mimeType.includes('webm') ? 'webm' : 
                          mimeType.includes('mp4') ? 'mp4' : 
                          mimeType.includes('ogg') ? 'ogg' : 'wav';
    
    formData.append('audio', audioBlob, `recording.${fileExtension}`);
    formData.append('sessionId', sessionId);
    formData.append('language', selectedLanguage);
    
    // Log the file being sent for debugging
    console.log(`Sending audio file as ${mimeType} with extension .${fileExtension}`);
    
    // Send to backend
    fetch('http://localhost:5000/api/audio', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add transcription to chat
        if (data.transcription) {
            addMessageToChat('user', data.transcription);
        }
        
        // Add AI response to chat
        if (data.response) {
            addMessageToChat('ai', data.response);
        }
        
        // Update session ID if needed
        if (data.sessionId) {
            sessionId = data.sessionId;
        }
        
        // Update response time
        if (data.processingTime) {
            updateResponseTime(data.processingTime);
        }
    })
    .catch(error => {
        removeTypingIndicator();
        console.error('Error processing voice recording:', error);
        addMessageToChat('ai', `Sorry, I encountered an error processing your voice recording: ${error.message}`);
    })
    .finally(() => {
        hideLoading();
    });
}

// Image handling functions
function handleImageUpload(e) {
    const file = e.target.files[0];
    
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            // Store base64 image
            imageBase64 = event.target.result;
            
            // Show image preview modal
            imagePreview.src = imageBase64;
            imagePreviewModal.style.display = 'block';
            
            // Set default prompt
            imagePrompt.value = 'What can you tell me about this image?';
        };
        
        reader.readAsDataURL(file);
    }
    
    // Reset file input
    e.target.value = '';
}

function submitImagePrompt() {
    // Get prompt
    const prompt = imagePrompt.value.trim() || 'What can you tell me about this image?';
    
    // Hide modal
    imagePreviewModal.style.display = 'none';
    
    // Add user message with image
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'user-message');
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    messageContent.innerHTML = `
        ${prompt}
        <br><br>
        <img src="${imageBase64}" alt="Uploaded image" class="message-image">
    `;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageMeta = document.createElement('div');
    messageMeta.classList.add('message-meta');
    messageMeta.textContent = timestamp;
    
    messageDiv.appendChild(messageContent);
    messageContent.appendChild(messageMeta);
    
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Show loading
    showLoading('Analyzing image...');
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send to backend
    fetch('http://localhost:5000/api/image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            image: imageBase64,
            prompt: prompt,
            sessionId: sessionId,
            language: selectedLanguage
        })
    })
    .then(response => response.json())
    .then(data => {
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add AI response to chat
        if (data.response) {
            addMessageToChat('ai', data.response);
        }
        
        // Update session ID if needed
        if (data.sessionId) {
            sessionId = data.sessionId;
        }
        
        // Update response time
        if (data.processingTime) {
            updateResponseTime(data.processingTime);
        }
    })
    .catch(error => {
        removeTypingIndicator();
        console.error('Error processing image:', error);
        addMessageToChat('ai', `Sorry, I encountered an error processing your image: ${error.message}`);
    })
    .finally(() => {
        hideLoading();
    });
}

// Clear chat
function clearChat() {
    // Remove all messages except welcome message
    while (chatContainer.firstChild) {
        chatContainer.removeChild(chatContainer.firstChild);
    }
    
    // Add welcome message back
    const welcomeDiv = document.createElement('div');
    welcomeDiv.classList.add('welcome-message');
    welcomeDiv.innerHTML = `
        <h2>Welcome to the Groq AI Assistant!</h2>
        <p>Ask me anything or try uploading an image or recording your voice.</p>
    `;
    chatContainer.appendChild(welcomeDiv);
    
    // Reset session on the server
    fetch('http://localhost:5000/api/clear', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId: sessionId
        })
    })
    .catch(error => {
        console.error('Error clearing conversation:', error);
    });
    
    // Reset response times
    responseTimes = [];
    updateResponseTime(0);
}

// Loading overlay functions
function showLoading(message = 'Processing...') {
    loadingText.textContent = message;
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Update average response time
function updateResponseTime(time) {
    if (time > 0) {
        responseTimes.push(time);
        
        // Calculate average
        const sum = responseTimes.reduce((a, b) => a + b, 0);
        const avg = sum / responseTimes.length;
        
        // Update display
        avgResponseTime.textContent = `${avg.toFixed(2)}s`;
    }
}