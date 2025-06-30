import React from 'react';
import { Volume2, Mic, Brain } from 'lucide-react';

interface VoiceStatusOverlayProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  currentTranscript: string;
}

export function VoiceStatusOverlay({ 
  isListening, 
  isProcessing, 
  isSpeaking, 
  currentTranscript 
}: VoiceStatusOverlayProps) {
  // Don't show anything if no voice activity
  if (!isListening && !isProcessing && !isSpeaking && !currentTranscript) {
    return null;
  }

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-lg px-6 py-4 min-w-[300px]">
        {/* Voice Status */}
        <div className="flex items-center justify-center gap-3 mb-2">
          {isListening && (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <Mic className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Listening...</span>
            </>
          )}
          
          {isProcessing && (
            <>
              <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Thinking...</span>
            </>
          )}
          
          {isSpeaking && (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <Volume2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Speaking...</span>
            </>
          )}
        </div>
        
        {/* Current Transcript */}
        {currentTranscript && (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">You said:</div>
            <div className="text-sm text-gray-800 italic">
              "{currentTranscript}"
            </div>
          </div>
        )}
        
        {/* Hotkey Help */}
        {!isListening && !isProcessing && !isSpeaking && (
          <div className="text-center">
            <div className="text-xs text-gray-500">
              Press <span className="font-mono bg-gray-100 px-1 rounded">Ctrl+SPACEBAR</span> or <span className="font-mono bg-gray-100 px-1 rounded">Ctrl+Shift+V</span> to speak
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 