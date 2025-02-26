
import { useState } from 'react';
import { ExtractedData, ProcessingResult } from '@/types/data';
import { extractDataFromFile } from '@/utils/fileProcessing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

        if (data) {  // Only push if data was successfully extracted
          results.push({
            ...data,
            fileName: file.name
          });
        }
      }

      console.log('Processed files locally:', results);

      // Prepare all files data for upload
      const filesData = await Promise.all(files.map(async (file, index) => {
        const buffer = await file.arrayBuffer();
        const base64Content = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

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
        toast.error('Failed to upload files to Google Drive');
        return {
          data: results,
          folderLink: undefined
        };
      }

      console.log('Upload response:', uploadData);

      // Match the uploaded files with their data
      const finalResults = results.map((result, index) => ({
        ...result,
        fileLink: uploadData.fileLinks[index]
      }));

      console.log('Final results with file links:', finalResults);

      setProcessedData(finalResults);
      return {
        data: finalResults,
        folderLink: uploadData?.folderLink
      };
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Error processing files');
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
