import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { DocumentMetadata } from '../../types';

type ParsedPdf = {
  content: string;
  metadata: DocumentMetadata;
};

export async function parsePdfContent(fileData: ArrayBuffer, fileName: string): Promise<ParsedPdf> {
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

  const loadingTask = pdfjsLib.getDocument({ data: fileData });
  const pdf = await loadingTask.promise;

  const pageOffsets: number[] = [0];
  const parts: string[] = [];
  let runningLength = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map(item =>
        (item as { str?: string }).str?.replace(/\s+/g, ' ').trim() ?? ''
      )
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const normalized = pageText ? `${pageText}\n\n` : '';
    parts.push(normalized);
    runningLength += normalized.length;
    pageOffsets.push(runningLength);
  }

  const content = parts.join('').trim();

  const metadata: DocumentMetadata = {
    totalPages: pdf.numPages,
    pageOffsets,
    subject: undefined,
    keywords: undefined,
    author: undefined,
    creationDate: undefined,
    language: undefined
  };

  if (!content) {
    const placeholder = `# ${fileName}\n\n[PDF loaded with ${pdf.numPages} pages. Text extraction produced no readable output.]`;
    return {
      content: placeholder,
      metadata
    };
  }

  return {
    content,
    metadata
  };
}

