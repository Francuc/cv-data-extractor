import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedData } from '@/types/data';

// Configure PDF.js worker
const initializeWorker = () => {
  try {
    // Use a local worker file instead of CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
    console.log('PDF.js worker initialized successfully');
  } catch (error) {
    console.error('Error initializing PDF.js worker:', error);
  }
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log('Starting PDF extraction for file:', file.name);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF loaded successfully, number of pages:', pdf.numPages);

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    console.log('Text extraction completed');
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
};

const standardizePhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle +44 prefix
  if (cleaned.startsWith('44')) {
    cleaned = cleaned.substring(2);
  }
  
  // Handle 0 prefix
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Validate that it starts with 7 and has exactly 10 digits
  if (cleaned.startsWith('7') && cleaned.length === 10) {
    return cleaned;
  }
  
  return '';
};

const extractDataFromText = (text: string): ExtractedData => {
  console.log('Extracting data from text:', text.substring(0, 100) + '...');
  
  // Simple extraction logic for name (can be enhanced)
  const words = text.split(/\s+/);
  const firstName = words[0] || '';
  const surname = words[1] || '';
  
  // Enhanced phone number extraction with various formats
  const phoneRegex = /(?:(?:\+44|0044|\(0\)|0)?\s*)?(?:7\d{3}|\(?07\d{3}\)?)\s*\d{3}\s*\d{3}/g;
  const phoneMatches = text.match(phoneRegex);
  
  let phoneNumber = '';
  if (phoneMatches) {
    console.log('Found phone matches:', phoneMatches);
    // Try each match until we find a valid one
    for (const match of phoneMatches) {
      const standardized = standardizePhoneNumber(match);
      if (standardized) {
        phoneNumber = standardized;
        break;
      }
    }
  }
  
  console.log('Extracted phone number:', phoneNumber);
  
  return {
    firstName,
    surname,
    phoneNumber,
    fileName: '' // This will be set by the caller
  };
};

export const extractDataFromFile = async (file: File): Promise<ExtractedData | null> => {
  console.log('Processing file:', file.name, 'type:', file.type);
  
  try {
    initializeWorker();
    
    let text = '';
    if (file.type === 'application/pdf') {
      text = await extractTextFromPDF(file);
    } else {
      // Handle other file types if needed
      console.warn('Unsupported file type:', file.type);
      return null;
    }

    if (!text) {
      console.warn('No text extracted from file');
      return null;
    }

    const extractedData = extractDataFromText(text);
    console.log('Extracted data:', extractedData);
    return extractedData;
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};
