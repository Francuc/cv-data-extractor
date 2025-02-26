
import { useState } from 'react';
import { ExtractedData, ProcessingResult } from '@/types/data';
import { extractDataFromFile } from '@/utils/fileProcessing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BATCH_SIZE = 5; // Process 5 files at a time

export const useFileProcessor = () => {
  const [processedData, setProcessedData] = useState<ExtractedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFileBatch = async (
    files: File[],
    startIndex: number,
    batchSize: number
  ): Promise<{ data: ExtractedData[]; folderLink?: string }> => {
    const batchEnd = Math.min(startIndex + batchSize, files.length);
    const currentBatch = files.slice(startIndex, batchEnd);
    const results: ExtractedData[] = [];

    try {
      // Process current batch of files
      for (const file of currentBatch) {
        const data = await extractDataFromFile(file);
        if (data) {
          results.push({
            ...data,
            fileName: file.name
          });
        }
      }

      console.log(`Processed batch ${startIndex}-${batchEnd} locally:`, results);

      // Prepare batch files data for upload
      const filesData = await Promise.all(currentBatch.map(async (file, index) => {
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

      console.log(`Uploading batch ${startIndex}-${batchEnd} to Google Drive...`);

      // Upload current batch
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('google-drive-operations', {
        body: {
          operation: 'uploadFiles',
          files: filesData,
          isLastBatch: batchEnd === files.length,
          startIndex
        }
      });

      if (uploadError) {
        console.error('Error uploading batch:', uploadError);
        toast.error(`Failed to upload batch ${startIndex + 1}-${batchEnd}`);
        return {
          data: results
        };
      }

      console.log('Batch upload response:', uploadData);

      // Match the uploaded files with their data
      const finalResults = results.map((result, index) => ({
        ...result,
        fileLink: uploadData.fileLinks[index]
      }));

      console.log('Final results for batch with file links:', finalResults);

      // Return results and folderLink (only for last batch)
      return {
        data: finalResults,
        folderLink: batchEnd === files.length ? uploadData?.folderLink : undefined
      };
    } catch (error) {
      console.error(`Error processing batch ${startIndex}-${batchEnd}:`, error);
      toast.error(`Error processing batch ${startIndex + 1}-${batchEnd}`);
      return { data: [] };
    }
  };

  const processFiles = async (files: File[]): Promise<ProcessingResult> => {
    setIsProcessing(true);
    const allResults: ExtractedData[] = [];
    let folderLink: string | undefined;

    try {
      // Process files in batches
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const { data: batchResults, folderLink: batchFolderLink } = await processFileBatch(
          files,
          i,
          BATCH_SIZE
        );
        
        allResults.push(...batchResults);
        
        // Save the folder link from the last batch
        if (batchFolderLink) {
          folderLink = batchFolderLink;
        }

        // Update UI with progress
        setProcessedData(prevData => [...prevData, ...batchResults]);

        // Add a small delay between batches to avoid overwhelming the server
        if (i + BATCH_SIZE < files.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        data: allResults,
        folderLink
      };
    } catch (error) {
      console.error('Error in batch processing:', error);
      toast.error('Error processing files');
      return {
        data: allResults,
        folderLink
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return { processedData, setProcessedData, isProcessing, processFiles };
};
