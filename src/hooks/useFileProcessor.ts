
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
      // First extract text data for analysis
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await extractDataFromFile(file);
        results.push({
          ...data,
          fileName: file.name
        });
        setProcessedData(results);
      }

      // Prepare all files data for upload
      const filesData = await Promise.all(files.map(async (file, index) => {
        // Convert file to base64 properly handling binary data
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
        const base64Content = btoa(binary);

        console.log(`Processing ${file.name}, size: ${file.size} bytes`);

        return {
          fileName: file.name,
          fileContent: base64Content,
          mimeType: file.type,
          extractedData: results[index]
        };
      }));

      console.log('Uploading files to Google Drive...');

      // Upload all files in one request
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('google-drive-operations', {
        body: {
          operation: 'uploadFiles',
          files: filesData
        }
      });

      if (uploadError) {
        console.error('Error uploading files:', uploadError);
        return {
          data: results,
          folderLink: undefined
        };
      }

      // Match the uploaded files with their data
      const finalResults = results.map((result, index) => ({
        ...result,
        fileLink: uploadData.fileLinks[index]
      }));

      console.log('Upload completed successfully');
      setProcessedData(finalResults);
      return {
        data: finalResults,
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
