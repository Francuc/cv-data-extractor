
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
    console.log('Starting PDF text extraction for:', file.name);
    initializeWorker();
    
    const arrayBuffer = await file.arrayBuffer();
    console.log(`PDF size: ${arrayBuffer.byteLength} bytes`);
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    console.log('PDF text extraction completed successfully');
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

export const extractTextFromDOCX = async (file: File): Promise<string> => {
  try {
    console.log('Starting DOCX text extraction for:', file.name);
    const arrayBuffer = await file.arrayBuffer();
    console.log(`DOCX size: ${arrayBuffer.byteLength} bytes`);
    
    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log('DOCX text extraction completed successfully');
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
};

export const extractTextFromTXT = async (file: File): Promise<string> => {
  try {
    console.log('Starting TXT file processing for:', file.name);
    const text = await file.text();
    console.log('TXT file processing completed successfully');
    return text;
  } catch (error) {
    console.error('Error extracting text from TXT:', error);
    throw new Error(`Failed to extract text from TXT: ${error.message}`);
  }
};

export const extractTextFromRTF = async (file: File): Promise<string> => {
  try {
    console.log('Starting RTF text extraction for:', file.name);
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
    
    console.log('RTF text extraction completed successfully');
    return cleanedText;
  } catch (error) {
    console.error('Error extracting text from RTF:', error);
    throw new Error(`Failed to extract text from RTF: ${error.message}`);
  }
};
