import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Volume2, VolumeX, Map, Brain, Lightbulb, Eye, MessageCircle, Mic, MicOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, AIResponse } from '../types';
import { useAssistant } from '../assistant/useAssistant';
import { useGlobalVoice } from '../hooks/useGlobalVoice';
import { useVoiceConversation } from '../hooks/useVoiceConversation';
import { VoiceStatusOverlay } from './VoiceStatusOverlay';

interface EnhancedAIPanelProps {
  document: Document;
  selectedText?: string;
  query?: string;
  onClose: () => void;
  currentPage?: number;
  directQuery?: string;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

export function EnhancedAIPanel({ document, selectedText, query, onClose, currentPage = 1, directQuery, onCollapseChange }: EnhancedAIPanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'concepts' | 'critical' | 'alternatives'>('chat');
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [draftQuery, setDraftQuery] = useState('');
  const [useExtendedContext, setUseExtendedContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { generate, responses, isLoading, clear: clearResponses } = useAssistant();
  const { speak, stop, isSpeaking, settings, updateSettings, isSupported } = useGlobalVoice();
  
  // Handle collapse state change
  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseChange?.(newCollapsedState);
  };
  
  // Auto-collapse on small screens
  useEffect(() => {
    const checkScreenSize = () => {
      const isSmallScreen = window.innerWidth < 768; // md breakpoint
      if (isSmallScreen && !isCollapsed) {
        setIsCollapsed(true);
        onCollapseChange?.(true);
      }
    };

    // Check on mount
    checkScreenSize();

    // Check on resize
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isCollapsed, onCollapseChange]);
  
  // Handle voice message by processing it through the AI system
  const handleVoiceMessage = useCallback(async (voiceQuery: string) => {
    try {
      console.log('Processing voice query:', voiceQuery);
      // Process the voice query through the AI system
      const response = await generate({
        mode: 'chat',
        query: voiceQuery,
        document,
        selectedText,
        currentPage,
        useExtendedContext
      });
      
      // Speak the AI response
      if (response && response.response) {
        speak(response.response);
      }
    } catch (error) {
      console.error('Error processing voice message:', error);
    }
  }, [generate, document, selectedText, speak, currentPage, useExtendedContext]);
  
  const voiceConversation = useVoiceConversation(handleVoiceMessage);
  
  useEffect(() => {
    if (document) {
      voiceConversation.initializeDocument(document);
    }
  }, [document, voiceConversation]);

  useEffect(() => {
    if (currentPage) {
      voiceConversation.updateCurrentPage(currentPage);
    }
  }, [currentPage, voiceConversation]);

  // Don't auto-process queries - let user control when to send them
  
  // Create direct query handler
  const handleDirectQuery = useCallback(async (directQueryText: string) => {
    try {
      const response = await generate({
        mode: 'chat',
        query: directQueryText,
        document,
        selectedText,
        currentPage,
        useExtendedContext
      });
      
      // Speak the AI response for direct queries (like voice)
      if (response && response.response) {
        speak(response.response);
      }
    } catch (error) {
      console.error('Error processing direct query:', error);
    }
  }, [generate, document, selectedText, currentPage, speak, useExtendedContext]);
  
  // Process direct queries and clear them
  useEffect(() => {
    if (directQuery) {
      handleDirectQuery(directQuery);
      // Note: We can't clear directQuery here as we don't have access to the setter
      // The parent component should clear it after setting it
    }
  }, [directQuery, handleDirectQuery]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [responses]);

  // Voice-only mode - no keyboard input

  const handleSpeakResponse = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  const renderChatTab = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {responses.length === 0 && (
        <div className="text-center py-8">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm mb-4">Ask me anything about your document</p>
          <div className="space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
                <Mic className="w-4 h-4" />
                <span className="font-medium text-sm">Try asking these questions:</span>
              </div>
              <div className="space-y-1 text-xs text-blue-600">
                <p>• "What are the main arguments in this document?"</p>
                <p>• "Help me understand the key concepts"</p>
                <p>• "What are the implications of these ideas?"</p>
              </div>
              <p className="text-xs text-blue-500 mt-2 italic">
                Hold Ctrl+SPACEBAR and speak your question
              </p>
            </div>
          </div>
        </div>
      )}

      {responses.map((response) => (
        <div key={response.id} className="space-y-4">
          {/* User Message */}
          <div className="flex gap-3 justify-end">
            <div className="max-w-[80%] bg-gray-900 text-white rounded-xl rounded-br-sm p-4">
              <p className="text-sm leading-relaxed">{response.query}</p>
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
            <div className="max-w-[80%] space-y-3">
              {/* Main Response */}
              <div className="bg-gray-50 rounded-xl rounded-bl-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">AI Analysis</span>
                  {isSupported && (
                    <button
                      onClick={() => handleSpeakResponse(response.response)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-800 leading-relaxed">
                  {response.response.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-2 last:mb-0">{paragraph}</p>
                  ))}
                </div>
              </div>



              {/* Socratic Questions */}
              {response.socraticQuestions && response.socraticQuestions.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-3 h-3 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700">Questions to Deepen Understanding</span>
                  </div>
                  <div className="space-y-2">
                    {response.socraticQuestions.slice(0, 2).map((question, i) => (
                      <div
                        key={i}
                        className="block w-full text-left text-xs text-indigo-800 bg-white bg-opacity-60 rounded p-2"
                      >
                        💬 Ask via voice: "{question.substring(0, 40)}..."
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
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-gray-50 rounded-xl rounded-bl-sm p-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
              <span className="text-sm text-gray-600">Analyzing your document...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );

  const renderConceptsTab = () => {
    const latestResponse = responses[responses.length - 1];
    if (!latestResponse?.conceptMap) return <div className="p-4 text-center text-gray-500">No concept map available</div>;

    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{latestResponse.conceptMap.centralConcept}</h3>
          <p className="text-sm text-gray-600">Concept relationships and connections</p>
        </div>
        
        <div className="space-y-4">
          {latestResponse.conceptMap.relatedConcepts.map((concept) => (
            <div key={concept.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  concept.type === 'primary' ? 'bg-blue-500' :
                  concept.type === 'secondary' ? 'bg-green-500' : 'bg-gray-500'
                }`} />
                <h4 className="font-medium text-gray-900">{concept.label}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  concept.type === 'primary' ? 'bg-blue-100 text-blue-700' :
                  concept.type === 'secondary' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {concept.type}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-3">{concept.definition}</p>
              {concept.examples.length > 0 && (
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-600 italic">{concept.examples[0]}</p>
                </div>
              )}
            </div>
          ))}
                </div>
    </div>
  );
};

  const renderCriticalTab = () => {
    const latestResponse = responses[responses.length - 1];
    if (!latestResponse?.criticalThinking) return <div className="p-4 text-center text-gray-500">No critical thinking prompts available</div>;

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Critical Thinking Challenges</h3>
          <p className="text-sm text-gray-600">Deepen your analysis with these thought-provoking questions</p>
        </div>

        {latestResponse.criticalThinking.map((prompt, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-orange-600" />
              <span className={`px-2 py-1 text-xs rounded-full ${
                prompt.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                prompt.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {prompt.difficulty}
              </span>
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                {prompt.type}
              </span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed mb-3">{prompt.question}</p>
            <div className="text-xs text-orange-600 font-medium">
              💬 Ask via voice: "{prompt.question.substring(0, 50)}..."
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAlternativesTab = () => {
    const latestResponse = responses[responses.length - 1];
    if (!latestResponse?.alternativeViews) return <div className="p-4 text-center text-gray-500">No alternative viewpoints available</div>;

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Alternative Perspectives</h3>
          <p className="text-sm text-gray-600">Consider different viewpoints and counterarguments</p>
        </div>

        {latestResponse.alternativeViews.map((view, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-green-600" />
              <h4 className="font-medium text-gray-900">{view.perspective}</h4>
            </div>
            
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-1">Argument:</h5>
                <p className="text-sm text-gray-800 leading-relaxed">{view.argument}</p>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-1">Supporting Evidence:</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {view.evidence.map((evidence, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-1">Counterarguments:</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {view.counterarguments.map((counter, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{counter}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-green-600 font-medium">
              💬 Ask via voice: "What do you think about this perspective?"
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`fixed top-0 right-0 h-full z-30 bg-white/95 backdrop-blur-sm shadow-2xl flex flex-col border-l border-gray-200/50 transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-96 md:w-80 lg:w-96'
    }`}>
      
      {/* Collapse Toggle Button */}
      <button
        onClick={handleCollapseToggle}
        className="absolute -left-10 top-4 w-8 h-8 bg-gray-900 text-white rounded-l-lg flex items-center justify-center hover:bg-gray-800 transition-colors z-10 shadow-lg md:-left-10 -left-8"
        aria-label={isCollapsed ? "Expand AI panel" : "Collapse AI panel"}
      >
        {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {!isCollapsed && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Study Buddy</h3>
                <p className="text-xs text-gray-500">Hold Ctrl+SPACEBAR while speaking • ESC to stop</p>
              </div>
            </div>
          </div>

          {/* Chat Content */}
          {renderChatTab()}

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200/50">
            {/* Voice Status */}
            {(voiceConversation.isListening || voiceConversation.isProcessing || voiceConversation.isSpeaking) && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                {voiceConversation.isListening && (
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Recording audio...</span>
                  </div>
                )}
                {voiceConversation.isProcessing && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span>AI processing audio...</span>
                  </div>
                )}
                {voiceConversation.isSpeaking && (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-green-600">
                      <Volume2 className="w-3 h-3" />
                      <span>AI speaking...</span>
                    </div>
                    <button
                      onClick={voiceConversation.stopSpeaking}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Voice Status Message */}
            {voiceConversation.currentTranscript && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-sm text-blue-700">
                {voiceConversation.currentTranscript}
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              {/* Pending Query */}
              {query && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-700 mb-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium text-sm">Ready to Ask</span>
                  </div>
                  <p className="text-sm text-yellow-800 mb-3 italic">"{query}"</p>
                  <button
                    onClick={async () => {
                      try {
                        const response = await generate({
                          mode: 'question',
                          query,
                          document,
                          selectedText,
                          currentPage,
                          useExtendedContext
                        });
                        
                        // Generate and speak response
                        if (response.response) {
                          handleSpeakResponse(response.response);
                        }
                        
                      } catch (error) {
                        console.error('Error generating response:', error);
                      }
                    }}
                    disabled={isLoading}
                    className="w-full py-2 px-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Send Question'}
                  </button>
                </div>
              )}

              {/* Text & Voice controls */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Send className="h-4 w-4" />
                    <span>Ask in text</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={useExtendedContext}
                      onChange={(event) => setUseExtendedContext(event.target.checked)}
                      className="h-3 w-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <span>Extended context</span>
                  </label>
                </div>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const trimmed = draftQuery.trim();
                    if (!trimmed) return;
                    try {
                      const response = await generate({
                        mode: 'chat',
                        query: trimmed,
                        document,
                        selectedText,
                        currentPage,
                        useExtendedContext
                      });
                      if (response.response) {
                        handleSpeakResponse(response.response);
                      }
                      setDraftQuery('');
                    } catch (error) {
                      console.error('Error sending text question:', error);
                    }
                  }}
                  className="space-y-3"
                >
                  <textarea
                    value={draftQuery}
                    onChange={(event) => setDraftQuery(event.target.value)}
                    placeholder="Type a question or paste text to analyze"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-gray-400 focus:bg-white"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Tip: Shift+Enter for a new line</p>
                    <button
                      type="submit"
                      disabled={isLoading || !draftQuery.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {isLoading ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid gap-2 sm:grid-cols-[auto,1fr] sm:items-center">
                <button
                  onClick={voiceConversation.toggleListening}
                  disabled={voiceConversation.isProcessing}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    voiceConversation.isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : voiceConversation.isProcessing
                      ? 'bg-blue-500 text-white cursor-not-allowed'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {voiceConversation.isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Listening</span>
                    </>
                  ) : voiceConversation.isProcessing ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Processing</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Voice Input</span>
                    </>
                  )}
                </button>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  <div className="flex items-center gap-2 font-medium">
                    <Mic className="w-4 h-4" />
                    <span>Press Ctrl+SPACEBAR, then speak.</span>
                  </div>
                  <p className="mt-1 text-xs text-blue-600">
                    Release to stop recording, or hit Esc to cancel.
                  </p>
                </div>
              </div>
            </div>
            
            {responses.length > 0 && (
              <div className="mt-3 flex justify-between items-center">
                <button
                  onClick={clearResponses}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear conversation
                </button>
                <span className="text-xs text-gray-400">
                  {responses.length} exchange{responses.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Collapsed State - Minimal Controls */}
      {isCollapsed && (
        <div className="flex flex-col items-center justify-center h-full p-2 space-y-4">
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          
          {/* Tooltip when collapsed */}
          <div className="text-xs text-gray-500 text-center transform -rotate-90 whitespace-nowrap">
            Study Buddy
          </div>
          
          {/* Voice Status Indicators */}
          {voiceConversation.isListening && (
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" title="Recording..."></div>
          )}
          {voiceConversation.isProcessing && (
            <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" title="Processing..."></div>
          )}
          {voiceConversation.isSpeaking && (
            <div title="Speaking...">
              <Volume2 className="w-4 h-4 text-green-600" />
            </div>
          )}
          
          {/* Quick Voice Button */}
          <button
            onClick={voiceConversation.toggleListening}
            disabled={voiceConversation.isProcessing}
            title="Voice input (Ctrl+Space)"
            className={`w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center ${
              voiceConversation.isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : voiceConversation.isProcessing
                ? 'bg-blue-500 text-white cursor-not-allowed'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            {voiceConversation.isListening ? (
              <MicOff className="w-3 h-3" />
            ) : voiceConversation.isProcessing ? (
              <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
            ) : (
              <Mic className="w-3 h-3" />
            )}
          </button>
          
          {/* Response count indicator */}
          {responses.length > 0 && (
            <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium" title={`${responses.length} conversation${responses.length !== 1 ? 's' : ''}`}>
              {responses.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}