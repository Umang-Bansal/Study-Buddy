import { useState, useCallback } from 'react';
import { Document, Chapter, Concept, DocumentMetadata } from '../types';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

export function useDocumentProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const processDocument = useCallback(async (file: File): Promise<Document> => {
    setIsProcessing(true);
    setProcessingProgress(0);
    console.log('Starting document processing for:', file.name, file.type, file.size);

    try {
      // Extract content based on file type
      console.log('Extracting content...');
      const { content: rawContent, metadata, fileUrl } = await extractContent(file);
      console.log('Content extracted, length:', rawContent.length);
      setProcessingProgress(40);

      // Analyze document structure from the *original* content
      console.log('Analyzing structure...');
      const chapters = await analyzeStructure(rawContent);
      console.log('Chapters found:', chapters.length);
      setProcessingProgress(50);

      // Extract concepts and key terms
      console.log('Extracting concepts...');
      const concepts = await extractConcepts(rawContent);
      console.log('Concepts extracted:', concepts.length);
      setProcessingProgress(75);

      // Create document object
      const document: Document = {
        id: generateId(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        content: rawContent,
        type: getFileType(file.name),
        fileUrl,
        totalWords: countWords(rawContent),
        totalPages: metadata?.totalPages,
        chapters,
        concepts,
        uploadedAt: new Date(),
        metadata
      };

      console.log('Document created successfully:', document.title, document.totalWords, 'words');
      setProcessingProgress(100);
      return document;
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, []);

  return {
    processDocument,
    isProcessing,
    processingProgress
  };
}

async function extractContent(file: File): Promise<{ content: string; metadata?: DocumentMetadata; fileUrl?: string }> {
  const fileType = getFileType(file.name);
  
  switch (fileType) {
    case 'pdf':
      return extractPDFContent(file);
    case 'epub':
      return extractEPUBContent(file);
    case 'docx':
      return extractDOCXContent(file);
    default: {
      const content = await file.text();
      return { content };
    }
  }
}

async function extractPDFContent(file: File): Promise<{ content: string; metadata: DocumentMetadata; fileUrl: string }> {
  console.log('Processing PDF file:', file.name);
  const fileUrl = URL.createObjectURL(file);

  try {
    // @ts-expect-error - Vite/TS struggle with this dynamic import path but it works
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

    const loadingTask = pdfjsLib.getDocument(fileUrl);
    const pdf = await loadingTask.promise;
    console.log('PDF loaded, pages:', pdf.numPages);

    // Extract text content for AI processing
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n\n';
      
      // Log progress for large documents
      if (pdf.numPages > 10 && pageNum % 10 === 0) {
        console.log(`Processed page ${pageNum} of ${pdf.numPages}`);
      }
    }

    console.log('Total extracted text length:', fullText.length);
    
    const metadata: DocumentMetadata = { 
      totalPages: pdf.numPages
    };

    // Return both the extracted text content AND the fileUrl
    return { content: fullText.trim(), metadata, fileUrl };
  } catch (error) {
    console.error('PDF processing failed:', error);
    // Fallback content if text extraction fails
    const fallbackContent = `# ${file.name}

This PDF file could not be processed for text extraction, but you can still view it and use some AI features.

Try selecting text directly from the PDF viewer below to get AI explanations.`;
    
    return { 
      content: fallbackContent, 
      fileUrl, 
      metadata: { totalPages: 0 } 
    };
  }
}

async function extractEPUBContent(file: File): Promise<{ content: string; metadata?: DocumentMetadata }> {
  // Enhanced EPUB fallback content
  const content = `# ${file.name.replace('.epub', '')}

## E-Book Content
This EPUB file has been successfully uploaded. While full EPUB parsing is not yet implemented in this demo, you can explore all the AI reading features with this enhanced content.

## Chapter 1: Introduction
Digital books represent the future of reading, combining traditional text with interactive features and AI-powered assistance. This format allows for dynamic content that adapts to reader preferences and learning styles.

## Chapter 2: Advanced Features
Modern e-readers provide capabilities far beyond simple text display:
- Adaptive font sizing and spacing
- Context-aware definitions and explanations
- Voice synthesis for accessibility
- Intelligent summarization and analysis

## Chapter 3: Study Applications
E-books excel in academic environments by offering:
- Searchable content across entire libraries
- Annotation and highlighting tools
- Cross-referencing between related concepts
- Progress tracking and comprehension metrics

Try selecting text above to test the AI explanation features!`;

  return { content };
}

async function extractDOCXContent(file: File): Promise<{ content: string; metadata?: DocumentMetadata }> {
  // Enhanced DOCX fallback content
  const content = `# ${file.name.replace(/\.(docx?|doc)$/i, '')}

## Document Content
This Microsoft Word document has been uploaded successfully. The AI Study Companion provides a superior reading experience compared to traditional word processors.

## Enhanced Reading Experience
Unlike static documents, this interface offers:
- **Distraction-free reading**: Clean, focused text presentation
- **AI assistance**: Contextual help and explanations
- **Voice narration**: Professional text-to-speech capabilities
- **Interactive concepts**: Hover and click for deeper understanding

## Academic Benefits
Transform your document reading with features like:
- Intelligent summarization of complex passages
- Concept mapping and relationship visualization
- Socratic questioning to deepen comprehension
- Cross-document knowledge integration

## Sample Content for Testing
Artificial intelligence has revolutionized document processing and analysis. Natural language processing algorithms can now understand context, extract meaning, and provide intelligent assistance to readers and researchers.

**Key Technologies:**
- Machine learning for pattern recognition
- Neural networks for language understanding
- Knowledge graphs for concept relationships
- Semantic analysis for meaning extraction

Select any text above to experience the AI-powered explanation system!`;

  return { content };
}

async function analyzeStructure(content: string): Promise<Chapter[]> {
  // Simulate chapter detection based on headings and structure
  const chapters: Chapter[] = [];
  const lines = content.split('\n');
  let currentPosition = 0;
  let chapterCount = 0;

  // Look for chapter markers (headings, numbers, etc.)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Simple heuristic for chapter detection
    if (line.match(/^(Chapter|CHAPTER|\d+\.|\d+\s)/i) && line.length < 100) {
      if (chapterCount > 0) {
        // Close previous chapter
        chapters[chapterCount - 1].endPosition = currentPosition;
        chapters[chapterCount - 1].wordCount = countWords(
          content.substring(chapters[chapterCount - 1].startPosition, currentPosition)
        );
      }

      // Start new chapter
      chapters.push({
        id: generateId(),
        title: line || `Chapter ${chapterCount + 1}`,
        startPosition: currentPosition,
        endPosition: content.length,
        wordCount: 0,
        concepts: []
      });
      chapterCount++;
    }
    
    currentPosition += lines[i].length + 1;
  }

  // If no chapters found, create a single chapter
  if (chapters.length === 0) {
    chapters.push({
      id: generateId(),
      title: 'Full Document',
      startPosition: 0,
      endPosition: content.length,
      wordCount: countWords(content),
      concepts: []
    });
  } else {
    // Close last chapter
    chapters[chapters.length - 1].endPosition = content.length;
    chapters[chapters.length - 1].wordCount = countWords(
      content.substring(chapters[chapters.length - 1].startPosition)
    );
  }

  return chapters;
}

async function extractConcepts(content: string): Promise<Concept[]> {
  const concepts: Concept[] = [];
  const words = content.toLowerCase().split(/\W+/);
  const wordFreq = new Map<string, number>();
  
  // Count word frequencies
  words.forEach(word => {
    if (word.length > 3) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  });

  // Extract high-frequency terms as potential concepts
  const sortedWords = Array.from(wordFreq.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 50);

  sortedWords.forEach(([term, frequency], index) => {
    if (frequency > 2) {
      const firstMention = content.toLowerCase().indexOf(term);
      const context = extractContext(content, firstMention, 200);
      
      concepts.push({
        id: generateId(),
        term,
        definition: `Key concept: ${term}`,
        context,
        relatedConcepts: [],
        importance: Math.max(1, Math.min(10, Math.floor(frequency / 2))),
        firstMention,
        frequency
      });
    }
  });

  return concepts;
}

function extractContext(text: string, position: number, length: number): string {
  const start = Math.max(0, position - length / 2);
  const end = Math.min(text.length, position + length / 2);
  return text.substring(start, end).trim();
}

function getFileType(filename: string): 'pdf' | 'epub' | 'txt' | 'docx' {
  const extension = filename.toLowerCase().split('.').pop();
  switch (extension) {
    case 'pdf': return 'pdf';
    case 'epub': return 'epub';
    case 'doc':
    case 'docx': return 'docx';
    default: return 'txt';
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}