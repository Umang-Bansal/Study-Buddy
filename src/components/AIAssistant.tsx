import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useAI } from '../hooks/useAI';

interface AIAssistantProps {
  documentContent: string;
  documentTitle: string;
  selectedText?: string;
}

export function AIAssistant({ documentContent, documentTitle, selectedText }: AIAssistantProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    responses, 
    isLoading, 
    askQuestion,
    clearResponses 
  } = useAI();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [responses]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const context = selectedText || documentContent.slice(0, 3000);
    await askQuestion(message, context);
    setMessage('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 border-opacity-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900">AI Study Assistant</h2>
            <p className="text-sm text-gray-600 truncate">{documentTitle}</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {responses.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Bot className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to help</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Ask me anything about your document
            </p>
            
            {/* Quick starter suggestions */}
            <div className="space-y-2">
              <button
                onClick={() => setMessage("What are the main concepts in this document?")}
                className="block w-full text-left p-3 bg-white bg-opacity-60 hover:bg-opacity-80 rounded-lg text-sm text-gray-700 hover:text-gray-900 transition-all duration-200"
              >
                💡 What are the main concepts?
              </button>
              <button
                onClick={() => setMessage("Can you summarize the key points?")}
                className="block w-full text-left p-3 bg-white bg-opacity-60 hover:bg-opacity-80 rounded-lg text-sm text-gray-700 hover:text-gray-900 transition-all duration-200"
              >
                📝 Summarize key points
              </button>
              <button
                onClick={() => setMessage("Help me understand this better")}
                className="block w-full text-left p-3 bg-white bg-opacity-60 hover:bg-opacity-80 rounded-lg text-sm text-gray-700 hover:text-gray-900 transition-all duration-200"
              >
                🤔 Help me understand
              </button>
            </div>
          </div>
        )}

        {responses.map((response) => (
          <div key={response.id} className="space-y-3">
            {/* User Message */}
            <div className="flex gap-3 justify-end">
              <div className="max-w-[85%] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md p-3 shadow-sm">
                <p className="text-sm leading-relaxed">{response.query}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* AI Response */}
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="max-w-[85%] bg-white bg-opacity-70 rounded-2xl rounded-bl-md p-4 shadow-sm">
                <div className="text-sm text-gray-800 leading-relaxed">
                  {response.response.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-2 last:mb-0">{paragraph}</p>
                  ))}
                </div>
                {response.references && response.references.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 border-opacity-50">
                    <p className="text-xs font-medium text-gray-500 mb-2">References:</p>
                    <div className="space-y-1">
                      {response.references.map((ref, i) => (
                        <div key={i} className="p-2 bg-gray-50 bg-opacity-80 rounded text-xs text-gray-700 italic">
                          "{ref.text}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white bg-opacity-70 rounded-2xl rounded-bl-md p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 border-opacity-30">
        {selectedText && (
          <div className="mb-3 p-3 bg-blue-50 bg-opacity-80 rounded-lg border border-blue-200 border-opacity-50">
            <p className="text-xs font-medium text-blue-700 mb-1">Selected text:</p>
            <p className="text-sm text-blue-900 italic line-clamp-2">"{selectedText}"</p>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about your document..."
            className="flex-1 px-3 py-2 border border-gray-300 border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white bg-opacity-80 placeholder-gray-500 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm flex items-center justify-center min-w-[44px]"
          >
            {isLoading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        {responses.length > 0 && (
          <div className="mt-3 flex justify-between items-center">
            <button
              onClick={clearResponses}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear chat
            </button>
            <span className="text-xs text-gray-400">
              {responses.length} message{responses.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}