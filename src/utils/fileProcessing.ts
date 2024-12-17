import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { ExtractedData } from '@/types/data';

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

const extractTextFromPDF = async (file: File): Promise<string> => {
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

const extractTextFromDOCX = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw error;
  }
};

const extractTextFromTXT = async (file: File): Promise<string> => {
  try {
    const text = await file.text();
    return text;
  } catch (error) {
    console.error('Error extracting text from TXT:', error);
    throw error;
  }
};

const extractTextFromRTF = async (file: File): Promise<string> => {
  try {
    const text = await file.text();
    // Remove RTF formatting tags using regex
    return text.replace(/[{\\\}]|[^}]*?}/g, '')
               .replace(/\\[a-z]+/g, '')
               .replace(/\\\d+/g, '')
               .trim();
  } catch (error) {
    console.error('Error extracting text from RTF:', error);
    throw error;
  }
};

const standardizePhoneNumber = (phoneNumber: string): string => {
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('44')) {
    cleaned = cleaned.substring(2);
  }
  
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned.length === 10 ? cleaned : '';
};

const phoneNumberPatterns = [
  /0[0-9]{10}/g,
  /07[0-9]{9}/g,
  /\+447[0-9]{9}/g,
  /00447[0-9]{9}/g,
  /[0-9]{11}/g,
  /07[0-9]\d\s?\d{3}\s?\d{3}/g,
  /\b\d{11}\b/g,
  /\b\d{10}\b/g,
  /[0-9+\s()-]{10,14}/g,
  /(?:\+44|0044|0)7\d{9}/g
];

const extractPhoneNumber = (text: string): string => {
  for (const pattern of phoneNumberPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const standardized = standardizePhoneNumber(match);
        if (standardized) {
          return standardized;
        }
      }
    }
  }
  return '';
};

const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const isValidName = (name: string): boolean => {
  const namePattern = /^[A-Za-z\s'-]+$/;
  return name.length >= 2 && namePattern.test(name);
};

const extractDataFromText = (text: string): ExtractedData => {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
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
    fileName: '',
    rawText: text
  };
};

export const extractDataFromFile = async (file: File): Promise<ExtractedData | null> => {
  try {
    let text = '';
    
    // Check both file.type and file extension for RTF files
    const isRTF = file.type === 'application/rtf' || 
                  file.type === 'text/rtf' ||
                  file.name.toLowerCase().endsWith('.rtf');
    
    if (file.type === 'application/pdf') {
      initializeWorker();
      text = await extractTextFromPDF(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      text = await extractTextFromDOCX(file);
    } else if (file.type === 'text/plain') {
      text = await extractTextFromTXT(file);
    } else if (isRTF) {
      text = await extractTextFromRTF(file);
    } else {
      console.warn('Unsupported file type:', file.type);
      return null;
    }

    if (!text) {
      console.warn('No text extracted from file');
      return null;
    }

    const extractedData = extractDataFromText(text);
    return extractedData;
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};
