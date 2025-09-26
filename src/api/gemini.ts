/**
 * Call Google Gemini Flash 2.5 (or any model name you pass) and return plain text.
 * If the environment variable is missing the function will throw – callers should
 * catch and fallback to offline mock.
 */
import { config } from '../config/env';
import { logger } from '../lib/logger';

export async function callGemini(
  prompt: string,
  context: string = '',
  options: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY');
  }

  const resolvedModel = options.model || config.geminiModel;
  const temperature = options.temperature ?? 0.7;
  const maxOutputTokens = options.maxOutputTokens ?? 1024;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;

  const userContent = `${context ? `Context:\n${context}\n---\n` : ''}${prompt}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userContent }]
      }
    ],
    generationConfig: {
      temperature,
      top_p: 0.9,
      max_output_tokens: maxOutputTokens
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    logger.error('Gemini API error:', res.status, errorText);
    throw new Error(`Gemini API error: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  // Aggregate all text parts if present
  const parts: string[] = data?.candidates?.[0]?.content?.parts
    ?.map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    ?.filter((t: string) => t && t.trim().length > 0) || [];

  const text = parts.join('\n').trim();

  if (!text) {
    // Bubble up a clearer message with any safety or finish reason
    const finishReason = data?.candidates?.[0]?.finishReason || data?.candidates?.[0]?.safetyRatings?.[0]?.category;
    throw new Error(`Gemini API returned no text${finishReason ? ` (reason: ${finishReason})` : ''}`);
  }

  return text;
} 

/**
 * Call Google Gemini with audio input directly
 * Converts audio blob to base64 and sends to Gemini for processing
 */
export async function callGeminiWithAudio(
  audioBlob: Blob,
  context: string = '',
  options: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY');
  }

  const resolvedModel = options.model || config.geminiModel;
  const temperature = options.temperature ?? 0.7;
  const maxOutputTokens = options.maxOutputTokens ?? 1024;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;

  // Convert audio blob to base64
  const audioBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:audio/webm;base64, prefix
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const contextPrompt = context 
    ? `Context: You are a conversational study buddy. The user has uploaded a document and you have full access to its content. Current context:\n${context}\n\nPlease respond conversationally and concisely based on the user's audio input and the document context.`
    : 'Please respond conversationally and concisely to the user\'s audio input.';

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: contextPrompt },
          {
            inline_data: {
              mime_type: 'audio/webm',
              data: audioBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature,
      top_p: 0.9,
      max_output_tokens: maxOutputTokens
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    logger.error('Gemini Audio API error:', res.status, errorText);
    throw new Error(`Gemini API error: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini API returned no text');
  }

  return text.trim();
}

/**
 * Call ElevenLabs Text-to-Speech API
 * Converts text to speech using ElevenLabs API
 */
export async function callElevenLabsTTS(
  text: string,
  {
    voiceId = 'JBFqnCBsd6RMkjVDRZzb', // Default voice
    modelId = 'eleven_turbo_v2', // Fast model for real-time
    stability = 0.75,
    similarityBoost = 0.75
  }: {
    voiceId?: string;
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
  } = {}
): Promise<ArrayBuffer> {
  const apiKey = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Missing VITE_ELEVENLABS_API_KEY');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const body = {
    text,
    model_id: modelId,
    voice_settings: {
      stability,
      similarity_boost: similarityBoost,
      speaker_boost: true
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ElevenLabs API error: ${res.status} ${errorText}`);
  }

  return await res.arrayBuffer();
} 

/**
 * Call Google Cloud Text-to-Speech via REST.
 * Requires VITE_GOOGLE_TTS_API_KEY. Returns MP3 audio bytes.
 */
/**
 * Call Groq TTS (PlayAI) using OpenAI-compatible endpoint.
 */
export async function callGroqTTS(
  text: string,
  {
    model = 'playai-tts',
    voice = 'Aaliyah-PlayAI',
    responseFormat = 'mp3'
  }: {
    model?: string;
    voice?: string;
    responseFormat?: 'mp3' | 'wav';
  } = {}
): Promise<ArrayBuffer> {
  const apiKey = (import.meta as any).env?.VITE_GROQ_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Missing VITE_GROQ_API_KEY');
  }

  const url = 'https://api.groq.com/openai/v1/audio/speech';
  const body = {
    model,
    voice,
    input: text,
    response_format: responseFormat
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq TTS API error: ${res.status} ${errorText}`);
  }

  return await res.arrayBuffer();
}