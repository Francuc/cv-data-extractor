import { useState } from 'react';
import { ExtractedData, ProcessingResult } from '@/types/data';
import { extractDataFromFile } from '@/utils/fileProcessing';
import { supabase } from '@/integrations/supabase/client';

export const useFileProcessor = () => {
  const [processedData, setProcessedData] = useState<ExtractedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: File[]): Promise<ProcessingResult> => {
    setIsProcessing(true);
    const results: ExtractedData[] = [];

    try {
      // Convert all files to base64 first
      const filesData = await Promise.all(
        files.map(async (file) => {
          const data = await extractDataFromFile(file);
          const buffer = await file.arrayBuffer();
          const base64Content = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          return {
            fileName: file.name,
            fileContent: base64Content,
            mimeType: file.type,
            extractedData: data
          };
        })
      );

      // Upload all files in one request
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('google-drive-operations', {
        body: {
          operation: 'uploadFiles',
          files: filesData
        }
      });

      if (uploadError) {
        console.error('Error uploading files:', uploadError);
        filesData.forEach(({ extractedData, fileName }) => {
          results.push({ ...extractedData, fileName });
        });
      } else {
        // Match the uploaded files with their data
        filesData.forEach(({ extractedData, fileName }, index) => {
          results.push({
            ...extractedData,
            fileName,
            fileLink: uploadData.fileLinks[index]
          });
        });
      }

      setProcessedData(results);
      return {
        data: results,
        folderLink: uploadData?.folderLink
      };
    } catch (error) {
      console.error('Error processing files:', error);
      return {
        data: [],
        folderLink: undefined
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return { processedData, setProcessedData, isProcessing, processFiles };
};