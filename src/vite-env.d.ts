/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_ELEVENLABS_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string; // default to gemini-2.5-flash
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}