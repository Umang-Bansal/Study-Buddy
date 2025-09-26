import { useState, useCallback } from 'react';
import { Document, Chapter, Concept, DocumentMetadata, DocumentSummary, ChapterSummary } from '../types';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { computeFileHash } from '../lib/hash';
import { getCachedDocument, setCachedDocument, setPdfBlob, getPdfBlob } from '../lib/idb';
import { parseDocxContent } from '../lib/parsers/docx';
import { parseEpubContent } from '../lib/parsers/epub';
import { parsePdfContent } from '../lib/parsers/pdf';

export function useDocumentProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const processDocument = useCallback(async (file: File): Promise<Document> => {
    setIsProcessing(true);
    setProcessingProgress(0);
    console.log('Starting document processing for:', file.name, file.type, file.size);

    try {
      // Cache check by file hash
      const hash = await computeFileHash(file);
      const cached = await getCachedDocument(hash);
      if (cached) {
        const cachedDoc = { ...(cached as Document) };
        const needsPdfUpgrade =
          cachedDoc.type === 'pdf' &&
          (!Array.isArray(cachedDoc.metadata?.pageOffsets) || cachedDoc.metadata.pageOffsets.length <= 1 || !cachedDoc.content || cachedDoc.content.startsWith('# '));

        if (!cachedDoc.summary && cachedDoc.content && cachedDoc.chapters?.length) {
          try {
            cachedDoc.summary = await generateDocumentSummary(
              cachedDoc.content,
              cachedDoc.chapters,
              cachedDoc.metadata
            );
            const { fileData: _omitCached, ...cacheSafeWithSummary } = cachedDoc as any;
            await setCachedDocument(hash, cacheSafeWithSummary);
          } catch (error) {
            console.warn('Failed to generate summary for cached document', error);
          }
        }
        const isPdf = cachedDoc.type === 'pdf';
        let hasPdfData = false;
        try {
          hasPdfData = !!(cachedDoc as any).fileData && ((cachedDoc as any).fileData as ArrayBuffer).byteLength > 0;
        } catch {}

        if (!needsPdfUpgrade && (!isPdf || (isPdf && hasPdfData))) {
          console.log('Loaded document from cache');
          setProcessingProgress(100);
          return cachedDoc;
        }

        if (!needsPdfUpgrade && isPdf) {
          // Try to load persisted blob for this PDF
          const blob = await getPdfBlob(hash);
          if (blob && blob.size > 0) {
            console.log('Loaded PDF blob from cache store');
            const arrayBuffer = await blob.arrayBuffer();
            const revived: Document = { ...cachedDoc, fileData: arrayBuffer, fileBlob: blob } as Document;
            setProcessingProgress(100);
            return revived;
          }
        }

        if (needsPdfUpgrade) {
          console.log('Cached PDF lacks extracted text; reprocessing for enhanced context');
        } else {
          console.log('Cached PDF missing/invalid fileData; reprocessing to enable proper viewer');
        }
      }

      // Extract content based on file type
      console.log('Extracting content...');
      const { content: rawContent, metadata, fileData } = await extractContent(file);
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

      console.log('Generating summaries...');
      const summary = await generateDocumentSummary(rawContent, chapters, metadata);
      setProcessingProgress(85);

      // Create document object
      const document: Document = {
        id: generateId(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        content: rawContent,
        type: getFileType(file.name),
        totalWords: countWords(rawContent),
        totalPages: metadata?.totalPages,
        chapters,
        concepts,
        uploadedAt: new Date(),
        metadata,
        summary,
        ...(getFileType(file.name) === 'pdf'
          ? { fileBlob: file as unknown as Blob, ...(fileData ? { fileData } : {}) }
          : { ...(fileData ? { fileData } : {}) })
      };

      console.log('Document created successfully:', document.title, document.totalWords, 'words');

      // Persist to cache (omit large binary in doc store to avoid detaching buffers)
      try {
        const { fileData: _omit, ...cacheSafe } = document as any;
        await setCachedDocument(hash, cacheSafe);
        if (document.type === 'pdf') {
          const blobToStore = (document as any).fileBlob as Blob | undefined;
          if (blobToStore && blobToStore.size > 0) {
            await setPdfBlob(hash, blobToStore);
          }
        }
      } catch {}
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

async function extractContent(file: File): Promise<{ content: string; metadata?: DocumentMetadata; fileData?: ArrayBuffer }> {
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

async function extractPDFContent(file: File): Promise<{ content: string; metadata: DocumentMetadata; fileData: ArrayBuffer }> {
  console.log('Processing PDF file with text extraction:', file.name);
  const fileData = await file.arrayBuffer();

  try {
    const { content, metadata } = await parsePdfContent(fileData, file.name);
    return { content, metadata, fileData };
  } catch (error) {
    console.error('PDF text extraction failed, falling back to placeholder:', error);
    const fallbackContent = `# ${file.name}\n\n[PDF loaded. Text extraction unavailable in this session.]`;
    return {
      content: fallbackContent,
      metadata: { totalPages: 0 },
      fileData
    };
  }
}

async function extractEPUBContent(file: File): Promise<{ content: string; metadata?: DocumentMetadata }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const text = await parseEpubContent(arrayBuffer);
    if (text.trim().length > 0) {
      return { content: text };
    }
  } catch (error) {
    console.warn('EPUB text extraction failed, using fallback content:', error);
  }

  const fallback = `# ${file.name.replace('.epub', '')}

[EPUB text extraction unavailable. Consider converting to PDF/TXT for richer AI assistance.]`;
  return { content: fallback };
}

async function extractDOCXContent(file: File): Promise<{ content: string; metadata?: DocumentMetadata }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const text = await parseDocxContent(arrayBuffer);
    if (text.trim().length > 0) {
      return { content: text };
    }
  } catch (error) {
    console.warn('DOCX text extraction failed, using fallback content:', error);
  }

  const fallback = `# ${file.name.replace(/\.(docx?|doc)$/i, '')}

[Text extraction unavailable. Upload a different copy or export as PDF/TXT to enable context-aware AI responses.]`;
  return { content: fallback };
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

async function generateDocumentSummary(
  content: string,
  chapters: Chapter[],
  metadata?: DocumentMetadata
): Promise<DocumentSummary | undefined> {
  if (!content.trim()) {
    return undefined;
  }

  const gist = buildGist(content, metadata);
  const sections = chapters.map(chapter => buildChapterSummary(content, chapter));
  const keywords = extractKeywords(content, 12);

  return {
    gist,
    sections,
    keywords,
    generatedAt: new Date().toISOString()
  };
}

function buildGist(content: string, metadata?: DocumentMetadata): string {
  const paragraphs = splitIntoParagraphs(content);
  const topParagraphs = paragraphs.slice(0, 3).join('\n\n');
  const summary = trimTextForSummary(topParagraphs, 600);

  if (metadata?.subject) {
    return `${metadata.subject}: ${summary}`;
  }

  return summary;
}

function buildChapterSummary(content: string, chapter: Chapter): ChapterSummary {
  const text = content.slice(chapter.startPosition, chapter.endPosition);
  const paragraphs = splitIntoParagraphs(text);
  const synopsis = trimTextForSummary(paragraphs.slice(0, 2).join('\n\n'), 400);
  const keywords = extractKeywords(text, 6);

  return {
    chapterId: chapter.id,
    title: chapter.title,
    synopsis,
    keywords
  };
}

function splitIntoParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function trimTextForSummary(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function extractKeywords(content: string, limit: number): string[] {
  const words = content
    .toLowerCase()
    .match(/[a-zA-Z][a-zA-Z-]{2,}/g);

  if (!words) {
    return [];
  }

  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'your', 'have', 'about',
    'into', 'been', 'will', 'their', 'would', 'there', 'which', 'when', 'also',
    'these', 'more', 'using', 'some', 'such', 'each'
  ]);

  const frequency = new Map<string, number>();
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
  });

  return Array.from(frequency.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([word]) => word);
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