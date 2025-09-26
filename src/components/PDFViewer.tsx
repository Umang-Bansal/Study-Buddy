import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
// Use Vite worker to avoid workerSrc path issues
// @ts-ignore - Vite returns a Worker constructor for ?worker imports
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { Minus, Plus, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker using a dedicated Worker instance
try {
  // @ts-ignore
  const workerInstance: Worker = new PdfWorker();
  // @ts-ignore - pdfjs types may not include workerPort yet
  (pdfjs as any).GlobalWorkerOptions.workerPort = workerInstance;
} catch (e) {
  // Fallback: ignore; onLoadError will surface issues to the UI
}

interface PDFViewerProps {
  documentId: string;
  title?: string;
  fileData?: ArrayBuffer | null;
  fileBlob?: Blob | null;
  onPageChange?: (page: number) => void;
  initialPage?: number;
}

type PersistedState = {
  page: number;
  scale: number;
};

const DEFAULT_SCALE = 1.1;

export function PDFViewer({ documentId, title, fileData, fileBlob, onPageChange, initialPage = 1 }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainersRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(DEFAULT_SCALE);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string>('');
  const [useSvg, setUseSvg] = useState<boolean>(false);

  // Load persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`pdfViewer:${documentId}`);
      if (raw) {
        const parsed: PersistedState = JSON.parse(raw);
        if (parsed.page) setPageNumber(parsed.page);
        if (parsed.scale) setScale(parsed.scale);
      } else {
        setPageNumber(initialPage);
      }
    } catch {}
  }, [documentId, initialPage]);

  // Persist state
  useEffect(() => {
    const state: PersistedState = { page: pageNumber, scale };
    try {
      localStorage.setItem(`pdfViewer:${documentId}`, JSON.stringify(state));
    } catch {}
  }, [documentId, pageNumber, scale]);

  // Notify parent
  useEffect(() => {
    onPageChange?.(pageNumber);
  }, [pageNumber, onPageChange]);

  // Measure container width
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const pdfFile = useMemo(() => {
    if (fileBlob && fileBlob.size > 0) {
      return fileBlob as Blob;
    }
    if (fileData) {
      try {
        if ((fileData as ArrayBuffer).byteLength > 0) {
          // Always wrap in a Blob to avoid detached ArrayBuffer issues on re-mount
          return new Blob([fileData as ArrayBuffer], { type: 'application/pdf' });
        }
      } catch {}
    }
    return undefined;
  }, [fileBlob, fileData]);

  const docOptions = useMemo(() => ({ cMapUrl: undefined, cMapPacked: true }), []);

  const handleLoadSuccess = useCallback((info: { numPages: number }) => {
    setNumPages(info.numPages);
    if (pageNumber < 1 || pageNumber > info.numPages) {
      setPageNumber(1);
    }
  }, [pageNumber]);

  const goPrev = useCallback(() => setPageNumber(p => Math.max(1, p - 1)), []);
  const goNext = useCallback(() => setPageNumber(p => Math.min(numPages, p + 1)), [numPages]);
  const zoomIn = useCallback(() => setScale(s => Math.min(3, parseFloat((s + 0.1).toFixed(2)))), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(0.5, parseFloat((s - 0.1).toFixed(2)))), []);
  const toggleFit = useCallback(() => setFitToWidth(v => !v), []);

  const computedWidth = useMemo(() => {
    if (!containerWidth) return undefined;
    return fitToWidth ? Math.max(320, containerWidth) : undefined;
  }, [containerWidth, fitToWidth]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if ((e.ctrlKey || e.metaKey) && e.key === '+') {
        e.preventDefault();
        zoomIn();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, zoomIn, zoomOut]);

  useEffect(() => {
    if (!numPages) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) {
        const pageAttr = visible.target.getAttribute('data-page-number');
        const nextPage = pageAttr ? Number(pageAttr) : NaN;
        if (!Number.isNaN(nextPage) && nextPage !== pageNumber) {
          setPageNumber(nextPage);
        }
      }
    }, {
      root: null,
      threshold: [0.1, 0.25, 0.5, 0.75]
    });

    observerRef.current = observer;

    pageContainersRef.current.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [numPages, pageNumber]);

  return (
    <div className="w-full" ref={containerRef}>
      {/* Controls */}
      <div className="w-full flex items-center justify-end gap-2 mb-3">
          <button onClick={zoomOut} className="p-2 rounded border text-gray-700 hover:bg-gray-50">
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-2 rounded border text-gray-700 hover:bg-gray-50">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={toggleFit} className="p-2 rounded border text-gray-700 hover:bg-gray-50" title={fitToWidth ? 'Use manual zoom' : 'Fit to width'}>
            {fitToWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setUseSvg(v => !v)} className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-50 text-xs" title="Toggle render mode">
            {useSvg ? 'SVG' : 'Canvas'}
          </button>
      </div>

      {/* Viewer */}
      <div className="w-full bg-white border rounded-lg shadow flex items-center justify-center">
        {pdfFile ? (
          <PdfDocument
            file={pdfFile}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={(err) => setError(err?.message || 'Failed to load PDF')}
            loading={<div className="py-12 text-gray-600">Loading PDF...</div>}
            error={<div className="py-12 text-red-600">{error || 'Failed to load PDF'}</div>}
            options={docOptions}
          >
            <div className="w-full flex flex-col items-center">
              {Array.from({ length: numPages || 0 }, (_, i) => {
                const pageKey = `${i}-${computedWidth ?? 'auto'}-${fitToWidth ? 'fit' : scale}-${useSvg ? 'svg' : 'canvas'}`;
                const pageProps = fitToWidth
                  ? { width: computedWidth }
                  : { scale };
                return (
                  <div
                    key={pageKey}
                    data-page-number={i + 1}
                    ref={(el) => {
                      if (el) {
                        pageContainersRef.current.set(i + 1, el);
                      } else {
                        pageContainersRef.current.delete(i + 1);
                      }
                    }}
                    className="w-full flex items-center justify-center mb-4"
                  >
                    <Page
                      pageNumber={i + 1}
                      renderMode={useSvg ? 'svg' : 'canvas'}
                      canvasBackground="#ffffff"
                      renderAnnotationLayer
                      renderTextLayer
                      {...pageProps}
                    />
                  </div>
                );
              })}
            </div>
          </PdfDocument>
        ) : (
          <div className="py-12 text-gray-600">No PDF data available. Please re-upload the PDF.</div>
        )}
      </div>

      {title && (
        <div className="mt-2 text-xs text-gray-500 text-center truncate" title={title}>
          {title}
        </div>
      )}
    </div>
  );
}


