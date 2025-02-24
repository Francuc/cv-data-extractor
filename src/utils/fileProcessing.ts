
import { ExtractedData } from '@/types/data';
import { extractNameFromFileName } from './nameExtraction';
import { extractPhoneNumber } from './phoneExtraction';
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  extractTextFromRTF
} from './textExtraction';

export const extractDataFromFile = async (file: File): Promise<ExtractedData> => {
  try {
    console.log(`Starting data extraction for file: ${file.name} (${file.type})`);
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
      return {
        firstName: '',
        surname: '',
        phoneNumber: '',
        fileName: file.name,
        rawText: ''
      };
    }

    if (!text) {
      console.warn('No text extracted from file');
      return {
        firstName: '',
        surname: '',
        phoneNumber: '',
        fileName: file.name,
        rawText: ''
      };
    }

    console.log('Extracting metadata from file name and content');
    const { firstName, surname } = extractNameFromFileName(file.name);
    const phoneNumber = extractPhoneNumber(text);
    
    console.log('Data extraction completed successfully');
    return {
      firstName,
      surname,
      phoneNumber,
      fileName: file.name,
      rawText: text
    };
  } catch (error) {
    console.error('Error processing file:', error);
    // Return empty data instead of null to maintain type safety
    return {
      firstName: '',
      surname: '',
      phoneNumber: '',
      fileName: file.name,
      rawText: ''
    };
  }
};
