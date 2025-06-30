import { useState, useCallback } from 'react';
import { Document } from '../types';

export function useDocument() {
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);

  const loadDocument = useCallback(async (file: File) => {
    try {
      const text = await extractTextFromFile(file);
      const document: Document = {
        id: generateId(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        content: text,
        type: getFileType(file.name),
        totalWords: countWords(text),
        chapters: [],
        concepts: [],
        uploadedAt: new Date()
      };
      
      setCurrentDocument(document);
      return document;
    } catch (error) {
      console.error('Failed to load document:', error);
      throw error;
    }
  }, []);

  return {
    currentDocument,
    loadDocument
  };
}

// Utility functions
async function extractTextFromFile(file: File): Promise<string> {
  const text = await file.text();
  return text;
}

function getFileType(filename: string): 'pdf' | 'epub' | 'txt' {
  const extension = filename.toLowerCase().split('.').pop();
  switch (extension) {
    case 'pdf': return 'pdf';
    case 'epub': return 'epub';
    default: return 'txt';
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}