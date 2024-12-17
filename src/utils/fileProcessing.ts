import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { ExtractedData } from '@/types/data';

const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfData = await pdfParse(Buffer.from(arrayBuffer));
  return pdfData.text;
};

const extractTextFromDOCX = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({
    arrayBuffer: arrayBuffer,
  });
  return result.value;
};

const extractTextFromTXT = async (file: File): Promise<string> => {
  const text = await file.text();
  return text;
};

const findName = (text: string): { firstName: string; surname: string } => {
  // This is a simplified example. In a real application, you'd want to use
  // more sophisticated NLP techniques or regex patterns
  const nameRegex = /([A-Z][a-z]+)\s+([A-Z][a-z]+)/;
  const match = text.match(nameRegex);
  return {
    firstName: match?.[1] || '',
    surname: match?.[2] || '',
  };
};

const findPhoneNumber = (text: string): string => {
  // This is a simplified example. You might want to add more phone number formats
  const phoneRegex = /(\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/;
  const match = text.match(phoneRegex);
  return match?.[1] || '';
};

export const extractDataFromFile = async (
  file: File
): Promise<ExtractedData | null> => {
  try {
    let text = '';

    switch (file.type) {
      case 'application/pdf':
        text = await extractTextFromPDF(file);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        text = await extractTextFromDOCX(file);
        break;
      case 'text/plain':
      case 'text/rtf':
        text = await extractTextFromTXT(file);
        break;
      default:
        throw new Error('Unsupported file type');
    }

    const { firstName, surname } = findName(text);
    const phoneNumber = findPhoneNumber(text);

    return {
      firstName,
      surname,
      phoneNumber,
      fileName: file.name,
    };
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error);
    return null;
  }
};