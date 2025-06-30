# 🎤📚 Voice-to-Voice Study Buddy

> Transform any document into a natural conversation. Upload, read, and learn through hands-free voice interactions with AI.

## ✨ Features

### 🗣️ **Voice-First Learning**
- **Hands-free operation**: Press `SPACEBAR` anywhere to start talking
- **Natural conversations**: Ask questions and hear AI responses
- **Global voice control**: Unified voice system prevents audio conflicts
- **ElevenLabs TTS**: Professional, natural-sounding speech synthesis

### 📖 **Smart Document Reading**
- **Multiple formats**: PDF, DOCX, TXT, EPUB support
- **Context awareness**: AI understands full document + current page + selections
- **Clean interface**: Distraction-free reading with translucent AI sidebar
- **Interactive text**: Select passages for focused discussions

### 🧠 **Intelligent AI Assistant**
- **Google Gemini 2.5 Flash**: Fast, high-context responses
- **Memory retention**: Remembers conversation history
- **Short responses**: Optimized 1-2 sentence answers for voice
- **Contextual precision**: Answers change based on what you're viewing

## 🚀 Quick Start

1. **Clone and install**:
   ```bash
   git clone https://github.com/yourusername/voice-study-buddy.git
   cd voice-study-buddy
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   # Create .env file
   VITE_GOOGLE_AI_API_KEY=your_gemini_api_key
   VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ```

3. **Run the app**:
   ```bash
   npm run dev
   ```

4. **Start learning**:
   - Upload any document (PDF, Word, etc.)
   - Press `SPACEBAR` and ask: "What's this about?"
   - Listen to the AI explain and ask follow-ups naturally

## 🎯 Use Cases

- **Students**: Turn textbooks into interactive study sessions
- **Researchers**: Discuss papers hands-free while taking notes
- **Professionals**: Review documents while multitasking
- **Accessibility**: Screen reader alternative with natural voices
- **Language learners**: Practice listening while reading

## 🛠️ Built With

- **React 18** + **TypeScript** + **Vite** - Modern frontend stack
- **Tailwind CSS** - Utility-first styling
- **Google Gemini 2.5 Flash** - AI conversation engine
- **ElevenLabs** - Natural voice synthesis
- **Web Speech API** - Browser-based speech recognition
- **react-pdf** - PDF rendering and processing

## 🎮 Controls

| Action | Shortcut | Description |
|--------|----------|-------------|
| Start voice input | `SPACEBAR` | Begin speaking (when not in text fields) |
| Voice conversation | `Ctrl+Shift+V` | Alternative voice trigger |
| Stop speaking | Click voice button | Interrupt AI speech |

## 🏗️ Architecture

- **Voice Management**: Global `useGlobalVoice` hook ensures single audio instance
- **Document Processing**: Multi-format parser with full-text extraction
- **Context Building**: Combines document + viewport + selection + chat history
- **Responsive Design**: Translucent sidebar preserves reading focus

## 📱 Demo

Perfect for:
- 📚 Academic research and studying
- 📄 Professional document review
- 🎧 Accessibility and hands-free learning
- 🗣️ Language practice and pronunciation
- 🔄 Multitasking while learning

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Voice-to-Voice Study Buddy** - Because learning should sound as natural as curiosity itself. 🎤📚🤖 