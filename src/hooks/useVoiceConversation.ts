import { useState, useCallback, useRef, useEffect } from 'react';
import { Document } from '../types';
import { callGemini, callElevenLabsTTS } from '../api/gemini';

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceConversationState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  currentTranscript: string;
}

export function useVoiceConversation(onMessage: (message: string) => void) {
  const [state, setState] = useState<VoiceConversationState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    currentTranscript: ''
  });

  const recognitionRef = useRef<any>(null);
  const documentRef = useRef<Document | null>(null);
  const currentPageRef = useRef<number>(1);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const initializeDocument = useCallback((document: Document) => {
    documentRef.current = document;
  }, []);

  const updateCurrentPage = useCallback((page: number) => {
    currentPageRef.current = page;
  }, []);

  const buildContext = useCallback(() => {
    const document = documentRef.current;
    if (!document) return '';

    const currentPage = currentPageRef.current;
    
    // Find the relevant chapter for current page
    const currentChapter = document.chapters.find(chapter => 
      chapter.pageStart && chapter.pageEnd && 
      currentPage >= chapter.pageStart && currentPage <= chapter.pageEnd
    );
    
    const chapterContext = currentChapter 
      ? `Current Chapter: ${currentChapter.title}\nChapter Content: ${document.content.substring(currentChapter.startPosition, currentChapter.endPosition)}`
      : `Current Page: ${currentPage}`;
    
    return `Document: "${document.title}"
${chapterContext}

Full Document Context: ${document.content}

You are a conversational study buddy. Please respond in 1-2 sentences maximum. Be helpful, engaging, and reference the document content when relevant.`;
  }, []);

  const speakWithElevenLabs = useCallback(async (text: string): Promise<void> => {
    try {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const audioBuffer = await callElevenLabsTTS(text);
      
      // Create audio element and play
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        console.error('Error playing ElevenLabs audio, falling back to browser TTS');
        setState(prev => ({ ...prev, isSpeaking: false }));
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        
        // Fallback to browser speech synthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.onend = () => {
            setState(prev => ({ ...prev, isSpeaking: false }));
          };
          speechSynthesis.speak(utterance);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      setState(prev => ({ ...prev, isSpeaking: false }));
      
      // Fallback to browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
          setState(prev => ({ ...prev, isSpeaking: false }));
        };
        speechSynthesis.speak(utterance);
      }
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, currentTranscript: '' }));
    };
    
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      
      setState(prev => ({ ...prev, currentTranscript: transcript }));
      
      // If final result, process the speech
      if (event.results[event.results.length - 1].isFinal) {
        processVoiceInput(transcript.trim());
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setState(prev => ({ 
        ...prev, 
        isListening: false, 
        isProcessing: false,
        currentTranscript: 'Speech recognition error. Please try again.'
      }));
      setTimeout(() => {
        setState(prev => ({ ...prev, currentTranscript: '' }));
      }, 3000);
    };
    
    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      recognition.stop();
    };
  }, [isSupported]);

  // Process voice input and send to AI
  const processVoiceInput = useCallback(async (transcript: string) => {
    if (!transcript || !documentRef.current) return;
    
    setState(prev => ({ 
      ...prev, 
      isProcessing: true,
      isListening: false,
      currentTranscript: 'Processing your message...'
    }));

    try {
      // Send the user's voice query to the AI system for processing
      await onMessage(transcript);
      
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        currentTranscript: ''
      }));

    } catch (error) {
      console.error('Voice processing error:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        currentTranscript: 'Error processing your message. Please try again.',
        isSpeaking: false
      }));
      
      setTimeout(() => {
        setState(prev => ({ ...prev, currentTranscript: '' }));
      }, 3000);
    }
  }, [onMessage]);

     const startListening = useCallback(() => {
     if (!isSupported || !recognitionRef.current || !documentRef.current) return;
     
     // Stop any current speech
     if (currentAudioRef.current) {
       currentAudioRef.current.pause();
       currentAudioRef.current = null;
     }
     if ('speechSynthesis' in window) {
       speechSynthesis.cancel();
     }
     setState(prev => ({ ...prev, isSpeaking: false }));
     
     try {
       recognitionRef.current.start();
     } catch (error) {
       console.error('Failed to start speech recognition:', error);
     }
   }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setState(prev => ({ ...prev, isListening: false, currentTranscript: '' }));
  }, []);

  const stopSpeaking = useCallback(() => {
    // Stop ElevenLabs audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Spacebar to start recording (push-to-talk style)
      if (event.ctrlKey && event.code === 'Space' && !event.repeat) {
        // Prevent spacebar if focused on input, textarea, or contenteditable
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }
        
        event.preventDefault();
        if (!state.isListening) {
          startListening();
        }
      }
      
      // Ctrl+Shift+V alternative
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        toggleListening();
      }
      
      // Escape to stop speaking
      if (event.key === 'Escape' && state.isSpeaking) {
        event.preventDefault();
        stopSpeaking();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Stop recording when Ctrl+spacebar is released (push-to-talk style)
      if (event.ctrlKey && event.code === 'Space' && state.isListening) {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }
        
        event.preventDefault();
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startListening, stopListening, stopSpeaking, state.isListening, state.isSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    stopSpeaking,
    toggleListening,
    initializeDocument,
    updateCurrentPage
  };
} 