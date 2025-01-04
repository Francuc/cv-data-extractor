import { useState } from 'react';
import { ExtractedData } from '@/types/data';
import { extractDataFromFile } from '@/utils/fileProcessing';
import { supabase } from '@/integrations/supabase/client';

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
          // Convert file to base64
          const buffer = await file.arrayBuffer();
          const base64Content = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          // Upload file to Google Drive
          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('google-drive-operations', {
            body: {
              operation: 'uploadFile',
              files: {
                fileName: file.name,
                fileContent: base64Content,
                mimeType: file.type
              }
            }
          });

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            results.push({ ...data, fileName: file.name });
          } else {
            results.push({
              ...data,
              fileName: file.name,
              fileLink: uploadData.webViewLink
            });
          }
        }
      }
      setProcessedData(results);
      return results;
    } catch (error) {
      console.error('Error processing files:', error);
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  return { processedData, setProcessedData, isProcessing, processFiles };
};