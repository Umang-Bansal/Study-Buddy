import React, { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, Lightbulb, HelpCircle, Brain } from 'lucide-react';
import { Document } from '../types';

interface SocraticDialogProps {
  document: Document;
  selectedText?: string;
  onClose: () => void;
  onAskAI: (query: string) => void;
}

export function SocraticDialog({ document, selectedText, onClose, onAskAI }: SocraticDialogProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const socraticQuestions = generateSocraticQuestions(selectedText || document.content.slice(0, 1000));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [responses, currentQuestion]);

  const handleResponseSubmit = async () => {
    if (!currentResponse.trim()) return;

    const newResponses = [...responses, currentResponse];
    setResponses(newResponses);
    setCurrentResponse('');
    setIsThinking(true);

    // Simulate AI processing
    setTimeout(() => {
      setIsThinking(false);
      if (currentQuestion < socraticQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      }
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleResponseSubmit();
    }
  };

  const handleDeepDive = () => {
    const context = selectedText || `Based on our Socratic discussion about: ${socraticQuestions[currentQuestion]?.question}`;
    onAskAI(`Let's explore this deeper: ${context}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Socratic Dialogue</h2>
              <p className="text-sm text-gray-600">Deepen your understanding through guided questioning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context */}
        {selectedText && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
            <p className="text-sm font-medium text-purple-700 mb-1">Exploring this passage:</p>
            <p className="text-sm text-purple-900 italic">"{selectedText.substring(0, 200)}..."</p>
          </div>
        )}

        {/* Progress */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestion + 1} of {socraticQuestions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / socraticQuestions.length) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestion + 1) / socraticQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {socraticQuestions.slice(0, currentQuestion + 1).map((q, index) => (
            <div key={index} className="space-y-4">
              {/* Question */}
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl rounded-bl-sm p-4 border border-purple-200">
                    <div className="flex items-start gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium text-purple-700">{q.type}</span>
                    </div>
                    <p className="text-gray-800 leading-relaxed">{q.question}</p>
                    {q.hint && (
                      <p className="text-sm text-purple-600 mt-2 italic">💡 {q.hint}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Response */}
              {responses[index] && (
                <div className="flex gap-4 justify-end">
                  <div className="max-w-[80%] bg-gray-900 text-white rounded-xl rounded-br-sm p-4">
                    <p className="leading-relaxed">{responses[index]}</p>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              )}

              {/* Follow-up */}
              {responses[index] && q.followUp && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl rounded-bl-sm p-4 border border-indigo-200">
                      <p className="text-gray-800 leading-relaxed">{q.followUp}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-50 rounded-xl rounded-bl-sm p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">Reflecting on your response...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-200">
          {currentQuestion < socraticQuestions.length && !isThinking ? (
            <div className="space-y-4">
              <textarea
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                rows={3}
              />
              <div className="flex justify-between items-center">
                <button
                  onClick={handleDeepDive}
                  className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Need deeper exploration? Ask AI →
                </button>
                <button
                  onClick={handleResponseSubmit}
                  disabled={!currentResponse.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : currentQuestion >= socraticQuestions.length ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Excellent Reflection!</h3>
                <p className="text-gray-600 mb-4">
                  You've completed this Socratic dialogue. Your thoughtful responses show deep engagement with the material.
                </p>
                <button
                  onClick={handleDeepDive}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200"
                >
                  Explore Further with AI
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface SocraticQuestion {
  question: string;
  type: string;
  hint?: string;
  followUp?: string;
}

function generateSocraticQuestions(context: string): SocraticQuestion[] {
  return [
    {
      question: "What do you think is the main argument or central idea being presented here?",
      type: "Understanding",
      hint: "Look for the thesis or key claim the author is making",
      followUp: "Interesting perspective! Now let's examine the evidence..."
    },
    {
      question: "What evidence or reasoning does the author provide to support this position?",
      type: "Analysis",
      hint: "Consider examples, data, logical arguments, or expert opinions",
      followUp: "Good analysis! Let's think critically about this evidence..."
    },
    {
      question: "How strong do you find this evidence? What might strengthen or weaken the argument?",
      type: "Evaluation",
      hint: "Think about credibility, relevance, and sufficiency of the evidence",
      followUp: "Thoughtful evaluation! Now let's consider different perspectives..."
    },
    {
      question: "What alternative viewpoints or counterarguments might someone present?",
      type: "Critical Thinking",
      hint: "Consider how someone who disagrees might respond",
      followUp: "Excellent critical thinking! Let's explore the implications..."
    },
    {
      question: "What are the broader implications of accepting this argument? How might it apply to other situations?",
      type: "Application",
      hint: "Think about real-world consequences and connections to other areas",
      followUp: "Great connections! Finally, let's reflect on your learning..."
    },
    {
      question: "How has your understanding of this topic changed through our discussion? What questions remain?",
      type: "Reflection",
      hint: "Consider what you've learned and what you'd like to explore further"
    }
  ];
}