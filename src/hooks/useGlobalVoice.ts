import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceSettings } from '../types';
import { callElevenLabsTTS } from '../api/gemini';

// Global voice state
let globalVoiceState = {
  isSpeaking: false,
  currentUtterance: null as SpeechSynthesisUtterance | null,
  currentAudio: null as HTMLAudioElement | null,
  queue: [] as string[],
  isProcessingQueue: false
};

export function useGlobalVoice() {
  const [isSpeaking, setIsSpeaking] = useState(globalVoiceState.isSpeaking);
  const [isSupported] = useState(() => 'speechSynthesis' in window);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const [settings, setSettings] = useState<VoiceSettings>({
    enabled: true,
    voice: 'Alice', // Keep Alice as preference
    speed: 1.3, // Increased speed even more for faster speech
    pitch: 1.0,
    volume: 0.9, // Increased volume
    tone: 'encouraging'
  });

  // Check if ElevenLabs is available
  const hasElevenLabs = !!(import.meta as any).env?.VITE_ELEVENLABS_API_KEY;

  // Stop any currently playing speech
  const stopSpeaking = useCallback(() => {
    // Stop ElevenLabs audio
    if (globalVoiceState.currentAudio) {
      globalVoiceState.currentAudio.pause();
      globalVoiceState.currentAudio = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Stop browser speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      globalVoiceState.currentUtterance = null;
    }

    globalVoiceState.isSpeaking = false;
    globalVoiceState.queue = [];
    globalVoiceState.isProcessingQueue = false;
    setIsSpeaking(false);
    currentUtteranceRef.current = null;
  }, []);

  // Speak using ElevenLabs with faster speed
  const speakWithElevenLabs = useCallback(async (text: string): Promise<boolean> => {
    if (!hasElevenLabs) return false;

    try {
      console.log('Using ElevenLabs TTS with faster speed...');
      
      // Use Alice voice ID from ElevenLabs (or a similar high-quality female voice)
      const voiceId = 'Xb7hH8MSUJpSbSDYk0k2'; // Aria - high quality female voice
      
      const audioBuffer = await callElevenLabsTTS(text, {
        voiceId,
        modelId: 'eleven_turbo_v2_5', // Latest fastest model
        stability: 0.71,
        similarityBoost: 0.5
      });

      // Create audio element
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Apply speed and volume settings
      audio.playbackRate = settings.speed; // This applies the speed setting
      audio.volume = settings.volume;
      
      currentAudioRef.current = audio;
      globalVoiceState.currentAudio = audio;

      return new Promise((resolve) => {
        audio.onloadeddata = () => {
          globalVoiceState.isSpeaking = true;
          setIsSpeaking(true);
        };

        audio.onended = () => {
          globalVoiceState.isSpeaking = false;
          globalVoiceState.currentAudio = null;
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          resolve(true);
        };

        audio.onerror = () => {
          console.error('ElevenLabs audio playback failed');
          globalVoiceState.isSpeaking = false;
          globalVoiceState.currentAudio = null;
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          resolve(false);
        };

        audio.play().catch(() => {
          console.error('Failed to play ElevenLabs audio');
          resolve(false);
        });
      });
    } catch (error) {
      console.error('ElevenLabs TTS failed:', error);
      return false;
    }
  }, [hasElevenLabs, settings.speed, settings.volume]);

  // Fallback to browser speech synthesis
  const speakWithBrowser = useCallback((text: string): Promise<boolean> => {
    if (!isSupported) return Promise.resolve(false);

    return new Promise((resolve) => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.speed;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      // Try to find Alice voice or similar
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('alice') || 
        voice.name === settings.voice
      );
      
      // Fallback to other high-quality female voices
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('victoria') ||
          voice.name.toLowerCase().includes('zira') ||
          (voice.name.toLowerCase().includes('female') && voice.lang.startsWith('en'))
        );
      }
      
      // Final fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using browser voice:', selectedVoice.name);
      }

      utterance.onstart = () => {
        globalVoiceState.isSpeaking = true;
        globalVoiceState.currentUtterance = utterance;
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        globalVoiceState.isSpeaking = false;
        globalVoiceState.currentUtterance = null;
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        resolve(true);
      };

      utterance.onerror = () => {
        globalVoiceState.isSpeaking = false;
        globalVoiceState.currentUtterance = null;
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        resolve(false);
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, [isSupported, settings]);

  // Main speak function - tries ElevenLabs first, then browser fallback
  const speak = useCallback(async (text: string) => {
    if (!settings.enabled || !text.trim()) return;

    console.log('Speaking text:', text.substring(0, 50) + '...');
    console.log('ElevenLabs available:', hasElevenLabs);
    console.log('Speed setting:', settings.speed);

    // Stop any current speech first
    stopSpeaking();

    // Try ElevenLabs first
    if (hasElevenLabs) {
      const success = await speakWithElevenLabs(text);
      if (success) {
        console.log('Successfully used ElevenLabs TTS');
        return;
      }
      console.log('ElevenLabs failed, falling back to browser TTS');
    }

    // Fallback to browser speech synthesis
    await speakWithBrowser(text);
  }, [settings.enabled, hasElevenLabs, speakWithElevenLabs, speakWithBrowser, stopSpeaking]);

  // Speak multiple paragraphs continuously
  const speakContinuous = useCallback(async (paragraphs: string[]) => {
    if (!settings.enabled || paragraphs.length === 0) return;

    // Stop any current speech first
    stopSpeaking();

    globalVoiceState.queue = [...paragraphs];
    globalVoiceState.isProcessingQueue = true;

    const speakNext = async () => {
      if (globalVoiceState.queue.length === 0) {
        globalVoiceState.isProcessingQueue = false;
        return;
      }

      const text = globalVoiceState.queue.shift()!;
      
      // Try ElevenLabs first
      if (hasElevenLabs) {
        const success = await speakWithElevenLabs(text);
        if (success) {
          // Continue with next paragraph after a brief pause
          if (globalVoiceState.queue.length > 0 && globalVoiceState.isProcessingQueue) {
            setTimeout(speakNext, 500);
          } else {
            globalVoiceState.isProcessingQueue = false;
          }
          return;
        }
      }

      // Fallback to browser speech synthesis
      const success = await speakWithBrowser(text);
      if (success && globalVoiceState.queue.length > 0 && globalVoiceState.isProcessingQueue) {
        setTimeout(speakNext, 300);
      } else {
        globalVoiceState.isProcessingQueue = false;
      }
    };

    await speakNext();
  }, [settings.enabled, hasElevenLabs, speakWithElevenLabs, speakWithBrowser, stopSpeaking]);

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    console.log('Voice settings updated:', { ...settings, ...newSettings });
  }, [settings]);

  // Sync with global state on mount and when other instances change it
  useEffect(() => {
    const checkGlobalState = () => {
      if (globalVoiceState.isSpeaking !== isSpeaking) {
        setIsSpeaking(globalVoiceState.isSpeaking);
      }
    };

    const interval = setInterval(checkGlobalState, 100);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Load voices and set Alice as default when available
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Try to find Alice voice specifically
        const aliceVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('alice')
        );
        
        if (aliceVoice) {
          console.log('Alice voice found:', aliceVoice.name);
          setSettings(prev => ({ ...prev, voice: aliceVoice.name }));
        } else {
          // Fallback to other high-quality female voices
          const fallbackVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('samantha') ||
            voice.name.toLowerCase().includes('karen') ||
            voice.name.toLowerCase().includes('victoria') ||
            voice.name.toLowerCase().includes('zira') ||
            (voice.name.toLowerCase().includes('female') && voice.lang.startsWith('en'))
          );
          
          if (fallbackVoice) {
            console.log('Using fallback voice:', fallbackVoice.name);
            setSettings(prev => ({ ...prev, voice: fallbackVoice.name }));
          }
        }
      }
    };

    // Load voices immediately if available
    loadVoices();
    
    // Also listen for voices changed event
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  // Log current settings for debugging
  useEffect(() => {
    console.log('Current voice settings:', settings);
    console.log('ElevenLabs available:', hasElevenLabs);
  }, [settings, hasElevenLabs]);

  return {
    speak,
    speakContinuous,
    stop: stopSpeaking,
    isSpeaking,
    isContinuousReading: globalVoiceState.isProcessingQueue,
    settings,
    updateSettings,
    isSupported,
    hasElevenLabs
  };
}