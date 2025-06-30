# AI Study Buddy – Project Plan

## 1. Vision ✅ **ACHIEVED**
Build a personalised, conversational **Study Buddy** that learners can chat with while reading or revising. The Study Buddy should feel like a knowledgeable friend—ready to answer questions, challenge ideas, and guide exploration of any text on-screen. All other functionality (document ingestion, concept maps, voice, etc.) exists solely to enable a seamless, engaging conversation between the learner and their material.

**🎉 The core vision is now fully implemented with multimodal Gemini 2.5 Flash integration!**

## 2. Core Objectives
1. **Conversational AI core** – natural language dialogue that is context-aware (document + session history).
2. **Document grounding** – ingest PDFs/EPUB/Markdown so the buddy can reference the text accurately.
3. **Active learning tools** – prompts for deeper thought: Socratic questions, quizzes, critical-thinking nudges.
4. **Multi-modal delivery** – text, voice synthesis, and visual concept maps to suit diverse study styles.
5. **Reader ergonomics** – font/spacing controls, progress tracking, night mode, keyboard shortcuts.
6. **Low-friction UX** – drag-and-drop upload, instant answer latency, offline cache where possible.

## 3. High-Level Feature Breakdown
| Epic | Features | Status |
|------|----------|--------|
| Document Handling | • Drag-and-drop upload<br>• Chunked parsing & text extraction<br>• Progressive loading & processing bar | ✅ Basic PDF flow implemented (`useDocumentProcessor`)
| Reader UX | • Font size / line-height / column width controls<br>• Reading progress bar<br>• Chapter navigation<br>• Selection context menu | ⚙️ In progress (`EnhancedDocumentReader`)
| AI Assistant | • Full conversational interface<br>• 1M token document context<br>• Multimodal capabilities<br>• Screen-aware responses | ✅ Complete Study Buddy (`useConversationalAI` + `ConversationalChat`)
| Knowledge Visualisation | • Concept map rendering<br>• Hover definitions / term links | ⚙️ MVP complete (`ConceptMapViewer`)
| Audio | • Voice-to-voice conversations<br>• Hotkey-triggered speech input<br>• Screen-aware voice responses<br>• Hands-free learning experience | ✅ Complete voice conversation system (`useVoiceConversation` + hotkeys)
| Critical-Thinking Toolkit | • AI-generated Socratic questions<br>• Alternative perspectives<br>• Critical thinking prompts | ✅ Smart questioning integrated (`generateSocraticQuestions`)

## 4. Technical Stack
- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **State & data fetching:** React-Query (TBD) + built-in hooks
- **LLM provider:** Google Gemini (alpha) → abstracted in `src/api/gemini.ts`
- **PDF parsing:** `pdfjs-dist`
- **Speech synthesis:** Web Speech API wrapper (`useVoiceSynthesis`)
- **Iconography:** Lucide

## 5. Directory Overview (selected)
```
src/
  api/gemini.ts            → LLM wrapper
  hooks/                   → Reusable logic (AI, TTS, documents)
  components/
    EnhancedDocumentReader → Main reading interface
    EnhancedAIPanel        → Chat & analysis side pane
    ConceptMapViewer       → Visual graph of concepts
```

## 6. Milestones & Timeline (T-0 = today)
| # | Deliverable | Owner | ETA |
|---|-------------|-------|-----|
| 1 | Solidify UI/UX wireframes | Design | T-0 + 2 days |
| 2 | Robust document parser (PDF & Markdown) | Dev | T-0 + 5 days |
| 3 | Reader controls & selection menu | Dev | T-0 + 7 days |
| 4 | Gemini integration & prompt engineering | AI | T-0 + 9 days |
| 5 | Concept map MVP | Dev | T-0 + 11 days |
| 6 | Socratic dialog & critical-thinking module | AI | T-0 + 14 days |
| 7 | Voice synthesis polish (settings UI) | Dev | T-0 + 16 days |
| 8 | End-to-end usability test & bug-fix pass | All | T-0 + 18 days |
| 9 | Public beta release | PM | T-0 + 21 days |

## 7. Stretch Goals
- EPUB support
- Notebook (highlight + notes) synced to local storage / cloud
- Real-time collaborative reading sessions
- Offline service-worker caching

## 8. Definition of Done
1. User can upload a PDF and immediately start reading.
2. Selecting passage opens context menu with "Ask AI".
3. AI assistant returns answers, references, concept map, and critical-thinking prompts.
4. Voice synthesis can read current selection or entire chapter.
5. All core flows covered by automated integration tests.

## 9. Contribution Guidelines
- Follow conventional commits (`feat:`, `fix:`, `docs:` …).
- Keep components small and typed – prefer hooks for shared logic.
- Run `npm run lint && npm run test` before pushing.
- Document any public hook or component with JSDoc + example.

---
*Last updated: <!-- CURSOR_INSERT_DATE -->* 