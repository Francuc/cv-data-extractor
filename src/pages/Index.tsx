import { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { DataPreview } from '@/components/DataPreview';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ProcessingTimer } from '@/components/ProcessingTimer';
import { ReviewList } from '@/components/ReviewList';
import { useFileProcessor } from '@/hooks/useFileProcessor';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ExtractedData } from '@/types/data';
import { PasswordDialog } from '@/components/PasswordDialog';

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [reviewData, setReviewData] = useState<ExtractedData[]>([]);
  const { processedData, setProcessedData, isProcessing, processFiles } = useFileProcessor();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles(newFiles);
    console.log('Files selected:', newFiles.map(f => ({ name: f.name, type: f.type })));
  };

  const handleProcessClick = () => {
    if (files.length === 0) {
      toast.error('Please select files first');
      return;
    }
    setIsPasswordDialogOpen(true);
  };

  const handleProcess = async () => {
    console.log('Starting processing of files...');
    const results = await processFiles(files);
    
    // Separate complete and incomplete records
    const complete: ExtractedData[] = [];
    const incomplete: ExtractedData[] = [];
    
    results.forEach(item => {
      if (!item.firstName || !item.surname || !item.phoneNumber) {
        incomplete.push(item);
      } else {
        complete.push(item);
      }
    });
    
    setProcessedData(complete);
    setReviewData(prev => [...prev, ...incomplete]);
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">CV Data Extractor</h1>
          <p className="mt-2 text-gray-600">
            Upload CV files to extract and process data
          </p>
        </div>

        <FileUploader onFilesSelected={handleFilesSelected} />

        <div className="flex justify-center">
          <Button
            onClick={handleProcessClick}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? 'Processing...' : 'Process Files'}
          </Button>
        </div>

        <PasswordDialog
          isOpen={isPasswordDialogOpen}
          onClose={() => setIsPasswordDialogOpen(false)}
          onSuccess={handleProcess}
        />

        <ProcessingStatus
          totalFiles={files.length}
          processedFiles={processedData?.length || 0}
          isProcessing={isProcessing}
        />

        <ProcessingTimer
          isProcessing={isProcessing}
          totalFiles={files.length}
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