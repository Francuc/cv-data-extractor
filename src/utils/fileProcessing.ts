import { ExtractedData } from '@/types/data';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const standardizePhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it starts with 44, remove it
  if (cleaned.startsWith('44')) {
    cleaned = cleaned.substring(2);
  }
  
  // If it starts with 0, keep it as is
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return cleaned;
  }
  
  // If it's a 10-digit number starting with 7, add leading 0
  if (cleaned.startsWith('7') && cleaned.length === 10) {
    return '0' + cleaned;
  }
  
  return cleaned.length >= 10 ? cleaned : '';
};

const phoneNumberPatterns = [
  // UK mobile formats
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

export const extractDataFromFile = (text: string): ExtractedData => {
  // Extract name parts (assuming format "FirstName Surname")
  const nameMatch = text.match(/([A-Za-z]+)\s+([A-Za-z]+)/);
  let firstName = '';
  let surname = '';
  
  if (nameMatch) {
    firstName = capitalizeFirstLetter(nameMatch[1]);
    surname = capitalizeFirstLetter(nameMatch[2]);
  }

  // Extract phone number
  const phoneNumber = extractPhoneNumber(text);

  return {
    firstName,
    surname,
    phoneNumber,
    fileName: '',
    rawText: text
  };
};

export const processFile = async (file: File): Promise<ExtractedData> => {
  try {
    let text = '';
    
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const content = await page.getTextContent();
      text = content.items.map((item: any) => item.str).join(' ');
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else {
      throw new Error('Unsupported file type');
    }

    const extractedData = extractDataFromFile(text);
    extractedData.fileName = file.name;
    
    return extractedData;
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};
