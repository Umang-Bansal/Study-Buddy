# Study Buddy Setup Guide

This document outlines the steps to set up and run the Study Buddy application.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository and navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Configuration

Create a `.env` file in the root directory with the following API keys:

### Required API Keys

#### Google Gemini API Key
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```
- Get from: https://makersuite.google.com/app/apikey
- Required for AI document analysis and voice processing

#### ElevenLabs API Key (Optional)
```
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```
- Get from: https://elevenlabs.io/api-keys
- Optional: Provides high-quality text-to-speech for AI responses
- If not provided, will fallback to browser's built-in speech synthesis

### Example .env file:
```
VITE_GEMINI_API_KEY=AIza...your_key_here
VITE_ELEVENLABS_API_KEY=sk_...your_key_here
```

## Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:5173`

## Features

### Voice-to-Voice Conversation
- **Hold SPACEBAR** to record your voice
- **Release SPACEBAR** to send audio to AI
- **Press ESC** to stop AI from speaking
- AI responds with both text (in chat) and voice

### Document Analysis
- Upload PDF, EPUB, TXT, or DOCX files
- AI analyzes with full document context
- Page-aware responses for PDFs
- Chapter-aware responses for structured documents

### Chat Interface
- Type questions or use voice input
- AI provides conversational responses
- Full conversation history
- Context-aware suggestions

## Troubleshooting

1. **Microphone not working**: Ensure browser permissions are granted
2. **No AI responses**: Check Gemini API key is valid
3. **No voice output**: Check ElevenLabs API key or browser audio permissions
4. **Document not loading**: Ensure file format is supported (PDF, EPUB, TXT, DOCX)

Your Study Buddy is ready to help you learn! 🎓 