/** Client-side upload checks; the Flask backend repeats every validation. */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_FILE_TYPES = '.pdf,.docx';
const VALID_EXTENSIONS = ['.pdf', '.docx'];

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
  if (!VALID_EXTENSIONS.some(extension => name.endsWith(extension))) {
    return {
      valid: false,
      error: 'This file type is not supported. Choose a PDF or Word document (.docx).',
    };
  }

  return { valid: true };
}
