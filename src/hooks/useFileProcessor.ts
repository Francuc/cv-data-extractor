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
      // Process files one by one to show accurate progress
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await extractDataFromFile(file);
        const buffer = await file.arrayBuffer();
        const base64Content = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        results.push({
          ...data,
          fileName: file.name
        });

        // Update processed count after each file
        setProcessedData(results);
      }

      // Prepare all files data for upload
      const filesData = results.map((result, index) => {
        const file = files[index];
        const buffer = new Uint8Array(file.arrayBuffer());
        const base64Content = btoa(
          buffer.reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        return {
          fileName: file.name,
          fileContent: base64Content,
          mimeType: file.type,
          extractedData: result
        };
      });

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