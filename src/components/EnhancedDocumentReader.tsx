import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Type, Minus, Plus, MessageCircle, X, Volume2, VolumeX, Settings, BookOpen, Map, Play, Pause, SkipForward } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { Document, HoverInsight } from '../types';
import { ConceptMapViewer } from './ConceptMapViewer';
import { SocraticDialog } from './SocraticDialog';
import { useGlobalVoice } from '../hooks/useGlobalVoice';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface EnhancedDocumentReaderProps {
  document: Document;
  onTextSelect: (text: string) => void;
  onAskAI: (query: string) => void;
  onDirectAI?: (query: string) => Promise<void>;
  selectedText: string;
  onPageChange?: (page: number) => void;
  isAIPanelCollapsed?: boolean;
}

export function EnhancedDocumentReader({ 
  document: documentData, 
  onTextSelect, 
  onAskAI, 
  onDirectAI,
  selectedText,
  onPageChange,
  isAIPanelCollapsed
}: EnhancedDocumentReaderProps) {
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.7);
  const [maxWidth, setMaxWidth] = useState(90);
  const [showControls, setShowControls] = useState(false);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoverInsight, setHoverInsight] = useState<HoverInsight | null>(null);
  const [showConceptMap, setShowConceptMap] = useState(false);
  const [showSocraticDialog, setShowSocraticDialog] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  const readerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const { speak, speakContinuous, stop, isSpeaking, isContinuousReading, settings, updateSettings, isSupported } = useGlobalVoice();

  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }): void {
    setNumPages(nextNumPages);
    setPdfLoading(false);
    setPdfError(null);
  }

  function onDocumentLoadError(error: Error): void {
    console.error('PDF loading error:', error);
    setPdfLoading(false);
    setPdfError(`Failed to load PDF: ${error.message}`);
  }

  // Handle text selection with enhanced context
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowSelectionMenu(false);
      setSelectionPosition(null);
      onTextSelect('');
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setShowSelectionMenu(true);
      onTextSelect(selectedText);
    } else {
      setShowSelectionMenu(false);
      setSelectionPosition(null);
      onTextSelect('');
    }
  }, [onTextSelect]);

  // Enhanced word hover with concept mapping
  const handleWordHover = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'SPAN' && target.dataset.word) {
      const rect = target.getBoundingClientRect();
      const word = target.dataset.word;
      
      // Find concept information
      const concept = documentData.concepts.find(c => 
        c.term.toLowerCase() === word.toLowerCase()
      );

      if (concept) {
        setHoverInsight({
          word,
          position: { x: rect.left + rect.width / 2, y: rect.top - 5 },
          definition: concept.definition,
          relatedTerms: concept.relatedConcepts.slice(0, 3)
        });
      } else {
        setHoverInsight({
          word,
          position: { x: rect.left + rect.width / 2, y: rect.top - 5 }
        });
      }
    } else {
      setHoverInsight(null);
    }
  }, [documentData.concepts]);

  // Show/hide controls on mouse movement
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  }, []);

  // Track reading progress
  const handleScroll = useCallback(() => {
    if (readerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = readerRef.current;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    }
  }, []);

  // Speak current paragraph
  const speakCurrentParagraph = useCallback(() => {
    if (!settings.enabled) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const paragraph = range.commonAncestorContainer.textContent || '';
      speak(paragraph);
    }
  }, [speak, settings.enabled]);

  // Extract paragraphs from current chapter for continuous reading
  const extractParagraphs = useCallback((content: string): string[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const paragraphs: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Skip headers (markdown format)
      if (trimmed.startsWith('#')) continue;
      
      // Skip short lines (likely formatting)
      if (trimmed.length < 20) continue;
      
      // Split long paragraphs into smaller chunks for better pacing
      if (trimmed.length > 800) {
        const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim());
        let chunk = '';
        
        for (const sentence of sentences) {
          if (chunk.length + sentence.length > 600) {
            if (chunk.trim()) paragraphs.push(chunk.trim() + '.');
            chunk = sentence;
          } else {
            chunk += (chunk ? '. ' : '') + sentence;
          }
        }
        
        if (chunk.trim()) paragraphs.push(chunk.trim() + '.');
      } else {
        paragraphs.push(trimmed);
      }
    }
    
    return paragraphs;
  }, []);

  // Get chapter content from main document
  const getCurrentChapterContent = useCallback(() => {
    const chapter = documentData.chapters[currentChapter];
    if (!chapter) return '';
    
    return documentData.content.substring(chapter.startPosition, chapter.endPosition);
  }, [documentData, currentChapter]);

  // Start continuous reading from current position
  const startContinuousReading = useCallback(() => {
    if (!settings.enabled || isContinuousReading) return;
    
    const currentContent = getCurrentChapterContent();
    const paragraphs = extractParagraphs(currentContent);
    
    if (paragraphs.length > 0) {
      speakContinuous(paragraphs);
    }
  }, [settings.enabled, isContinuousReading, getCurrentChapterContent, extractParagraphs, speakContinuous]);



  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  const isPdf = documentData.type === 'pdf' && documentData.fileUrl;

  // Track current page for PDFs
  const handlePageTracking = useCallback(() => {
    if (readerRef.current && isPdf && numPages) {
      const { scrollTop, scrollHeight } = readerRef.current;
      const pageHeight = scrollHeight / numPages;
      const newCurrentPage = Math.min(numPages, Math.max(1, Math.floor(scrollTop / pageHeight) + 1));
      if (newCurrentPage !== currentPage) {
        setCurrentPage(newCurrentPage);
        onPageChange?.(newCurrentPage);
      }
    }
  }, [isPdf, numPages, currentPage, onPageChange]);

  useEffect(() => {
    const reader = readerRef.current;
    if (reader) {
      reader.addEventListener('mousemove', handleMouseMove);
      reader.addEventListener('scroll', handleScroll);
      reader.addEventListener('scroll', handlePageTracking);
      return () => {
        reader.removeEventListener('mousemove', handleMouseMove);
        reader.removeEventListener('scroll', handleScroll);
        reader.removeEventListener('scroll', handlePageTracking);
      };
    }
  }, [handleMouseMove, handleScroll, handlePageTracking]);

  // Reset PDF states when document changes
  useEffect(() => {
    if (isPdf) {
      setPdfLoading(true);
      setPdfError(null);
    }
  }, [documentData.fileUrl, isPdf]);

  return (
    <div 
      ref={readerRef}
      data-document-reader
      className={`h-full relative bg-gray-50 overflow-y-auto scrollbar-visible transition-all duration-300 ${
        isAIPanelCollapsed ? 'pr-12' : 'pr-96 md:pr-80 lg:pr-96'
      }`}
      onMouseMove={handleWordHover}
      onMouseLeave={() => setHoverInsight(null)}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#9CA3AF #F3F4F6'
      }}
    >
      {/* Enhanced Reading Controls */}
      <div className={`fixed top-6 right-6 z-30 transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}>
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 space-y-4 min-w-[280px]">
          {/* Document Info */}
          <div className="border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                Chapter {currentChapter + 1} of {documentData.chapters.length}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {documentData.chapters[currentChapter]?.title || 'Reading'}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${readingProgress}%` }}
              />
            </div>
          </div>

          {/* Font Controls */}
          <div className="flex items-center gap-3">
            <Type className="w-4 h-4 text-gray-600" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-medium w-8 text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Enhanced Voice Controls with Continuous Reading */}
          {isSupported && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Read Aloud</span>
                </div>
                <button
                  onClick={() => updateSettings({ enabled: !settings.enabled })}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    settings.enabled ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${
                    settings.enabled ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              {(isSpeaking || isContinuousReading) && settings.enabled && (
                <button
                  onClick={stop}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Pause className="w-3 h-3" />
                  Stop
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chapter Navigation Sidebar */}
      {!isPdf && documentData.chapters.length > 1 && (
        <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-2 max-h-[60vh] overflow-y-auto scrollbar-visible">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-600 px-2 py-1 border-b border-gray-200 mb-2">
              Quick Navigation
            </div>
            {documentData.chapters.map((chapter, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentChapter(index);
                  // Scroll to top when changing chapters
                  readerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full text-left px-2 py-2 text-xs rounded-lg transition-colors ${
                  currentChapter === index
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="truncate max-w-[120px]" title={chapter.title}>
                    {chapter.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document Content */}
      <div 
        className="mx-auto py-24 px-8 font-serif"
        style={{ maxWidth: `${maxWidth}ch` }}
      >
        <div className="text-center mb-16 pb-8 border-b">
          <h1 className="text-4xl lg:text-5xl font-light text-gray-900 mb-4 tracking-wide font-sans">
            {documentData.title}
          </h1>
          {documentData.metadata && (
            <div className="text-sm text-gray-600 space-y-1">
              {documentData.metadata.author && <p>by {documentData.metadata.author}</p>}
              {documentData.metadata.subject && <p>{documentData.metadata.subject}</p>}
            </div>
          )}
        </div>

        {/* Chapter Navigation for non-PDFs */}
        {!isPdf && documentData.chapters.length > 1 && (
          <nav className="mb-8 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentChapter(Math.max(0, currentChapter - 1))}
                disabled={currentChapter === 0}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-sm font-medium text-gray-900">
                {documentData.chapters[currentChapter]?.title}
              </span>
              <button
                onClick={() => setCurrentChapter(Math.min(documentData.chapters.length - 1, currentChapter + 1))}
                disabled={currentChapter === documentData.chapters.length - 1}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </nav>
        )}

        {isPdf ? (
          <div className="pdf-container flex flex-col items-center">
            {pdfLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">Loading PDF...</div>
              </div>
            )}
            {pdfError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">
                <h3 className="font-medium mb-2">PDF Loading Error</h3>
                <p className="text-sm">{pdfError}</p>
                <p className="text-sm mt-2">
                  Please try uploading the PDF again or use a different file format.
                </p>
              </div>
            )}
            <PdfDocument
              file={documentData.fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
            >
              {Array.from(new Array(numPages || 0), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  renderTextLayer={true} 
                  className="mb-8 shadow-lg"
                  width={Math.min(window.innerWidth * 0.8, 1000)}
                />
              ))}
            </PdfDocument>
          </div>
        ) : (
          <article 
            className="prose prose-lg lg:prose-xl max-w-none prose-p:text-justify prose-headings:font-sans"
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {documentData.content}
            </ReactMarkdown>
          </article>
        )}
      </div>

      {/* Enhanced Text Selection Menu */}
      {showSelectionMenu && selectionPosition && selectedText && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[200px]"
          style={{
            left: Math.max(20, Math.min(window.innerWidth - 220, selectionPosition.x - 100)),
            top: Math.max(20, selectionPosition.y - 80),
          }}
        >
          <div className="space-y-2">
            <button
              onClick={() => onDirectAI ? onDirectAI(`Explain: "${selectedText}"`) : onAskAI(`Explain: "${selectedText}"`)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Explain Concept
            </button>
            <button
              onClick={() => onDirectAI ? onDirectAI(`Analyze: "${selectedText}"`) : onAskAI(`Analyze: "${selectedText}"`)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Analyze Critically
            </button>
            <button
              onClick={() => onDirectAI ? onDirectAI(`What are the implications of: "${selectedText}"`) : onAskAI(`What are the implications of: "${selectedText}"`)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Explore Implications
            </button>
            {settings.enabled && (
              <button
                onClick={() => speak(selectedText)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                Read Aloud
              </button>
            )}
            <button
              onClick={() => {
                setShowSelectionMenu(false);
                setSelectionPosition(null);
                onTextSelect('');
              }}
              className="w-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-center"
            >
              <X className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Hover Insight */}
      {hoverInsight && (
        <div
          className="fixed z-40 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl pointer-events-none max-w-xs"
          style={{
            left: Math.max(20, Math.min(window.innerWidth - 300, hoverInsight.position.x - 150)),
            top: hoverInsight.position.y - 60,
          }}
        >
          <div className="font-medium mb-1">"{hoverInsight.word}"</div>
          {hoverInsight.definition && (
            <div className="text-xs text-gray-300 mb-2">{hoverInsight.definition}</div>
          )}
          {hoverInsight.relatedTerms && hoverInsight.relatedTerms.length > 0 && (
            <div className="text-xs text-blue-300">
              Related: {hoverInsight.relatedTerms.join(', ')}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">Click for detailed explanation</div>
        </div>
      )}

      {/* Concept Map Modal */}
      {showConceptMap && (
        <ConceptMapViewer
          document={documentData}
          onClose={() => setShowConceptMap(false)}
        />
      )}

      {/* Socratic Dialog Modal */}
      {showSocraticDialog && (
        <SocraticDialog
          document={documentData}
          selectedText={selectedText}
          onClose={() => setShowSocraticDialog(false)}
          onAskAI={onAskAI}
        />
      )}
    </div>
  );
}