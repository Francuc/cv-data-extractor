import { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { DataPreview } from '@/components/DataPreview';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ExtractedDataDebug } from '@/components/ExtractedDataDebug';
import { useFileProcessor } from '@/hooks/useFileProcessor';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { processedData, isProcessing, processFiles } = useFileProcessor();
  const { exportToSheets, isExporting } = useGoogleSheets();

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
    await processFiles(files);
  };

  const handleExport = async () => {
    if (!processedData || processedData.length === 0) {
      toast.error('No data to export');
      return;
    }
    try {
      await exportToSheets(processedData);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">CV Data Extractor</h1>
          <p className="mt-2 text-gray-600">
            Upload CV files to extract and export data to Google Sheets
          </p>
        </div>

        <FileUploader onFilesSelected={handleFilesSelected} />

        <div className="flex justify-center gap-4">
          <Button
            onClick={handleProcess}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? 'Processing...' : 'Process Files'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !processedData || processedData.length === 0}
            variant="outline"
          >
            {isExporting ? 'Exporting...' : 'Export to Sheets'}
          </Button>
        </div>

        <ProcessingStatus
          totalFiles={files.length}
          processedFiles={processedData?.length || 0}
          isProcessing={isProcessing}
        />

        {processedData && processedData.length > 0 && (
          <>
            <DataPreview data={processedData} />
            <ExtractedDataDebug data={processedData} />
          </>
        )}
      </div>
    </div>
  );
};

export default Index;