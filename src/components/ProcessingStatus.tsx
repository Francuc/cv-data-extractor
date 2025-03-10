import { Progress } from '@/components/ui/progress';

interface ProcessingStatusProps {
  totalFiles: number;
  processedFiles: number;
  isProcessing: boolean;
}

export const ProcessingStatus = ({
  totalFiles,
  processedFiles,
  isProcessing,
}: ProcessingStatusProps) => {
  if (totalFiles === 0) return null;

  const progress = (processedFiles / totalFiles) * 100;
  const stage = processedFiles === totalFiles ? 'Uploading' : 'Processing';

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>{stage} Progress</span>
        <span>
          {processedFiles} / {totalFiles} files
        </span>
      </div>
      <Progress value={progress} className="w-full" />
      {isProcessing && (
        <p className="text-sm text-gray-500 text-center">
          {stage} files, please wait...
        </p>
      )}
    </div>
  );
};