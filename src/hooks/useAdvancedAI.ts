import { useState, useCallback } from 'react';
import { AIResponse, ConceptMap, CriticalThinkingPrompt, AlternativeViewpoint, Reference, Document } from '../types';
import { callGemini } from '../api/gemini';

export function useAdvancedAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<AIResponse[]>([]);

  const generateAdvancedResponse = useCallback(async (
    query: string,
    document: Document,
    selectedText?: string,
    context?: string,
    currentPage?: number
  ): Promise<AIResponse> => {
    setIsLoading(true);

    try {
      console.log('generateAdvancedResponse called with:', { query, documentTitle: document.title, selectedText, contentLength: document.content?.length, currentPage });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

      const relevantContext = selectedText || context || (document.content ? document.content.slice(0, 5000) : 'No content available');
      
      console.log('Processing with relevantContext length:', relevantContext.length);
      
      const references = findReferences(query, document);
      const conceptMap = generateConceptMap(query, document);
      const socraticQuestions = await generateSocraticQuestions(query, relevantContext);
      const criticalThinking = generateCriticalThinkingPrompts(query, relevantContext);
      const alternativeViews = generateAlternativeViewpoints(query, relevantContext);

      const response: AIResponse = {
        id: generateId(),
        query,
        response: await generateContextualResponse(query, document, selectedText, references, currentPage),
        context: relevantContext,
        timestamp: new Date(),
        references,
        conceptMap,
        socraticQuestions,
        criticalThinking,
        alternativeViews
      };

      console.log('Generated response:', response);
      setResponses(prev => [...prev, response]);
      return response;
    } catch (error) {
      console.error('Error in generateAdvancedResponse:', error);
      // Create a fallback response
      const fallbackResponse: AIResponse = {
        id: generateId(),
        query,
        response: `I apologize, but I encountered an error while processing your request. However, I can still help you! Your question was: "${query}". Please try rephrasing your question or ask me something else about the document.`,
        context: selectedText || 'Error occurred',
        timestamp: new Date(),
        references: []
      };
      setResponses(prev => [...prev, fallbackResponse]);
      return fallbackResponse;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResponses = useCallback(() => {
    setResponses([]);
  }, []);

  return {
    generateAdvancedResponse,
    responses,
    isLoading,
    clearResponses
  };
}

function findReferences(query: string, document: Document): Reference[] {
  const references: Reference[] = [];
  const queryTerms = query.toLowerCase().split(/\W+/).filter(term => term.length > 2);
  
  // Handle empty or missing content
  if (!document.content || document.content.trim().length === 0) {
    console.log('Document content is empty, returning empty references');
    return references;
  }
  
  // Search through document content for relevant passages
  const sentences = document.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  sentences.forEach((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    let relevanceScore = 0;
    
    queryTerms.forEach(term => {
      if (lowerSentence.includes(term)) {
        relevanceScore += 1;
      }
    });
    
    if (relevanceScore > 0) {
      const position = document.content.indexOf(sentence);
      const chapter = findChapterForPosition(document, position);
      
      references.push({
        text: sentence.trim(),
        position,
        chapter: chapter?.title,
        confidence: Math.min(1, relevanceScore / queryTerms.length)
      });
    }
  });

  // Sort by relevance and return top 5
  return references
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

function findChapterForPosition(document: Document, position: number) {
  return document.chapters.find(chapter => 
    position >= chapter.startPosition && position <= chapter.endPosition
  );
}

function generateConceptMap(query: string, document: Document): ConceptMap {
  const centralConcept = extractMainConcept(query);
  
  // Handle empty concepts array
  if (!document.concepts || document.concepts.length === 0) {
    console.log('Document concepts is empty, creating minimal concept map');
    return {
      centralConcept,
      relatedConcepts: [],
      connections: []
    };
  }
  
  const relatedConcepts = document.concepts
    .filter(concept => 
      concept.term.toLowerCase().includes(centralConcept.toLowerCase()) ||
      centralConcept.toLowerCase().includes(concept.term.toLowerCase())
    )
    .slice(0, 6)
    .map(concept => ({
      id: concept.id,
      label: concept.term,
      type: (concept.importance > 7 ? 'primary' : concept.importance > 4 ? 'secondary' : 'supporting') as 'primary' | 'secondary' | 'supporting',
      definition: concept.definition,
      examples: [concept.context.substring(0, 100) + '...']
    }));

  const connections = relatedConcepts.map((concept, index) => ({
    from: centralConcept,
    to: concept.id,
    relationship: generateRelationship(centralConcept, concept.label),
    strength: Math.random() * 0.5 + 0.5
  }));

  return {
    centralConcept,
    relatedConcepts,
    connections
  };
}

function extractMainConcept(query: string): string {
  // Simple extraction - in real implementation, use NLP
  const words = query.split(/\W+/).filter(word => word.length > 3);
  return words[0] || 'concept';
}

function generateRelationship(from: string, to: string): string {
  const relationships = [
    'is related to',
    'influences',
    'is a type of',
    'depends on',
    'contrasts with',
    'supports',
    'exemplifies'
  ];
  return relationships[Math.floor(Math.random() * relationships.length)];
}

async function generateSocraticQuestions(query: string, context: string): Promise<string[]> {
  const socraticPrompt = `As a study buddy, generate 3-4 thought-provoking Socratic questions to help a student think deeper about their topic. 

The student asked: "${query}"
Context from their reading: "${context.substring(0, 3000)}..."

Generate questions that:
- Challenge assumptions and encourage deeper analysis
- Connect to broader implications and applications  
- Promote critical thinking about the material
- Are specific to their content, not generic
- Build on the concepts and arguments presented in the context

Return only the questions, one per line, without numbering.`;

  try {
    const response = await callGemini(socraticPrompt, '', {
      model: 'gemini-2.5-flash',
      temperature: 0.8,
      maxOutputTokens: 600
    });
    
    return response.split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 10 && q.includes('?'))
      .slice(0, 4);
  } catch (error) {
    console.error('Failed to generate Socratic questions:', error);
    // Fallback to some generic questions
    return [
      `What assumptions underlie the main concepts in "${query}"?`,
    `How might this idea be viewed differently in another context?`,
      `What evidence supports the key claims being made?`,
      `What are the broader implications of these ideas?`
  ];
  }
}

function generateCriticalThinkingPrompts(query: string, context: string): CriticalThinkingPrompt[] {
  const prompts: CriticalThinkingPrompt[] = [
    {
      question: `Analyze the logical structure of the argument presented about "${extractMainConcept(query)}". What are its strengths and weaknesses?`,
      type: 'analysis',
      difficulty: 'intermediate'
    },
    {
      question: `Evaluate the evidence provided. How credible and sufficient is it for supporting the main claims?`,
      type: 'evaluation',
      difficulty: 'advanced'
    },
    {
      question: `How might you apply this concept to solve a real-world problem in your field of study?`,
      type: 'application',
      difficulty: 'intermediate'
    },
    {
      question: `Synthesize this information with other theories or concepts you know. What new insights emerge?`,
      type: 'synthesis',
      difficulty: 'advanced'
    }
  ];

  return prompts.slice(0, 2 + Math.floor(Math.random() * 2));
}

function generateAlternativeViewpoints(query: string, context: string): AlternativeViewpoint[] {
  const viewpoints: AlternativeViewpoint[] = [
    {
      perspective: 'Critical Perspective',
      argument: `Some scholars argue that the traditional understanding of "${extractMainConcept(query)}" may be oversimplified and doesn't account for cultural or contextual variations.`,
      evidence: [
        'Cross-cultural studies showing different interpretations',
        'Historical analysis revealing evolution of the concept',
        'Contemporary research challenging assumptions'
      ],
      counterarguments: [
        'Universal principles may still apply across contexts',
        'Core elements remain consistent despite variations',
        'Practical applications demonstrate validity'
      ]
    },
    {
      perspective: 'Interdisciplinary View',
      argument: `From an interdisciplinary standpoint, this concept intersects with multiple fields, each offering unique insights that enrich our understanding.`,
      evidence: [
        'Research from psychology, sociology, and anthropology',
        'Case studies from different professional contexts',
        'Theoretical frameworks from various disciplines'
      ],
      counterarguments: [
        'Interdisciplinary approaches may lack focus',
        'Different fields may use incompatible methodologies',
        'Integration challenges may obscure core insights'
      ]
    }
  ];

  return viewpoints.slice(0, 1 + Math.floor(Math.random() * 2));
}

function generateContextualResponse(
  query: string,
  document: Document,
  selectedText?: string,
  references?: Reference[],
  currentPage?: number
): Promise<string> {
  // Build comprehensive context from document and current screen
  let context = `DOCUMENT: "${document.title}"\n\n`;

  // Smart context windowing - only include relevant portions instead of full document
  if (document.content && document.content.length > 0) {
    const smartContext = buildSmartContext(document, currentPage, selectedText);
    context += `READING CONTEXT:\n${smartContext}\n\n`;
  }

  // Add currently visible screen context
  try {
    const readerElement = globalThis.document?.querySelector('[data-document-reader]') as HTMLElement;
    if (readerElement) {
      const visibleText = readerElement.innerText;
      const lines = visibleText.split('\n').filter(line => line.trim().length > 10);
      const currentView = lines.slice(0, 20).join('\n'); // Approximate current screen
      context += `CURRENTLY VIEWING:\n${currentView}\n\n`;
    }
  } catch (error) {
    // Silent fallback - DOM access not available
  }

  if (selectedText) {
    context += `SELECTED TEXT: "${selectedText}"\n\n`;
  }

  if (references && references.length > 0) {
    context += `RELEVANT PASSAGES:\n`;
    references.slice(0, 3).forEach((ref, i) => {
      context += `${i + 1}. "${ref.text}"${ref.chapter ? ` (from ${ref.chapter})` : ''}\n`;
    });
    context += '\n';
  }

  // Optimized study buddy prompt for voice conversation and short responses
  const studyBuddyPrompt = `You are an intelligent, friendly Study Buddy who has been reading along with the student. You have extensive knowledge of the document and understand the flow of ideas, concepts, and arguments throughout.

STUDY BUDDY PERSONALITY:
- Enthusiastic and encouraging about learning
- References specific parts of the text naturally in conversation
- Connects ideas across different sections of the document
- Helps bridge understanding between previous and current material
- Shows genuine interest in the student's learning journey

RESPONSE GUIDELINES:
- Keep responses conversational but informative (2-3 sentences typical)
- Reference specific concepts, examples, or arguments from the text when relevant
- Connect the current question to broader themes in the document
- If they're asking about something they just read, acknowledge their progress
- Use natural language like "Remember when the author mentioned..." or "This connects to what we read earlier about..."
- Be encouraging and make complex ideas accessible

CONTEXT AWARENESS:
- You have access to the document beginning, current chapter, previous chapter, and upcoming content
- Use this knowledge to provide comprehensive, contextual answers
- Help the student see how current content fits into the bigger picture
- Reference related sections when they would help understanding

Student asked: "${query}"

Provide a helpful, engaging response that makes the student feel like they're studying with a knowledgeable friend who really understands the material.`;

  return callGemini(studyBuddyPrompt, context, {
    temperature: 0.7,
    maxOutputTokens: 800 // Increased further for more comprehensive responses with Gemini 2.5 Flash
  });
}

// Smart context builder - only include relevant portions of the document
function buildSmartContext(document: Document, currentPage?: number, selectedText?: string): string {
  if (!document.content) return 'No content available';
  
  const contentLength = document.content.length;
  const maxContextSize = 150000; // Significantly increased for Gemini 2.5 Flash - roughly 50-60k tokens
  
  // If document is small enough, include everything
  if (contentLength <= maxContextSize) {
    return document.content;
  }
  
  // For larger documents, implement smart windowing
  let contextParts: string[] = [];
  
  // 1. Always include document beginning (introduction/overview) - much larger
  const beginning = document.content.substring(0, Math.min(15000, contentLength));
  contextParts.push(`DOCUMENT BEGINNING:\n${beginning}\n`);
  
  // 2. Include current chapter/section context - very comprehensive
  if (currentPage && document.chapters.length > 0) {
    const currentChapter = findCurrentChapter(document, currentPage);
    if (currentChapter) {
      // Include full current chapter
      const chapterContent = document.content.substring(
        currentChapter.startPosition, 
        Math.min(currentChapter.endPosition, currentChapter.startPosition + 40000)
      );
      contextParts.push(`CURRENT CHAPTER - "${currentChapter.title}":\n${chapterContent}\n`);
      
      // Include substantial previous chapter context
      const prevChapterIndex = document.chapters.findIndex(ch => ch.id === currentChapter.id) - 1;
      if (prevChapterIndex >= 0) {
        const prevChapter = document.chapters[prevChapterIndex];
        const prevContent = document.content.substring(
          prevChapter.startPosition,
          Math.min(prevChapter.startPosition + 10000, prevChapter.endPosition)
        );
        contextParts.push(`PREVIOUS CHAPTER - "${prevChapter.title}":\n${prevContent}\n`);
      }
      
      // Include substantial next chapter preview
      const nextChapterIndex = document.chapters.findIndex(ch => ch.id === currentChapter.id) + 1;
      if (nextChapterIndex < document.chapters.length) {
        const nextChapter = document.chapters[nextChapterIndex];
        const nextPreview = document.content.substring(
          nextChapter.startPosition,
          Math.min(nextChapter.startPosition + 5000, nextChapter.endPosition)
        );
        contextParts.push(`NEXT CHAPTER - "${nextChapter.title}" (preview):\n${nextPreview}\n`);
      }
      
      // Include earlier context for better understanding of progression
      if (prevChapterIndex > 0) {
        const prevPrevChapter = document.chapters[prevChapterIndex - 1];
        const prevPrevSummary = document.content.substring(
          prevPrevChapter.startPosition,
          Math.min(prevPrevChapter.startPosition + 3000, prevPrevChapter.endPosition)
        );
        contextParts.push(`EARLIER CHAPTER - "${prevPrevChapter.title}" (context):\n${prevPrevSummary}\n`);
      }
    }
  } else {
    // If no chapter info, include very substantial surrounding content
    const midPoint = Math.floor(contentLength / 2);
    const contextStart = Math.max(0, midPoint - 30000);
    const contextEnd = Math.min(contentLength, midPoint + 30000);
    const surroundingContent = document.content.substring(contextStart, contextEnd);
    contextParts.push(`DOCUMENT CONTENT:\n${surroundingContent}\n`);
  }
  
  // 3. Include selected text context with very large window
  if (selectedText && document.content.includes(selectedText)) {
    const selectedPosition = document.content.indexOf(selectedText);
    const contextStart = Math.max(0, selectedPosition - 5000);
    const contextEnd = Math.min(contentLength, selectedPosition + selectedText.length + 5000);
    const selectionContext = document.content.substring(contextStart, contextEnd);
    contextParts.push(`SELECTION CONTEXT:\n${selectionContext}\n`);
  }
  
  // 4. Combine and ensure we don't exceed limits
  let finalContext = contextParts.join('\n');
  
  // Trim if still too long
  if (finalContext.length > maxContextSize) {
    finalContext = finalContext.substring(0, maxContextSize) + '\n\n[Content truncated for optimal processing]';
  }
  
  return finalContext;
}

// Helper function to find current chapter based on page
function findCurrentChapter(document: Document, currentPage: number) {
  if (!document.chapters || document.chapters.length === 0) return null;
  
  // Try to find chapter by page range
  const chapterByPage = document.chapters.find(chapter => 
    chapter.pageStart && chapter.pageEnd && 
    currentPage >= chapter.pageStart && currentPage <= chapter.pageEnd
  );
  
  if (chapterByPage) return chapterByPage;
  
  // Fallback: estimate chapter by page number
  const avgPagesPerChapter = 100 / document.chapters.length; // Rough estimate
  const estimatedChapterIndex = Math.min(
    document.chapters.length - 1,
    Math.floor((currentPage - 1) / avgPagesPerChapter)
  );
  
  return document.chapters[estimatedChapterIndex] || document.chapters[0];
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}