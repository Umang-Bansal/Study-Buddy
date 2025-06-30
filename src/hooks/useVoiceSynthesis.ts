import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceSettings } from '../types';

export function useVoiceSynthesis() {
  const [isSupported, setIsSupported] = useState(typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isContinuousReading, setIsContinuousReading] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<VoiceSettings>({
    enabled: false,
    voice: '',
    speed: 1.0,
    pitch: 1.0,
    volume: 0.8,
    tone: 'academic'
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const continuousQueueRef = useRef<string[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const onContinueRef = useRef<(() => void) | null>(null);

  // Load available voices
  const loadVoices = useCallback(() => {
    if (!isSupported) return;
    
    const availableVoices = speechSynthesis.getVoices();
    setVoices(availableVoices);
    
    // Set default voice if none selected
    if (!settings.voice && availableVoices.length > 0) {
      const englishVoice = availableVoices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('en')) || availableVoices[0];
      setSettings((prev: VoiceSettings) => ({ ...prev, voice: englishVoice.name }));
    }
  }, [isSupported, settings.voice]);

  // Initialize voices when component mounts
  useEffect(() => {
    if (isSupported) {
      loadVoices();
      speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }
  }, [isSupported, loadVoices]);

  const speak = useCallback(async (text: string, options?: Partial<VoiceSettings>) => {
    if (!settings.enabled) return;

    const finalSettings = { ...settings, ...options };
    const processedText = processTextForSpeech(text, finalSettings.tone);

    const elevenApiKey = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY as string | undefined;

    // Try ElevenLabs first if API key exists
    if (elevenApiKey) {
      try {
        setIsSpeaking(true);
        // Using Aria - one of the best ElevenLabs voices with the latest model
        const voiceId = '9BWtsMINqrJLrRacOk9x'; // Aria voice ID
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenApiKey
          },
          body: JSON.stringify({
            text: processedText,
            model_id: 'eleven_turbo_v2_5', // Latest and fastest model
            voice_settings: {
              stability: 0.71,
              similarity_boost: 0.5,
              style: 0.0,
              use_speaker_boost: true
            },
            output_format: 'mp3_44100_128'
          })
        });

        if (!res.ok) throw new Error('ElevenLabs error');

        const audioData = await res.arrayBuffer();
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = finalSettings.volume;
        
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          
          // Continue with next item if in continuous mode
          if (isContinuousReading && continuousQueueRef.current.length > 0) {
            const nextText = continuousQueueRef.current.shift();
            if (nextText) {
              setTimeout(() => speak(nextText, options), 500); // Small pause between paragraphs
            } else {
              setIsContinuousReading(false);
            }
          } else if (onContinueRef.current) {
            onContinueRef.current();
            onContinueRef.current = null;
          }
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
          if (isContinuousReading) {
            setIsContinuousReading(false);
            continuousQueueRef.current = [];
          }
        };
        
        audio.play();
        return;
      } catch (e) {
        console.error('ElevenLabs TTS failed, falling back to browser TTS', e);
        setIsSpeaking(false);
        currentAudioRef.current = null;
      }
    }

    // Browser fallback with continuous support
    if (!isSupported) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(processedText);
    const selectedVoice = voices.find((v: SpeechSynthesisVoice) => v.name === finalSettings.voice);
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.rate = finalSettings.speed;
    utterance.pitch = finalSettings.pitch;
    utterance.volume = finalSettings.volume;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      
      // Continue with next item if in continuous mode
      if (isContinuousReading && continuousQueueRef.current.length > 0) {
        const nextText = continuousQueueRef.current.shift();
        if (nextText) {
          setTimeout(() => speak(nextText, options), 300);
        } else {
          setIsContinuousReading(false);
        }
      } else if (onContinueRef.current) {
        onContinueRef.current();
        onContinueRef.current = null;
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (isContinuousReading) {
        setIsContinuousReading(false);
        continuousQueueRef.current = [];
      }
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [isSupported, settings, voices, isContinuousReading]);

  const speakContinuous = useCallback((textChunks: string[], options?: Partial<VoiceSettings>) => {
    if (!settings.enabled || textChunks.length === 0) return;
    
    setIsContinuousReading(true);
    continuousQueueRef.current = [...textChunks.slice(1)]; // Queue remaining chunks
    speak(textChunks[0], options); // Start with first chunk
  }, [speak, settings.enabled]);

  const stop = useCallback(() => {
    setIsContinuousReading(false);
    continuousQueueRef.current = [];
    onContinueRef.current = null;
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    } else if (isSupported && isSpeaking) {
      speechSynthesis.pause();
    }
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.play();
    } else if (isSupported) {
      speechSynthesis.resume();
    }
  }, [isSupported]);

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings((prev: VoiceSettings) => ({ ...prev, ...newSettings }));
  }, []);

  const setContinueCallback = useCallback((callback: () => void) => {
    onContinueRef.current = callback;
  }, []);

  return {
    isSupported,
    isSpeaking,
    isContinuousReading,
    voices,
    settings,
    speak,
    speakContinuous,
    stop,
    pause,
    resume,
    updateSettings,
    setContinueCallback
  };
}

function processTextForSpeech(text: string, tone: VoiceSettings['tone']): string {
  let processedText = text;

  // Add natural pauses
  processedText = processedText.replace(/\./g, '. ');
  processedText = processedText.replace(/,/g, ', ');
  processedText = processedText.replace(/;/g, '; ');
  processedText = processedText.replace(/:/g, ': ');

  // Add emphasis based on tone
  switch (tone) {
    case 'casual':
      processedText = processedText.replace(/\b(important|key|crucial|significant)\b/gi, 'really $1');
      break;
    case 'encouraging':
      processedText = processedText.replace(/^/, 'Great question! ');
      processedText = processedText.replace(/\.$/, '. You\'re doing well!');
      break;
    case 'academic':
      // Keep formal tone, add slight pauses for complex terms
      processedText = processedText.replace(/\b(therefore|however|furthermore|moreover)\b/gi, '$1, ');
      break;
  }

  return processedText;
}