import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedData } from '@/types/data';

// Configure PDF.js worker
const initializeWorker = () => {
  try {
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

const phoneNumberPatterns = [
  // Standard UK mobile format with optional prefixes
  /(?:(?:\+44|0044|\(0\)|0)?\s*)?(?:7\d{3}|\(?07\d{3}\)?)\s*\d{3}\s*\d{3}/g,
  // Simple 11-digit format starting with 0
  /0\d{10}/g,
  // Any 10 consecutive digits starting with 7
  /7\d{9}/g,
  // Numbers with various separators
  /[0-9+\s()-]{10,14}/g,
  // More specific UK mobile patterns
  /(?:\+44|0044|0)7\d{9}/g,
  /(?:07|\+447|\(\+44\)7)\d{9}/g,
  // Looser patterns
  /\b\d{11}\b/g,
  /\b\d{10}\b/g,
  /(?:\+\d{2}|0)?\s*7\d{9}/g,
  /[0-9]{10,11}/g
];

const extractPhoneNumber = (text: string): string => {
  console.log('Attempting to extract phone number with multiple patterns');
  
  for (const pattern of phoneNumberPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      console.log('Found matches with pattern:', pattern, matches);
      
      for (const match of matches) {
        const standardized = standardizePhoneNumber(match);
        if (standardized) {
          console.log('Successfully extracted phone number:', standardized);
          return standardized;
        }
      }
    }
  }
  
  console.log('No valid phone number found after trying all patterns');
  return '';
};

const extractDataFromText = (text: string): ExtractedData => {
  console.log('Extracting data from text:', text.substring(0, 100) + '...');
  
  // Simple extraction logic for name (can be enhanced)
  const words = text.split(/\s+/);
  const firstName = words[0] || '';
  const surname = words[1] || '';
  
  const phoneNumber = extractPhoneNumber(text);
  
  return {
    firstName,
    surname,
    phoneNumber,
    fileName: '', // This will be set by the caller
    rawText: text // Store the raw text for later re-extraction
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