import { useState, useEffect } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { DataPreview } from '@/components/DataPreview';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ReviewList } from '@/components/ReviewList';
import { useFileProcessor } from '@/hooks/useFileProcessor';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ExtractedData } from '@/types/data';

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [reviewData, setReviewData] = useState<ExtractedData[]>([]);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const { processedData, setProcessedData, isProcessing, processFiles } = useFileProcessor();

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles(newFiles);
    console.log('Files selected:', newFiles.map(f => ({ name: f.name, type: f.type })));
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.error('Please select files first');
      return;
    }
    console.log('Starting processing of files...');
    const startTime = Date.now();
    await processFiles(files);
    const endTime = Date.now();
    setProcessingTime((endTime - startTime) / 1000); // Convert to seconds
  };

  const handleReview = (index: number) => {
    if (!processedData) return;
    
    const itemToReview = processedData[index];
    setReviewData(prev => [...prev, itemToReview]);
    
    const newProcessedData = processedData.filter((_, i) => i !== index);
    setProcessedData(newProcessedData);
  };

  const handleDataUpdate = (index: number, updatedData: Partial<ExtractedData>) => {
    if (!processedData) return;
    
    const newData = [...processedData];
    newData[index] = { ...newData[index], ...updatedData };
    setProcessedData(newData);
  };

  // Reset processing time when new files are selected
  useEffect(() => {
    setProcessingTime(0);
  }, [files]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">CV Data Extractor</h1>
          <p className="mt-2 text-gray-600">
            Upload CV files to extract data
          </p>
        </div>

        <FileUploader onFilesSelected={handleFilesSelected} />

        <div className="flex justify-center">
          <Button
            onClick={handleProcess}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? 'Processing...' : 'Process Files'}
          </Button>
        </div>

        {processingTime > 0 && (
          <div className="text-center text-sm text-gray-600">
            Processing completed in {processingTime.toFixed(2)} seconds
          </div>
        )}

        <ProcessingStatus
          totalFiles={files.length}
          processedFiles={processedData?.length || 0}
          isProcessing={isProcessing}
        />

        {processedData && processedData.length > 0 && (
          <DataPreview 
            data={processedData} 
            onDataUpdate={handleDataUpdate}
            onReview={handleReview}
          />
        )}

        <ReviewList data={reviewData} />
      </div>
    </div>
  );
};

export default Index;