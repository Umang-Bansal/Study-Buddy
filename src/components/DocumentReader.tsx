import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Type, Minus, Plus, MessageCircle, X } from 'lucide-react';
import { Document } from '../types';

interface DocumentReaderProps {
  document: Document;
  onTextSelect: (text: string) => void;
  onAskAI: (query: string) => void;
  selectedText: string;
}

export function DocumentReader({ document: docData, onTextSelect, onAskAI, selectedText }: DocumentReaderProps) {
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [maxWidth, setMaxWidth] = useState(65);
  const [showControls, setShowControls] = useState(false);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredWord, setHoveredWord] = useState<{ word: string; position: { x: number; y: number } } | null>(null);
  
  const readerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle text selection
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

  // Handle word hover for definitions
  const handleWordHover = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'SPAN' && target.dataset.word) {
      const rect = target.getBoundingClientRect();
      setHoveredWord({
        word: target.dataset.word,
        position: { x: rect.left + rect.width / 2, y: rect.top - 5 }
      });
    } else {
      setHoveredWord(null);
    }
  }, []);

  // Show/hide controls on mouse movement
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Helper function to handle concept clicks
  const handleConceptClick = useCallback((term: string) => {
    const concept = docData.concepts.find(c => c.term.toLowerCase() === term);
    if (concept) {
      onAskAI(`Explain the concept: "${concept.term}" and its significance in this document.`);
    }
  }, [docData.concepts, onAskAI]);

  // Helper to process individual words for hover functionality
  const processWordsInText = useCallback((text: string, conceptTerms: Set<string>) => {
    return text.split(/(\s+)/).map((part, index) => {
      if (part.trim() && /\w/.test(part)) {
        const cleanWord = part.replace(/[^\w]/g, '').toLowerCase();
        const isConcept = conceptTerms.has(cleanWord);
        
        return (
          <span
            key={index}
            data-word={cleanWord}
            className={`hover:bg-opacity-50 cursor-pointer transition-all duration-200 rounded-sm px-0.5 ${
              isConcept 
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium border-b border-blue-200' 
                : 'hover:bg-gray-100'
            }`}
            onClick={() => isConcept && handleConceptClick(cleanWord)}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, [handleConceptClick]);

  // Helper function to process text with word spans and inline formatting
  const processTextWithSpans = useCallback((text: string) => {
    const conceptTerms = new Set(docData.concepts.map(c => c.term.toLowerCase()));
    
    // Handle bold text **text**
    let processedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Split by HTML tags and text
    const parts = processedText.split(/(<strong>.*?<\/strong>)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
        // Bold text
        const boldContent = part.replace(/<\/?strong>/g, '');
        return (
          <strong key={index} className="font-semibold text-gray-900">
            {processWordsInText(boldContent, conceptTerms)}
          </strong>
        );
      } else {
        // Regular text
        return <span key={index}>{processWordsInText(part, conceptTerms)}</span>;
      }
    });
  }, [docData.concepts, processWordsInText]);

  // Process content to add word spans for hover functionality AND render markdown
  const processContent = useCallback((content: string) => {
    // First, split content into lines for processing
    const lines = content.split('\n');
    const processedElements: JSX.Element[] = [];
    let lineKey = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // Empty line - add spacing
        processedElements.push(<div key={lineKey++} className="h-6" />);
        continue;
      }
      
      // Headers
      if (line.startsWith('# ')) {
        const title = line.substring(2);
        processedElements.push(
          <h1 key={lineKey++} className="text-4xl font-light text-gray-900 mb-8 mt-12 first:mt-0 leading-tight">
            {processTextWithSpans(title)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        const heading = line.substring(3);
        processedElements.push(
          <h2 key={lineKey++} className="text-2xl font-medium text-gray-900 mb-6 mt-10 leading-tight border-b border-gray-200 pb-3">
            {processTextWithSpans(heading)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        const subheading = line.substring(4);
        processedElements.push(
          <h3 key={lineKey++} className="text-xl font-medium text-gray-800 mb-4 mt-8 leading-tight">
            {processTextWithSpans(subheading)}
          </h3>
        );
      }
      // List items
      else if (line.startsWith('- ')) {
        const listItem = line.substring(2);
        processedElements.push(
          <div key={lineKey++} className="flex items-start mb-3 ml-4">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-3 mr-4 flex-shrink-0"></span>
            <div className="flex-1 leading-relaxed">
              {processTextWithSpans(listItem)}
            </div>
          </div>
        );
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          const [, number, text] = match;
          processedElements.push(
            <div key={lineKey++} className="flex items-start mb-3 ml-4">
              <span className="inline-block min-w-[24px] text-gray-600 font-medium mt-0 mr-3 text-sm">
                {number}.
              </span>
              <div className="flex-1 leading-relaxed">
                {processTextWithSpans(text)}
              </div>
            </div>
          );
        }
      }
      // Regular paragraphs
      else {
        processedElements.push(
          <p key={lineKey++} className="text-gray-800 leading-relaxed mb-6 text-justify">
            {processTextWithSpans(line)}
          </p>
        );
      }
    }
    
    console.log('Processed Elements:', processedElements);
    return <div className="space-y-0">{processedElements}</div>;
  }, [processTextWithSpans]);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  useEffect(() => {
    const reader = readerRef.current;
    if (reader) {
      reader.addEventListener('mousemove', handleMouseMove);
      return () => reader.removeEventListener('mousemove', handleMouseMove);
    }
  }, [handleMouseMove]);

  return (
    <div 
      ref={readerRef}
      className="h-full relative bg-white"
      onMouseMove={handleWordHover}
      onMouseLeave={() => setHoveredWord(null)}
    >
      {/* Reading Controls */}
      <div className={`fixed top-6 right-6 z-30 transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 space-y-4">
          {/* Font Size */}
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

          {/* Line Height */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-16">Line Height</span>
            <input
              type="range"
              min="1.2"
              max="2.0"
              step="0.1"
              value={lineHeight}
              onChange={(e) => setLineHeight(parseFloat(e.target.value))}
              className="flex-1"
            />
          </div>

          {/* Max Width */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-16">Width</span>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={maxWidth}
              onChange={(e) => setMaxWidth(parseInt(e.target.value))}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="h-full overflow-y-auto">
        <div 
          className="mx-auto py-16 px-8"
          style={{ maxWidth: `${maxWidth}ch` }}
        >
          {/* Document Title */}
          <div className="text-center mb-16 pb-8 border-b border-gray-200">
            <h1 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">
              {docData.title}
            </h1>
            <div className="text-sm text-gray-500 space-x-4">
              <span>{docData.totalWords.toLocaleString()} words</span>
              {docData.totalPages && (
                <>
                  <span>•</span>
                  <span>{docData.totalPages} pages</span>
                </>
              )}
              <span>•</span>
              <span>{new Date(docData.uploadedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Document Content */}
          <div 
            className="prose-reader max-w-none text-gray-800"
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight
            }}
          >
            {processContent(docData.content)}
          </div>
        </div>
      </div>

      {/* Text Selection Menu */}
      {showSelectionMenu && selectionPosition && selectedText && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
          style={{
            left: Math.max(20, Math.min(window.innerWidth - 200, selectionPosition.x - 100)),
            top: Math.max(20, selectionPosition.y - 60),
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAskAI(`Explain: "${selectedText}"`)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Explain
            </button>
            <button
              onClick={() => onAskAI(`Analyze: "${selectedText}"`)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
            >
              Analyze
            </button>
            <button
              onClick={() => {
                setShowSelectionMenu(false);
                setSelectionPosition(null);
                onTextSelect('');
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Word Definition Tooltip */}
      {hoveredWord && (
        <div
          className="fixed z-40 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{
            left: Math.max(20, Math.min(window.innerWidth - 120, hoveredWord.position.x - 60)),
            top: hoveredWord.position.y - 30,
          }}
        >
          Click for definition: "{hoveredWord.word}"
        </div>
      )}

      {/* Ask AI Button */}
      <button
        onClick={() => onAskAI('')}
        className={`fixed bottom-8 right-8 z-30 bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </div>
  );
}