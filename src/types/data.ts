export interface ExtractedData {
  firstName: string;
  surname: string;
  phoneNumber: string;
  fileName: string;
  rawText: string;
  fileLink?: string;
}

export interface ProcessingResult {
  data: ExtractedData[];
  folderLink?: string;
}