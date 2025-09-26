export type AppConfig = {
  geminiApiKey?: string;
  elevenLabsApiKey?: string;
  googleTtsApiKey?: string;
  geminiModel: string;
  isDev: boolean;
};

function readConfig(): AppConfig {
  const env = (import.meta as any).env as Record<string, string | boolean | undefined>;

  return {
    geminiApiKey: (env?.VITE_GEMINI_API_KEY as string | undefined)
      || (env?.VITE_GOOGLE_AI_API_KEY as string | undefined)
      || undefined,
    elevenLabsApiKey: (env?.VITE_ELEVENLABS_API_KEY as string | undefined) || undefined,
    googleTtsApiKey: (env?.VITE_GOOGLE_TTS_API_KEY as string | undefined) || undefined,
    geminiModel: (env?.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.5-flash',
    isDev: !!env?.DEV
  };
}

export const config: AppConfig = readConfig();


