import { useState, useCallback } from 'react';
import { AIResponse, Reference } from '../types';
import { callGemini } from '../api/gemini';

// Helper function to get context around selected text
function getContextAroundSelection(selectedText: string, fullContent: string, contextLength: number = 1200): string {
  const selectedIndex = fullContent.toLowerCase().indexOf(selectedText.toLowerCase());
  if (selectedIndex === -1) {
    // If exact match not found, return beginning of document as fallback
    return fullContent.substring(0, contextLength);
  }
  
  const halfContext = Math.floor(contextLength / 2);
  const start = Math.max(0, selectedIndex - halfContext);
  const end = Math.min(fullContent.length, selectedIndex + selectedText.length + halfContext);
  
  return fullContent.substring(start, end);
}

export function useAI() {
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateResponse = useCallback(async (
    query: string, 
    context: string, 
    type: 'explanation' | 'question' | 'summary' | 'quiz' | 'chat' | 'concept' = 'chat'
  ): Promise<AIResponse> => {
    setIsLoading(true);
    
    try {
      // Simulate AI response with more realistic timing
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
      
      let response: string;

      const hasGeminiKey = !!(import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (hasGeminiKey) {
        try {
          response = await callGemini(query, context, { model: 'gemini-1.5-flash' });
        } catch (err) {
          console.error('Gemini API failed, falling back to local generator', err);
          response = generateEnhancedResponse(query, context, type);
        }
      } else {
        response = generateEnhancedResponse(query, context, type);
      }
      
      const aiResponse: AIResponse = {
        id: generateId(),
        query,
        response,
        context,
        timestamp: new Date(),
        references: extractReferences(context, type)
      };
      
      setResponses((prev: AIResponse[]) => [...prev, aiResponse]);
      return aiResponse;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateSummary = useCallback(async (text: string, type: 'full' | 'brief' | 'bullet' = 'brief') => {
    return generateResponse(
      `Generate a ${type} summary`,
      text,
      'summary'
    );
  }, [generateResponse]);

  const explainConcept = useCallback(async (selectedText: string, fullContent: string) => {
    const contextAroundSelection = getContextAroundSelection(selectedText, fullContent);
    
    // Enhanced prompt with context
    const enhancedQuery = `You are an AI study partner. The user has highlighted the following excerpt:
===
${selectedText}
===
Here is the surrounding document context:
${contextAroundSelection}

Please explain this concept in detail, relating it to the surrounding context and helping the user understand its significance within the document.`;

    return generateResponse(
      enhancedQuery,
      contextAroundSelection,
      'explanation'
    );
  }, [generateResponse]);

  const generateQuiz = useCallback(async (content: string) => {
    return generateResponse(
      'Generate quiz questions',
      content,
      'quiz'
    );
  }, [generateResponse]);

  const askQuestion = useCallback(async (question: string, fullContent: string, selectedText?: string) => {
    let contextualQuestion = question;
    let context = fullContent;
    
    if (selectedText) {
      context = getContextAroundSelection(selectedText, fullContent);
      contextualQuestion = `Based on the document context, ${question}`;
      if (selectedText.length > 0) {
        contextualQuestion += `\n\nRelevant excerpt: "${selectedText}"`;
      }
    }
    
    return generateResponse(contextualQuestion, context, 'question');
  }, [generateResponse]);

  const generateConcepts = useCallback(async (content: string) => {
    return generateResponse(
      'Extract key concepts and create a concept map',
      content,
      'concept'
    );
  }, [generateResponse]);

  const clearResponses = useCallback(() => {
    setResponses([]);
  }, []);

  return {
    responses,
    isLoading,
    generateResponse,
    generateSummary,
    explainConcept,
    generateQuiz,
    generateConcepts,
    askQuestion,
    clearResponses
  };
}

function generateEnhancedResponse(query: string, context: string, type: string): string {
  const contextWords = context.toLowerCase();
  const queryWords = query.toLowerCase();
  
  // More sophisticated response generation based on context analysis
  if (type === 'explanation') {
    const explanationTemplates = [
      `This concept represents a critical element in understanding the broader framework. Looking at the surrounding context, it appears to function as ${generateConceptFunction(contextWords)}. The significance lies in how it connects to ${generateRelatedConcepts(contextWords)}, creating a foundation for the arguments that follow.`,
      
      `Based on the textual evidence provided, this term encompasses several interconnected ideas. The author uses it to bridge theoretical understanding with practical application. Notice how the surrounding paragraphs build upon this concept by ${generateProgressiveBuilding(contextWords)}.`,
      
      `This is a pivotal concept that demonstrates the author's methodology. The term operates within a larger conceptual system where ${generateSystemicRelation(contextWords)}. Understanding this helps clarify why the author emphasizes its importance in relation to the broader thesis.`
    ];
    
    return explanationTemplates[Math.floor(Math.random() * explanationTemplates.length)];
  }
  
  if (type === 'summary') {
    if (queryWords.includes('bullet')) {
      return generateBulletSummary(context);
    } else if (queryWords.includes('brief')) {
      return generateBriefSummary(context);
    } else {
      return generateFullSummary(context);
    }
  }
  
  if (type === 'quiz') {
    return generateContextualQuiz(context);
  }
  
  if (type === 'concept') {
    return generateConceptMap(context);
  }
  
  // Enhanced chat responses
  const chatTemplates = [
    `That's an insightful question about this section. The text suggests that ${generateInsightfulConnection(contextWords, queryWords)}. Let me break this down further: the author's approach here involves ${generateAuthorApproach(contextWords)}, which connects to the broader theme of ${generateBroaderTheme(contextWords)}.`,
    
    `I can help you explore this aspect of the document. The key relationship here appears to be between ${generateKeyRelationship(contextWords)} and ${generateSecondaryElement(contextWords)}. This is particularly significant because ${generateSignificance(contextWords)}.`,
    
    `This question touches on one of the central arguments in this section. Notice how the author builds their case by ${generateArgumentStructure(contextWords)}. The evidence presented supports the idea that ${generateEvidenceSupport(contextWords)}.`
  ];
  
  return chatTemplates[Math.floor(Math.random() * chatTemplates.length)];
}

function generateBulletSummary(context: string): string {
  const keyPoints = extractKeyPoints(context);
  return `**Key Points:**\n\n${keyPoints.map(point => `• ${point}`).join('\n')}\n\n**Main Takeaway:** ${generateMainTakeaway(context)}`;
}

function generateBriefSummary(context: string): string {
  return `**Brief Summary:** ${generateCoreMessage(context)} The author establishes this through ${generateMethodology(context)}, providing ${generateEvidenceType(context)} to support their conclusions. This section is particularly important because ${generateImportance(context)}.`;
}

function generateFullSummary(context: string): string {
  return `**Comprehensive Summary:**\n\n**Introduction:** ${generateIntroductoryStatement(context)}\n\n**Key Arguments:** ${generateKeyArguments(context)}\n\n**Evidence & Examples:** ${generateEvidenceExamples(context)}\n\n**Implications:** ${generateImplications(context)}\n\n**Conclusion:** ${generateConclusionStatement(context)}`;
}

function generateContextualQuiz(context: string): string {
  const concepts = extractMainConcepts(context);
  return `**Comprehensive Study Questions:**\n\n**Conceptual Understanding:**\n1. What is the main argument presented in this section?\n2. How does the author support their central thesis?\n3. What are the key terms or concepts introduced here?\n\n**Critical Analysis:**\n4. What evidence does the author provide for their claims?\n5. How do the examples relate to the theoretical framework?\n6. What are the broader implications of these ideas?\n\n**Application Questions:**\n7. How might these concepts apply to related fields or situations?\n8. What questions does this section raise for further investigation?\n9. How does this connect to previously discussed material?\n\n**Socratic Prompts:**\n• Why might the author have chosen to present the information in this order?\n• What assumptions underlie the main arguments?\n• How might alternative perspectives challenge these ideas?`;
}

function generateConceptMap(context: string): string {
  return `**Concept Map Analysis:**\n\n**Core Concepts:**\n${generateCoreConcepts(context)}\n\n**Relationships:**\n${generateConceptRelationships(context)}\n\n**Hierarchical Structure:**\n${generateConceptHierarchy(context)}\n\n**Cross-Connections:**\n${generateCrossConnections(context)}\n\n**Key Insights:**\n${generateConceptInsights(context)}`;
}

// Helper functions for generating contextual content
function generateConceptFunction(context: string): string {
  const functions = ['a bridging mechanism', 'a foundational principle', 'an organizing framework', 'a critical junction point'];
  return functions[Math.floor(Math.random() * functions.length)];
}

function generateRelatedConcepts(context: string): string {
  const concepts = ['the underlying theoretical structure', 'practical applications', 'related methodological approaches'];
  return concepts[Math.floor(Math.random() * concepts.length)];
}

function generateProgressiveBuilding(context: string): string {
  const patterns = ['introducing supporting evidence', 'expanding the conceptual framework', 'providing contextual examples'];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

function generateSystemicRelation(context: string): string {
  const relations = ['multiple elements interact dynamically', 'hierarchical relationships create meaning', 'feedback loops reinforce key ideas'];
  return relations[Math.floor(Math.random() * relations.length)];
}

function generateInsightfulConnection(context: string, query: string): string {
  const connections = ['there\'s a nuanced relationship between theory and practice', 'the author builds a sophisticated argument structure', 'multiple perspectives converge on this point'];
  return connections[Math.floor(Math.random() * connections.length)];
}

function generateAuthorApproach(context: string): string {
  const approaches = ['systematic evidence presentation', 'comparative analysis', 'building from foundational principles'];
  return approaches[Math.floor(Math.random() * approaches.length)];
}

function generateBroaderTheme(context: string): string {
  const themes = ['knowledge integration', 'practical application', 'theoretical advancement'];
  return themes[Math.floor(Math.random() * themes.length)];
}

function generateKeyRelationship(context: string): string {
  const relationships = ['theoretical frameworks', 'empirical evidence', 'conceptual models'];
  return relationships[Math.floor(Math.random() * relationships.length)];
}

function generateSecondaryElement(context: string): string {
  const elements = ['practical implementations', 'supporting examples', 'methodological considerations'];
  return elements[Math.floor(Math.random() * elements.length)];
}

function generateSignificance(context: string): string {
  const significances = ['it demonstrates the practical relevance of theoretical concepts', 'it bridges different areas of understanding', 'it provides foundation for subsequent analysis'];
  return significances[Math.floor(Math.random() * significances.length)];
}

function generateArgumentStructure(context: string): string {
  const structures = ['layering evidence systematically', 'presenting contrasting viewpoints', 'building from specific to general'];
  return structures[Math.floor(Math.random() * structures.length)];
}

function generateEvidenceSupport(context: string): string {
  const supports = ['the theoretical framework has practical validity', 'multiple approaches converge on similar conclusions', 'the methodology produces consistent results'];
  return supports[Math.floor(Math.random() * supports.length)];
}

function extractKeyPoints(context: string): string[] {
  // Simulate extracting key points from context
  return [
    'The author establishes the foundational framework for understanding the topic',
    'Multiple perspectives are presented to provide comprehensive coverage',
    'Evidence is systematically organized to support the central thesis',
    'Practical applications demonstrate the relevance of theoretical concepts'
  ];
}

function generateMainTakeaway(context: string): string {
  return 'This section establishes critical foundational knowledge that enables deeper understanding of subsequent material.';
}

function generateCoreMessage(context: string): string {
  return 'This section develops a comprehensive framework for understanding the complex relationships between key concepts.';
}

function generateMethodology(context: string): string {
  const methods = ['systematic analysis', 'comparative examination', 'evidence-based reasoning'];
  return methods[Math.floor(Math.random() * methods.length)];
}

function generateEvidenceType(context: string): string {
  const types = ['empirical examples', 'theoretical justification', 'practical demonstrations'];
  return types[Math.floor(Math.random() * types.length)];
}

function generateImportance(context: string): string {
  return 'it establishes the conceptual foundation necessary for understanding more advanced topics';
}

function generateIntroductoryStatement(context: string): string {
  return 'This section introduces fundamental concepts that serve as building blocks for the broader theoretical framework.';
}

function generateKeyArguments(context: string): string {
  return 'The author presents multiple interconnected arguments that demonstrate the complexity and significance of the topic, using both theoretical and practical perspectives.';
}

function generateEvidenceExamples(context: string): string {
  return 'The text provides carefully selected examples that illustrate key principles and demonstrate how theoretical concepts apply in practice.';
}

function generateImplications(context: string): string {
  return 'These ideas have far-reaching implications for understanding related concepts and suggest important directions for future exploration.';
}

function generateConclusionStatement(context: string): string {
  return 'The section successfully establishes a solid foundation that enables readers to engage with more advanced material and develop deeper insights.';
}

function extractMainConcepts(context: string): string[] {
  // Simulate concept extraction
  return ['Primary theoretical framework', 'Supporting methodologies', 'Practical applications'];
}

function generateCoreConcepts(context: string): string {
  return '• Primary Framework: The main theoretical structure\n• Supporting Elements: Key contributing factors\n• Application Context: Practical implementation areas';
}

function generateConceptRelationships(context: string): string {
  return '• Framework → Elements: Hierarchical dependency\n• Elements ↔ Applications: Bidirectional influence\n• Applications → Framework: Feedback reinforcement';
}

function generateConceptHierarchy(context: string): string {
  return '1. **Foundational Level**: Core principles and definitions\n2. **Developmental Level**: Extensions and applications\n3. **Integration Level**: Synthesis and implications';
}

function generateCrossConnections(context: string): string {
  return '• Theoretical concepts connect to practical examples\n• Different perspectives reinforce central themes\n• Historical context illuminates current applications';
}

function generateConceptInsights(context: string): string {
  return 'The conceptual structure reveals how individual ideas work together to create a comprehensive understanding that is greater than the sum of its parts.';
}

function extractReferences(context: string, type: string): Reference[] {
  const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 30);
  const relevantSentences = sentences.slice(0, Math.min(3, sentences.length));

  return relevantSentences.map((s, idx) => ({
    text: s.trim().substring(0, 220) + (s.length > 220 ? '...' : ''),
    position: context.indexOf(s),
    confidence: 0.4 + 0.2 * idx
  }));
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}