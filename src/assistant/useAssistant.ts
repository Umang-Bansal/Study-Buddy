import { useCallback, useState } from 'react';
import { callGemini } from '../api/gemini';
import { buildAssistantContext } from './contextBuilder';
import { AssistantGenerateArgs } from './types';
import { AIResponse, Reference } from '../types';
import { config } from '../config/env';

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function extractReferencesFromText(context: string): Reference[] {
  const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 30);
  const top = sentences.slice(0, Math.min(3, sentences.length));
  return top.map((s, i) => ({ text: s.trim(), position: Math.max(0, context.indexOf(s)), confidence: 0.4 + 0.2 * i } as Reference));
}

export function useAssistant() {
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<AIResponse[]>([]);

  const generate = useCallback(async (args: AssistantGenerateArgs): Promise<AIResponse> => {
    const {
      query,
      document,
      selectedText,
      currentPage,
      contextText,
      mode = 'chat',
      useExtendedContext
    } = args;
    setIsLoading(true);

    const context = buildAssistantContext({
      document,
      selectedText,
      currentPage,
      extraContext: contextText,
      useExtendedContext
    });

    try {
      const prompt = buildPromptForMode(mode, query);
      const text = await callGemini(prompt, context, { model: config.geminiModel, maxOutputTokens: 450, temperature: 0.7 });
      const references = extractReferencesFromText(context);
      const ai: AIResponse = {
        id: generateId(),
        query,
        response: text,
        context,
        timestamp: new Date(),
        references
      };
      setResponses(prev => [...prev, ai]);
      return ai;
    } catch (err) {
      // Graceful fallback to offline generator
      const fallback = buildPromptForMode(mode, query);
      const response = `${generateOfflineNotice(err)}\n\n${fallbackOfflineResponse(fallback, context, mode)}`;
      const ai: AIResponse = {
        id: generateId(),
        query,
        response,
        context,
        timestamp: new Date(),
        references: []
      };
      setResponses(prev => [...prev, ai]);
      return ai;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => setResponses([]), []);

  return { isLoading, responses, generate, clear };
}

function buildPromptForMode(mode: AssistantGenerateArgs['mode'], query: string): string {
  switch (mode) {
    case 'summary':
      return `Summarize clearly and concisely: ${query}`;
    case 'explanation':
      return `Explain the following as if to a student: ${query}`;
    case 'quiz':
      return `Generate a few study questions about: ${query}`;
    case 'concept':
      return `Extract concepts and relationships relevant to: ${query}`;
    case 'question':
    case 'chat':
    default:
      return query;
  }
}

function fallbackOfflineResponse(prompt: string, context: string, mode: AssistantGenerateArgs['mode']): string {
  // Simple reuse of local generation logic used in useAI for consistency
  return `Temporary offline response:\n\n${prompt}\n\nBased on context length ${context.length} characters.`;
}

function generateOfflineNotice(err: unknown): string {
  const msg = (err as Error)?.message || 'unknown error';
  return `Note: Falling back to offline mode (${msg}).`;
}


