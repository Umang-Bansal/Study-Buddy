import { Document } from '../types';

export type AssistantMode = 'chat' | 'question' | 'explanation' | 'summary' | 'quiz' | 'concept';

export type AssistantGenerateArgs = {
  mode?: AssistantMode;
  query: string;
  document?: Document;
  contextText?: string;
  selectedText?: string;
  currentPage?: number;
  useExtendedContext?: boolean;
};


