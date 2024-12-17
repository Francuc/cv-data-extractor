import { ExtractedData } from '@/types/data';
import { extractPhoneNumber } from './phoneNumberUtils';
import { extractNamesFromFileName, extractNamesFromText } from './nameUtils';
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  extractTextFromRTF
} from './textExtractors';

export const extractDataFromFile = async (file: File): Promise<ExtractedData | null> => {
  try {
    let text = '';
    
    // Check both file.type and file extension for RTF files
    const isRTF = file.type === 'application/rtf' || 
                  file.type === 'text/rtf' ||
                  file.name.toLowerCase().endsWith('.rtf');
    
    if (file.type === 'application/pdf') {
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

    // First try to extract names from filename
    let names = extractNamesFromFileName(file.name);
    
    // If no valid names found in filename, try extracting from content
    if (!names || (!names.firstName && !names.surname)) {
      names = extractNamesFromText(text);
    }

    const phoneNumber = extractPhoneNumber(text);
    
    return {
      firstName: names.firstName,
      surname: names.surname,
      phoneNumber,
      fileName: file.name,
      rawText: text
    };
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};