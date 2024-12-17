import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
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

const extractTextFromDOCX = async (file: File): Promise<string> => {
  console.log('Starting DOCX extraction for file:', file.name);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log('DOCX text extraction completed');
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw error;
  }
};

const standardizePhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it starts with 44, remove it
  if (cleaned.startsWith('44')) {
    cleaned = cleaned.substring(2);
  }
  
  // If it starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Verify we have exactly 10 digits for UK mobile numbers
  return cleaned.length === 10 ? cleaned : '';
};

const phoneNumberPatterns = [
  /0[0-9]{10}/g,                   // 11 digits starting with 0
  /07[0-9]{9}/g,                   // UK mobile specific
  /\+447[0-9]{9}/g,               // International format
  /00447[0-9]{9}/g,               // Alternative international
  /[0-9]{11}/g,                   // Any 11 digits
  /07[0-9]\d\s?\d{3}\s?\d{3}/g,   // Spaced format
  /\b\d{11}\b/g,                  // Word boundary 11 digits
  /\b\d{10}\b/g,                  // Word boundary 10 digits
  /[0-9+\s()-]{10,14}/g,          // Various separators
  /(?:\+44|0044|0)7\d{9}/g        // Various UK prefixes
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

export const extractDataFromFile = async (file: File): Promise<ExtractedData | null> => {
  console.log('Processing file:', file.name, 'type:', file.type);
  
  try {
    let text = '';
    
    if (file.type === 'application/pdf') {
      initializeWorker();
      text = await extractTextFromPDF(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      text = await extractTextFromDOCX(file);
    } else {
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

const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const isValidName = (name: string): boolean => {
  // Check if the string contains only letters and basic name characters
  const namePattern = /^[A-Za-z\s'-]+$/;
  
  // Name should be at least 2 characters long and match the pattern
  return name.length >= 2 && namePattern.test(name);
};

const extractDataFromText = (text: string): ExtractedData => {
  console.log('Extracting data from text:', text.substring(0, 100) + '...');
  
  // Split text into words and filter out empty strings
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
  // Find first valid name
  let firstName = '';
  let surname = '';
  
  for (let i = 0; i < words.length - 1; i++) {
    if (isValidName(words[i]) && isValidName(words[i + 1])) {
      firstName = capitalizeFirstLetter(words[i]);
      surname = capitalizeFirstLetter(words[i + 1]);
      break;
    }
  }
  
  const phoneNumber = extractPhoneNumber(text);
  
  return {
    firstName,
    surname,
    phoneNumber,
    fileName: '', // This will be set by the caller
    rawText: text
  };
};
