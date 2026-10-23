/**
 * Lightweight upload validation.
 *
 * Kept free of pdf.js/mammoth imports so the analysis page can validate a
 * file instantly without downloading the document-parsing bundle.
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_FILE_TYPES = '.pdf,.docx,.doc,.txt,.md,.rtf';

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
      error: `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The size limit is 10 MB. Please choose a smaller file.`,
    };
  }

  const name = file.name.toLowerCase();
  const validExts = ['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf'];
  const hasValidExt = validExts.some(ext => name.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: 'This file type is not supported. Choose a PDF, Word document (.docx), or text file (.txt).',
    };
  }

  return { valid: true };
}
