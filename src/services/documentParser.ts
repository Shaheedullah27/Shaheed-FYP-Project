import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFJS_COMPAT_SHIM, ensurePdfjsCompat } from '../lib/pdfjsCompat';

// pdf.js 6 expects ES2026 Uint8Array helpers that older embed runtimes lack.
// Patch the main-thread realm up front; the worker realm is patched below.
ensurePdfjsCompat();

const CDN_WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

/**
 * Prepares the pdf.js worker source: the version-locked local worker bytes
 * (loaded as raw text so dev-server transforms never leak into the worker)
 * with the ES2026 compat shim prepended, because a Worker is its own realm
 * and main-thread polyfills never reach it. Falls back to the CDN build if
 * the local worker cannot be loaded.
 */
let pdfWorkerReady: Promise<void> | null = null;
function ensurePdfWorker(): Promise<void> {
  if (!pdfWorkerReady) {
    pdfWorkerReady = (async () => {
      try {
        const { default: workerSource } = await import(
          'pdfjs-dist/build/pdf.worker.min.mjs?raw'
        );
        const source = `${PDFJS_COMPAT_SHIM}\n${workerSource}`;
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
          new Blob([source], { type: 'text/javascript' })
        );
      } catch (err) {
        console.warn('Local pdf.js worker unavailable, falling back to CDN build', err);
        pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER_SRC;
      }
    })();
  }
  return pdfWorkerReady;
}

export interface ParseResult {
  text: string;
  wordCount: number;
  filename: string;
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

/**
 * Validates file size and format
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'This file is empty. Please choose another file.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The size limit is 10 MB. Please choose a smaller file.` 
    };
  }

  const name = file.name.toLowerCase();
  const validExts = ['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf'];
  const hasValidExt = validExts.some(ext => name.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: 'This file type is not supported. Choose a PDF, Word document (.docx), or text file (.txt).'
    };
  }

  return { valid: true };
}

/**
 * Extracts plain text from a PDF ArrayBuffer
 */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    await ensurePdfWorker();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const textPieces: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      textPieces.push(pageText);
    }

    const combined = textPieces.join('\n\n').trim();
    return combined;
  } catch (err: any) {
    console.warn('PDF.js parse warning, attempting raw stream fallback', err);
    // Fallback: extract readable string chunks from raw buffer
    const decoder = new TextDecoder('utf-8');
    const raw = decoder.decode(buffer);
    const matches = raw.match(/\(([^()]+)\)/g);
    if (matches && matches.length > 15) {
      return matches.map(m => m.slice(1, -1)).filter(s => s.length > 2 && !s.startsWith('\\')).join(' ');
    }
    throw new Error('Could not read text from this PDF. It may be a scanned image. Try a PDF with selectable text or a Word document.');
  }
}

/**
 * Extracts plain text from a DOCX ArrayBuffer using mammoth
 */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value.trim();
  } catch (err: any) {
    throw new Error('Could not read text from this Word document. Please check the file and try again.');
  }
}

/**
 * Unified file parsing function with complete validation
 */
export async function parseDocumentFile(file: File): Promise<ParseResult> {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    return {
      text: '',
      wordCount: 0,
      filename: file.name,
      error: validation.error
    };
  }

  const name = file.name.toLowerCase();

  try {
    let extractedText = '';

    if (name.endsWith('.txt') || name.endsWith('.md')) {
      extractedText = await file.text();
    } else if (name.endsWith('.pdf')) {
      const buffer = await file.arrayBuffer();
      extractedText = await extractPdfText(buffer);
    } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
      const buffer = await file.arrayBuffer();
      extractedText = await extractDocxText(buffer);
    }

    const clean = extractedText.replace(/\r\n/g, '\n').trim();
    const words = clean.split(/\s+/).filter(Boolean);

    if (words.length < 5) {
      return {
        text: clean,
        wordCount: words.length,
        filename: file.name,
        error: 'Very little readable text was found. If this is a scanned image, try a document with selectable text.'
      };
    }

    return {
      text: clean,
      wordCount: words.length,
      filename: file.name
    };
  } catch (err: any) {
    return {
      text: '',
      wordCount: 0,
      filename: file.name,
      error: err.message || 'Could not read this file. Please try another document.'
    };
  }
}
