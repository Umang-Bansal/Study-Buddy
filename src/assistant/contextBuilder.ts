import { Document, Reference } from '../types';

type ContextBuilderOptions = {
  document?: Document;
  selectedText?: string;
  currentPage?: number;
  extraContext?: string;
  references?: Reference[];
  useExtendedContext?: boolean;
};

type VisibleSectionOptions = {
  radiusPages: number;
  maxChars: number;
};

type ChapterSliceOptions = {
  maxChars: number;
};

export function buildAssistantContext(opts: ContextBuilderOptions): string {
  const {
    document,
    selectedText,
    currentPage,
    extraContext,
    references,
    useExtendedContext = false
  } = opts;

  const segments: string[] = [];

  if (document) {
    segments.push(`DOCUMENT: "${document.title}"`);
    if (document.metadata?.subject) {
      segments.push(`SUBJECT: ${document.metadata.subject}`);
    }
    if (document.metadata?.keywords?.length) {
      segments.push(`KEYWORDS: ${document.metadata.keywords.slice(0, 6).join(', ')}`);
    }
    if (document.summary?.gist) {
      segments.push(`DOCUMENT GIST:\n${trimText(document.summary.gist, 600)}`);
    }
    if (typeof currentPage === 'number') {
      segments.push(`CURRENT PAGE: ${currentPage}`);
    }
  }

  const visibleContext = document
    ? extractVisibleContext(document, currentPage, { radiusPages: 1, maxChars: 900 })
    : undefined;
  if (visibleContext) {
    segments.push(`VISIBLE CONTEXT:\n${visibleContext}`);
  }

  if (selectedText?.trim()) {
    segments.push(`FOCUSED TEXT:\n"${selectedText.trim()}"`);
  }

  const chapterContext = document
    ? extractChapterSlice(document, currentPage, { maxChars: useExtendedContext ? 1400 : 600 })
    : undefined;
  if (chapterContext) {
    segments.push(`CHAPTER CONTEXT:\n${chapterContext}`);
  }

  if (useExtendedContext && document) {
    const summaries = document.summary?.sections
      ?.map(section => `• ${section.title}: ${trimText(section.synopsis, 160)}`)
      .join('\n');
    if (summaries) {
      segments.push(`CHAPTER SUMMARIES:\n${summaries}`);
    } else if (document.content) {
      segments.push(`DOCUMENT PREVIEW:\n${trimText(document.content, 2000)}`);
    }
  }

  if (references?.length) {
    const referenceBlock = references
      .slice(0, 3)
      .map((ref, index) => `${index + 1}. ${ref.text}`)
      .join('\n');
    segments.push(`REFERENCES:\n${referenceBlock}`);
  }

  if (extraContext?.trim()) {
    segments.push(`ADDITIONAL CONTEXT:\n${extraContext.trim()}`);
  }

  return segments.join('\n\n').trim();
}

function extractVisibleContext(
  document: Document,
  currentPage: number | undefined,
  options: VisibleSectionOptions
): string | undefined {
  if (!document.content) {
    return document.summary?.gist ? trimText(document.summary.gist, options.maxChars) : undefined;
  }

  if (document.type === 'pdf' && document.metadata?.pageOffsets?.length) {
    const availablePages = document.metadata.pageOffsets.length - 1;
    if (availablePages > 0) {
      const targetPage = clampPage(currentPage ?? 1, availablePages);
      const startPage = Math.max(1, targetPage - options.radiusPages);
      const endPage = Math.min(availablePages, targetPage + options.radiusPages);
      const pdfSlice = extractPdfRange(document, startPage, endPage, options.maxChars);
      if (pdfSlice) {
        return pdfSlice;
      }
    }
  }

  if (currentPage == null) {
    return trimText(document.content, options.maxChars);
  }

  const chapter = matchChapterByPage(document, currentPage);
  if (!chapter) {
    return trimText(document.content, options.maxChars);
  }

  const windowStart = Math.max(0, chapter.startPosition);
  const windowEnd = Math.min(document.content.length, chapter.endPosition);
  return trimText(document.content.slice(windowStart, windowEnd), options.maxChars);
}

function extractChapterSlice(
  document: Document,
  currentPage: number | undefined,
  options: ChapterSliceOptions
): string | undefined {
  if (!document.content) {
    const chapterSummary = findChapterSummary(document, currentPage);
    return chapterSummary ? trimText(chapterSummary, options.maxChars) : undefined;
  }

  if (document.type === 'pdf' && document.metadata?.pageOffsets?.length) {
    const availablePages = document.metadata.pageOffsets.length - 1;
    if (availablePages > 0) {
      const targetPage = clampPage(currentPage ?? 1, availablePages);
      const pdfSlice = extractPdfRange(document, targetPage, Math.min(availablePages, targetPage + 1), options.maxChars);
      if (pdfSlice) {
        return pdfSlice;
      }
    }
    const chapterSummary = findChapterSummary(document, currentPage);
    return chapterSummary ? trimText(chapterSummary, options.maxChars) : undefined;
  }

  const chapter = matchChapterByPage(document, currentPage);
  if (!chapter) {
    return undefined;
  }

  return trimText(
    document.content.slice(chapter.startPosition, chapter.endPosition),
    options.maxChars
  );
}

function matchChapterByPage(document: Document, currentPage?: number) {
  if (!document.chapters.length) {
    return undefined;
  }

  if (currentPage == null) {
    return document.chapters[0];
  }

  return document.chapters.find(chapter => {
    if (chapter.pageStart != null && chapter.pageEnd != null) {
      return currentPage >= chapter.pageStart && currentPage <= chapter.pageEnd;
    }
    if (!document.content || !document.totalPages) {
      return false;
    }
    const approxStartPage = Math.floor(
      (chapter.startPosition / Math.max(1, document.content.length)) * document.totalPages
    );
    const approxEndPage = Math.ceil(
      (chapter.endPosition / Math.max(1, document.content.length)) * document.totalPages
    );
    return currentPage >= approxStartPage && currentPage <= approxEndPage;
  });
}

function findChapterSummary(document: Document, currentPage: number | undefined): string | undefined {
  if (!document.summary?.sections?.length) {
    return undefined;
  }

  if (currentPage == null) {
    return document.summary.sections[0]?.synopsis;
  }

  const matchedChapter = matchChapterByPage(document, currentPage);
  if (!matchedChapter) {
    return undefined;
  }

  return document.summary.sections.find(section => section.chapterId === matchedChapter.id)?.synopsis;
}

function trimText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function extractPdfRange(
  document: Document,
  startPage: number,
  endPage: number,
  maxChars: number
): string | undefined {
  if (!document.content || !document.metadata?.pageOffsets?.length) {
    return undefined;
  }

  const pageOffsets = document.metadata.pageOffsets;
  const availablePages = pageOffsets.length - 1;
  if (availablePages <= 0) {
    return undefined;
  }

  const safeStartPage = clampPage(startPage, availablePages);
  const safeEndPage = clampPage(endPage, availablePages);
  if (safeEndPage < safeStartPage) {
    return undefined;
  }

  const startOffset = pageOffsets[safeStartPage - 1] ?? 0;
  const endOffset = pageOffsets[safeEndPage] ?? document.content.length;
  if (endOffset <= startOffset) {
    return undefined;
  }

  return trimText(document.content.slice(startOffset, endOffset), maxChars);
}

function clampPage(page: number, maxPage: number): number {
  if (maxPage <= 0) return 1;
  return Math.min(Math.max(1, Math.floor(page)), maxPage);
}


