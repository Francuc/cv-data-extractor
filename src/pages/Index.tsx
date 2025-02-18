
import { useState, useEffect } from 'react';
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
import { UpdateTokenDialog } from '@/components/UpdateTokenDialog';
import { ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, differenceInDays } from 'date-fns';

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [reviewData, setReviewData] = useState<ExtractedData[]>([]);
  const [folderLink, setFolderLink] = useState<string>('');
  const { processedData, setProcessedData, isProcessing, processFiles } = useFileProcessor();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isUpdateTokenDialogOpen, setIsUpdateTokenDialogOpen] = useState(false);
  const [tokenUpdatedAt, setTokenUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenUpdate = async () => {
      const { data, error } = await supabase
        .from('secrets')
        .select('updated_at')
        .eq('key', 'GOOGLE_REFRESH_TOKEN')
        .order('updated_at', { ascending: false })
        .maybeSingle();

      if (error) {
        console.error('Error fetching token update:', error);
        return;
      }

      if (data?.updated_at) {
        setTokenUpdatedAt(data.updated_at);
      }
    };

    fetchTokenUpdate();
  }, [isUpdateTokenDialogOpen]);

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

  const handleUpdateTokenClick = () => {
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordSuccess = () => {
    setIsPasswordDialogOpen(false);
    setIsUpdateTokenDialogOpen(true);
  };

  const handleProcess = async () => {
    console.log('Starting processing of files...');
    const result = await processFiles(files);
    
    if (result.folderLink) {
      setFolderLink(result.folderLink);
    }
    
    const complete: ExtractedData[] = [];
    const incomplete: ExtractedData[] = [];
    
    result.data.forEach(item => {
      if (!item.firstName || !item.surname || !item.phoneNumber) {
        incomplete.push(item);
      } else {
        complete.push(item);
      }
    });
    
    setProcessedData(complete);
    setReviewData(prev => [...prev, ...incomplete]);
  };

  const handleOpenFolder = () => {
    if (!folderLink) {
      toast.error('No folder link available');
      return;
    }
    window.open(folderLink, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteFolder = async () => {
    if (!folderLink) {
      toast.error('No folder to delete');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('google-drive-operations', {
        body: {
          operation: 'deleteFolder',
          folderId: folderLink.split('/').pop()
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Folder deleted successfully');
      setFolderLink('');
    } catch (error) {
      toast.error('Failed to delete folder');
      console.error('Delete error:', error);
    }
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

  const renderTokenStatus = () => {
    if (!tokenUpdatedAt) return null;

    const updateDate = new Date(tokenUpdatedAt);
    const now = new Date();
    const daysSinceUpdate = differenceInDays(now, updateDate);
    const remainingDays = 7 - daysSinceUpdate;
    const isExpired = remainingDays <= 0;
    const formattedDate = format(updateDate, 'MMM dd, yyyy HH:mm');

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className={`inline-flex items-center gap-1 text-sm ${isExpired ? 'text-red-500' : 'text-green-500'}`}>
              {isExpired ? 'Token expired' : `Valid for ${remainingDays} days`}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Token updated: {formattedDate}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
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

        <div className="flex justify-center gap-4">
          <Button
            onClick={handleProcessClick}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? 'Processing...' : 'Process Files'}
          </Button>

          <Button
            variant="outline"
            onClick={handleUpdateTokenClick}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Update Drive Token
          </Button>

          {folderLink && (
            <>
              <Button
                variant="outline"
                onClick={handleOpenFolder}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Folder
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleDeleteFolder}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Folder
              </Button>
            </>
          )}
        </div>

        <div className="flex justify-center">
          {renderTokenStatus()}
        </div>

        <PasswordDialog
          isOpen={isPasswordDialogOpen}
          onClose={() => setIsPasswordDialogOpen(false)}
          onSuccess={handlePasswordSuccess}
        />

        <UpdateTokenDialog
          isOpen={isUpdateTokenDialogOpen}
          onClose={() => setIsUpdateTokenDialogOpen(false)}
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
