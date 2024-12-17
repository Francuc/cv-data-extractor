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
    // Enhanced RTF cleaning regex patterns
    const cleanedText = text
      // Remove RTF headers and control words
      .replace(/[{\\\}]|[^}]*?}/g, '')
      // Remove control sequences
      .replace(/\\[a-z]+[-]?[0-9]*/g, '')
      // Remove Unicode characters
      .replace(/\\u[0-9]+\?/g, '')
      // Remove special characters
      .replace(/\\'[0-9a-f]{2}/g, '')
      // Remove remaining backslashes
      .replace(/\\/g, '')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleanedText;
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
  // Basic UK mobile formats
  /0[0-9]{10}/g,
  /07[0-9]{9}/g,
  /\+447[0-9]{9}/g,
  /00447[0-9]{9}/g,
  /[0-9]{11}/g,
  /07[0-9]\d\s?\d{3}\s?\d{3}/g,
  /\b\d{11}\b/g,
  /\b\d{10}\b/g,
  /[0-9+\s()-]{10,14}/g,
  /(?:\+44|0044|0)7\d{9}/g,
  
  // Additional patterns with various separators
  /(\+44|0044|0)[-\s]?7\d{3}[-\s]?\d{3}[-\s]?\d{3}/g,
  /(\+44|0044|0)[-\s]?7\d{3}[-\s]?\d{6}/g,
  /07\d{3}[-\s]?\d{6}/g,
  /(\+44|0044|0)[-\s]?7\d{9}/g,
  /\(?07\d{3}\)?[-\s]?\d{3}[-\s]?\d{3}/g,
  
  // International format variations
  /\+44[-\s]?[1-9]\d{2}[-\s]?\d{3}[-\s]?\d{4}/g,
  /\+44[-\s]?[1-9]\d{1}[-\s]?\d{3}[-\s]?\d{4}/g,
  /00\s?44\s?[1-9]\d{2}\s?\d{3}\s?\d{4}/g,
  
  // Landline formats
  /0[1-9]\d{2}[-\s]?\d{3}[-\s]?\d{4}/g,
  /0[1-9]\d{1}[-\s]?\d{3}[-\s]?\d{4}/g,
  
  // Formats with parentheses
  /\(\+44\)[-\s]?7\d{3}[-\s]?\d{3}[-\s]?\d{3}/g,
  /\(0\d{3}\)[-\s]?\d{3}[-\s]?\d{4}/g,
  /\(0\d{4}\)[-\s]?\d{5,6}/g,
  
  // Formats with dots
  /07\d{3}\.?\d{3}\.?\d{3}/g,
  /\+44\.7\d{3}\.?\d{3}\.?\d{3}/g,
  
  // Mobile formats with various groupings
  /07\d{2}\s?\d{2}\s?\d{2}\s?\d{3}/g,
  /07\d{2}\s?\d{3}\s?\d{4}/g,
  /07\d\s?\d{4}\s?\d{4}/g,
  
  // Formats with dashes
  /07\d{3}-\d{3}-\d{3}/g,
  /\+44-7\d{3}-\d{3}-\d{3}/g,
  /0044-7\d{3}-\d{3}-\d{3}/g,
  
  // Mixed separator formats
  /07\d{3}[.-]\d{3}[.-]\d{3}/g,
  /\+44[-\s]?7\d{3}[.-]\d{3}[.-]\d{3}/g,
  
  // Extended international formats
  /\+44\s?\(0\)\s?7\d{3}\s?\d{3}\s?\d{3}/g,
  /44\s?0?\s?7\d{3}\s?\d{3}\s?\d{3}/g,
  
  // Additional variations
  /\(?0\d{4}\)?\s?\d{5,6}/g,
  /\(?0\d{3}\)?\s?\d{3}\s?\d{4}/g,
  /\(?0\d{2}\)?\s?\d{4}\s?\d{4}/g,
  /\(?0\d{2}\)?\s?\d{3}\s?\d{5}/g,
  
  // Complex formats with optional components
  /(?:\+[\d]{1,3}|0)(?:[\s-]?\d{1,4}){3,5}/g,
  /(?:\+44|44|0)(?:[\s-]?\d{1,4}){3,5}/g,
  
  // Formats with optional area codes
  /(?:\+44\s?)?(?:\(0\)\s?)?\d{2,5}(?:[\s-]\d{1,4}){2,3}/g,
  
  // Additional mobile patterns
  /(?:(?:\+|00)44|0)7(?:[1-4]\d\d|5(?:0[0-8]|[13-9]\d|2[0-35-9])|624|7(?:[45]\d\d|624)|8(?:[45]\d\d|624)|9(?:[45]\d\d|624))\d{6}/g,
  /(?:(?:\+|00)44|0)7\d{9}/g,
  
  // Formats with optional country code and spaces
  /(?:\+44|0044|0)\s*7\d{3}\s*\d{6}/g,
  /(?:\+44|0044|0)\s*7\d{3}\s*\d{3}\s*\d{3}/g,
  
  // Additional variations with optional components
  /(?:\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}/g,
  /(?:\+44\s?|0)(?:7(?:[1-4]\d\d|5(?:0[0-8]|[13-9]\d|2[0-35-9])|624|7(?:[45]\d\d|624)|8(?:[45]\d\d|624)|9(?:[45]\d\d|624)))\s?\d{3}\s?\d{3}/g,
  
  // Catch-all patterns (use with caution)
  /(?:\+44|0044|0)?[ -]?\d{2,5}[ -]?\d{2,5}[ -]?\d{2,5}/g,
  /\d{3}[-\s]?\d{3,4}[-\s]?\d{4}/g
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

const extractNameFromFileName = (fileName: string): { firstName: string; surname: string } | null => {
  // Remove file extension
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
  
  // Split by common separators
  const parts = nameWithoutExtension.split(/[-_\s]+/);
  
  if (parts.length >= 2) {
    // Capitalize first letter of each part
    const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const surname = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    
    if (isValidName(firstName) && isValidName(surname)) {
      return { firstName, surname };
    }
  }
  
  return null;
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
    
    // Try to extract names from filename if no names were found in content
    if (!extractedData.firstName || !extractedData.surname) {
      const namesFromFileName = extractNameFromFileName(file.name);
      if (namesFromFileName) {
        extractedData.firstName = namesFromFileName.firstName;
        extractedData.surname = namesFromFileName.surname;
      }
    }
    
    extractedData.fileName = file.name;
    return extractedData;
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};
