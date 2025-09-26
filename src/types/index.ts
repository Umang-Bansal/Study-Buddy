export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'pdf' | 'epub' | 'txt' | 'docx';
  fileUrl?: string;
  fileData?: ArrayBuffer;
  fileBlob?: Blob;
  totalWords: number;
  totalPages?: number;
  chapters: Chapter[];
  concepts: Concept[];
  uploadedAt: Date;
  metadata?: DocumentMetadata;
  summary?: DocumentSummary;
}

export interface DocumentMetadata {
  author?: string;
  subject?: string;
  keywords?: string[];
  creationDate?: Date;
  language?: string;
  totalPages?: number;
  pageOffsets?: number[];
}

export interface DocumentSummary {
  gist: string;
  sections: ChapterSummary[];
  keywords: string[];
  generatedAt: string;
}

export interface ChapterSummary {
  chapterId: string;
  title: string;
  synopsis: string;
  keywords: string[];
}

export interface Chapter {
  id: string;
  title: string;
  startPosition: number;
  endPosition: number;
  pageStart?: number;
  pageEnd?: number;
  wordCount: number;
  concepts: string[];
}

export interface Concept {
  id: string;
  term: string;
  definition: string;
  context: string;
  relatedConcepts: string[];
  importance: number;
  firstMention: number;
  frequency: number;
}

export interface AIResponse {
  id: string;
  query: string;
  response: string;
  context: string;
  timestamp: Date;
  references: Reference[];
  conceptMap?: ConceptMap;
  socraticQuestions?: string[];
  criticalThinking?: CriticalThinkingPrompt[];
  alternativeViews?: AlternativeViewpoint[];
}

export interface Reference {
  text: string;
  position: number;
  pageNumber?: number;
  chapter?: string;
  confidence: number;
}

export interface ConceptMap {
  centralConcept: string;
  relatedConcepts: ConceptNode[];
  connections: ConceptConnection[];
}

export interface ConceptNode {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'supporting';
  definition: string;
  examples: string[];
}

export interface ConceptConnection {
  from: string;
  to: string;
  relationship: string;
  strength: number;
}

export interface CriticalThinkingPrompt {
  question: string;
  type: 'analysis' | 'evaluation' | 'synthesis' | 'application';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface AlternativeViewpoint {
  perspective: string;
  argument: string;
  evidence: string[];
  counterarguments: string[];
}

export interface HoverInsight {
  word: string;
  position: { x: number; y: number };
  definition?: string;
  conceptMap?: ConceptMap;
  socraticQuestions?: string[];
  relatedTerms?: string[];
}

export interface VoiceSettings {
  enabled: boolean;
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
  tone: 'casual' | 'academic' | 'encouraging';
}