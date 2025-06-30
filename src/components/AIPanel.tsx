import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User } from 'lucide-react';
import { Document } from '../types';
import { useAI } from '../hooks/useAI';

interface AIPanelProps {
  document: Document;
  selectedText?: string;
  query?: string;
  onClose: () => void;
}

export function AIPanel({ document, selectedText, query, onClose }: AIPanelProps) {
  const [message, setMessage] = useState(query || '');
  const [conversations, setConversations] = useState<Array<{ query: string; response: string; timestamp: Date }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { generateResponse, isLoading } = useAI();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  useEffect(() => {
    if (query) {
      handleSendMessage();
    }
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const currentMessage = message;
    setMessage('');

    try {
      const context = selectedText || document.content.slice(0, 3000);
      const response = await generateResponse(currentMessage, context, 'question');
      
      setConversations(prev => [...prev, {
        query: currentMessage,
        response: response.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black bg-opacity-20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* AI Panel */}
      <div className="w-96 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">{document.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Text Context */}
        {selectedText && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Selected text:</p>
            <p className="text-sm text-gray-800 italic">"{selectedText}"</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversations.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Ask me anything about your document</p>
            </div>
          )}

          {conversations.map((conv, index) => (
            <div key={index} className="space-y-3">
              {/* User Message */}
              <div className="flex gap-3 justify-end">
                <div className="max-w-[80%] bg-gray-900 text-white rounded-lg rounded-br-sm p-3">
                  <p className="text-sm">{conv.query}</p>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              </div>

              {/* AI Response */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="max-w-[80%] bg-gray-50 rounded-lg rounded-bl-sm p-3">
                  <div className="text-sm text-gray-800 leading-relaxed">
                    {conv.response.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-2 last:mb-0">{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-50 rounded-lg rounded-bl-sm p-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your document..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors text-sm"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[44px]"
            >
              {isLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}