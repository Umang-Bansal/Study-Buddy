import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, Brain, BookOpen, Zap, Users, MessageCircle, Lightbulb, Target, ArrowRight, Play, Star, CheckCircle } from 'lucide-react';

interface DocumentUploaderProps {
  onFileUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  processingProgress?: number;
}

export function DocumentUploader({ onFileUpload, isLoading, processingProgress = 0 }: DocumentUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (!file) return;

    if (!isValidFileType(file)) {
      setError('Please upload a PDF, EPUB, DOCX, or TXT file.');
      return;
    }

    try {
      await onFileUpload(file);
    } catch (err) {
      setError('Failed to process document. Please try again.');
    }
  }, [onFileUpload]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('DocumentUploader: handleFileInput called, file:', file);
    if (!file) return;

    setError('');

    if (!isValidFileType(file)) {
      console.log('DocumentUploader: Invalid file type:', file.type);
      setError('Please upload a PDF, EPUB, DOCX, or TXT file.');
      return;
    }

    console.log('DocumentUploader: Valid file, calling onFileUpload...');
    try {
      await onFileUpload(file);
      console.log('DocumentUploader: onFileUpload completed successfully');
    } catch (err) {
      console.error('DocumentUploader: onFileUpload failed:', err);
      setError('Failed to process document. Please try again.');
    }
  }, [onFileUpload]);

  const getProcessingStage = () => {
    if (processingProgress < 25) return 'Extracting content...';
    if (processingProgress < 50) return 'Analyzing structure...';
    if (processingProgress < 75) return 'Identifying concepts...';
    return 'Finalizing analysis...';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{getProcessingStage()}</h2>
          <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-4 mb-6">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
          <p className="text-gray-600 text-lg">Creating your personalized study companion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Bolt.new Badge - Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <a 
          href="https://bolt.new/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group block hover:scale-105 transition-transform duration-300"
        >
          <img 
            src="/black_circle_360x360.png" 
            alt="Built with Bolt.new" 
            className="w-16 h-16 shadow-lg rounded-full hover:shadow-xl transition-shadow duration-300"
          />
        </a>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mb-8 shadow-xl">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Study Smarter,
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Together</span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform any document into an interactive learning experience with AI-powered insights, 
              collaborative discussions, and personalized study guidance.
            </p>
            
            {/* Social Proof */}
            <div className="flex items-center justify-center gap-6 mb-12">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-white text-xs font-medium">{String.fromCharCode(64 + i)}</span>
                    </div>
                  ))}
                </div>
                <span className="text-sm text-gray-600 ml-2">Join 10,000+ students</span>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm text-gray-600 ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="max-w-4xl mx-auto mb-20">
            <div
              className={`relative p-12 border-2 border-dashed rounded-3xl transition-all duration-300 ${
                dragActive
                  ? 'border-indigo-400 bg-indigo-50 scale-105 shadow-2xl'
                  : 'border-gray-300 bg-white/80 backdrop-blur-sm hover:border-gray-400 hover:bg-white hover:shadow-xl'
              } ${isLoading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,.epub,.doc,.docx,.txt"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isLoading}
              />

              <div className="text-center">
                <div className="relative mb-8">
                  <Upload className={`w-16 h-16 mx-auto transition-all duration-300 ${dragActive ? 'text-indigo-600 scale-110' : 'text-gray-400'}`} />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Drop your document here to get started
                </h3>
                <p className="text-gray-600 mb-6 text-lg">
                  Or click to browse • Supports PDF, EPUB, DOCX, and TXT files up to 50MB
                </p>
                <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Academic Papers
                  </span>
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Textbooks
                  </span>
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Research Documents
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 flex items-center gap-3 text-red-600 bg-red-50 px-6 py-4 rounded-xl border border-red-200 max-w-md mx-auto">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Students Love Learning Together
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the power of collaborative learning with AI that understands your documents and adapts to your learning style.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Collaborative Learning */}
            <div className="group p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Collaborative Study Sessions</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Share insights, ask questions, and learn together. Your AI study buddy facilitates meaningful discussions and helps connect ideas across different perspectives.
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                <span>Start collaborating</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Interactive Conversations */}
            <div className="group p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Voice Conversations</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Talk naturally with your AI study buddy. Ask questions, discuss concepts, and get explanations through natural voice conversations that feel like studying with a friend.
              </p>
              <div className="flex items-center text-purple-600 font-medium">
                <span>Try voice chat</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Personalized Insights */}
            <div className="group p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Insights</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Get personalized explanations, concept maps, and study strategies tailored to your learning style. Discover connections you might have missed.
              </p>
              <div className="flex items-center text-green-600 font-medium">
                <span>Explore insights</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Contextual Understanding */}
            <div className="group p-8 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Deep Context Awareness</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your AI companion understands the full context of your documents, maintaining conversation flow and connecting ideas across chapters and sections.
              </p>
              <div className="flex items-center text-orange-600 font-medium">
                <span>See it in action</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Advanced Features */}
            <div className="group p-8 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Advanced Study Tools</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Concept mapping, Socratic questioning, critical thinking prompts, and alternative perspectives to deepen your understanding.
              </p>
              <div className="flex items-center text-teal-600 font-medium">
                <span>Discover tools</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Reading Experience */}
            <div className="group p-8 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Enhanced Reading</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Beautiful typography, voice narration, interactive highlighting, and distraction-free reading that makes studying enjoyable.
              </p>
              <div className="flex items-center text-violet-600 font-medium">
                <span>Experience reading</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-xl text-gray-600">
              From upload to insights in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Upload Your Document</h3>
              <p className="text-gray-600">
                Drop any PDF, EPUB, DOCX, or text file. Our AI instantly analyzes the content and structure.
              </p>
            </div>

            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Start Conversations</h3>
              <p className="text-gray-600">
                Ask questions, select text for explanations, or start voice conversations with your AI study buddy.
              </p>
            </div>

            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Learn & Collaborate</h3>
              <p className="text-gray-600">
                Explore concepts, get personalized insights, and deepen your understanding through interactive learning.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Transform How You Study
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Join thousands of students who've revolutionized their learning experience with AI-powered study collaboration.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Faster Comprehension</h3>
                    <p className="text-gray-600">Understand complex concepts 3x faster with AI-guided explanations and interactive discussions.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Better Retention</h3>
                    <p className="text-gray-600">Remember more through active engagement, voice conversations, and personalized study strategies.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Deeper Insights</h3>
                    <p className="text-gray-600">Discover connections and perspectives you might miss with traditional reading methods.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">AI Study Buddy</h3>
                    <p className="text-indigo-100">Always ready to help</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-sm text-indigo-100 mb-2">You asked:</p>
                    <p className="text-white">"Can you explain the main argument in chapter 3?"</p>
                  </div>
                  
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-sm text-indigo-100 mb-2">AI Response:</p>
                    <p className="text-white text-sm leading-relaxed">
                      "The main argument centers on collaborative learning theory. The author suggests that students learn more effectively when they engage in meaningful discussions..."
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                <Lightbulb className="w-8 h-8 text-yellow-900" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-green-900" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-4">
              Your documents are processed securely and privately. No data is stored or shared.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500 mb-8">
              <span>🔒 End-to-end encrypted</span>
              <span>🚀 Lightning fast processing</span>
              <span>🎯 Personalized learning</span>
              <span>🌟 Loved by students worldwide</span>
            </div>
          </div>
          
          {/* Powered by section */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Powered by</span>
                <img 
                  src="/logo-black.png" 
                  alt="ElevenLabs" 
                  className="h-6 opacity-70 hover:opacity-100 transition-opacity"
                />
                <span className="text-xs text-gray-400">for premium voice synthesis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function isValidFileType(file: File): boolean {
  const validTypes = [
    'application/pdf',
    'application/epub+zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  return validTypes.includes(file.type) || /\.(pdf|epub|doc|docx|txt)$/i.test(file.name);
}