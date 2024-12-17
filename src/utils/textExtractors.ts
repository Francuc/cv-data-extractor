import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

const initializeWorker = () => {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  } catch (error) {
    console.error('Error initializing PDF.js worker:', error);
  }
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
};

export const extractTextFromDOCX = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw error;
  }
};

export const extractTextFromTXT = async (file: File): Promise<string> => {
  try {
    const text = await file.text();
    return text;
  } catch (error) {
    console.error('Error extracting text from TXT:', error);
    throw error;
  }
};

export const extractTextFromRTF = async (file: File): Promise<string> => {
  try {
    const text = await file.text();
    // Enhanced RTF cleaning regex patterns
    const cleanedText = text
      .replace(/[{\\\}]|[^}]*?}/g, '')
      .replace(/\\[a-z]+[-]?[0-9]*/g, '')
      .replace(/\\u[0-9]+\?/g, '')
      .replace(/\\'[0-9a-f]{2}/g, '')
      .replace(/\\/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleanedText;
  } catch (error) {
    console.error('Error extracting text from RTF:', error);
    throw error;
  }
};