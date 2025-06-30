/**
 * Call Google Gemini Flash 2.5 (or any model name you pass) and return plain text.
 * If the environment variable is missing the function will throw – callers should
 * catch and fallback to offline mock.
 */
export async function callGemini(
  prompt: string,
  context: string = '',
  {
    model = 'gemini-2.5-flash', // change to the exact 2.5-flash model string when GA
    temperature = 0.7,
    maxOutputTokens = 1024
  }: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
 * Call Google Gemini with audio input directly
 * Converts audio blob to base64 and sends to Gemini for processing
 */
export async function callGeminiWithAudio(
  audioBlob: Blob,
  context: string = '',
  {
    model = 'gemini-2.5-flash',
    temperature = 0.7,
    maxOutputTokens = 1024
  }: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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