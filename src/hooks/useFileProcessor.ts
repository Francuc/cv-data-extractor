import { useState } from 'react';
import { ExtractedData } from '@/types/data';
import { extractDataFromFile } from '@/utils/fileProcessing';

export const useFileProcessor = () => {
  const [processedData, setProcessedData] = useState<ExtractedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    const results: ExtractedData[] = [];

    try {
      for (const file of files) {
        const data = await extractDataFromFile(file);
        if (data) {
          results.push({ ...data, fileName: file.name });
        }
      }
      setProcessedData(results);
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return { processedData, setProcessedData, isProcessing, processFiles };
};