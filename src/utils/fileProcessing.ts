import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedData } from '@/types/data';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log('Starting PDF extraction for file:', file.name);
  const arrayBuffer = await file.arrayBuffer();
  console.log('File converted to array buffer');
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  console.log('PDF document loaded, number of pages:', pdf.numPages);
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    console.log(`Processing page ${i} of ${pdf.numPages}`);
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + ' ';
  }
  
  console.log('Extracted text length:', fullText.length);
  return fullText;
};

const extractTextFromDOCX = async (file: File): Promise<string> => {
  console.log('DOCX parsing attempted but not supported in browser');
  throw new Error('DOCX parsing is not supported in the browser version');
};

const extractTextFromTXT = async (file: File): Promise<string> => {
  console.log('Starting TXT file extraction');
  const text = await file.text();
  console.log('TXT file extracted, length:', text.length);
  return text;
};

const findName = (text: string): { firstName: string; surname: string } => {
  console.log('Attempting to find name in text');
  const nameRegex = /([A-Z][a-z]+)\s+([A-Z][a-z]+)/;
  const match = text.match(nameRegex);
  const result = {
    firstName: match?.[1] || '',
    surname: match?.[2] || '',
  };
  console.log('Found name:', result);
  return result;
};

const findPhoneNumber = (text: string): string => {
  console.log('Attempting to find phone number in text');
  const phoneRegex = /(\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/;
  const match = text.match(phoneRegex);
  const result = match?.[1] || '';
  console.log('Found phone number:', result);
  return result;
};

export const extractDataFromFile = async (
  file: File
): Promise<ExtractedData | null> => {
  console.log('Starting extraction process for file:', file.name);
  console.log('File type:', file.type);
  
  try {
    let text = '';

    switch (file.type) {
      case 'application/pdf':
        text = await extractTextFromPDF(file);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        throw new Error('DOCX/DOC files are not supported in the browser version');
      case 'text/plain':
      case 'text/rtf':
        text = await extractTextFromTXT(file);
        break;
      default:
        throw new Error('Unsupported file type');
    }

    console.log('Raw extracted text:', text);
    const { firstName, surname } = findName(text);
    const phoneNumber = findPhoneNumber(text);

    const result = {
      firstName,
      surname,
      phoneNumber,
      fileName: file.name,
    };
    
    console.log('Extraction completed. Result:', result);
    return result;
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error);
    return null;
  }
};