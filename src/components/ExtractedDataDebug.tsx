import { ExtractedData } from '@/types/data';

interface ExtractedDataDebugProps {
  data: ExtractedData[];
  rawText?: string;
}

export const ExtractedDataDebug = ({ data, rawText }: ExtractedDataDebugProps) => {
  return (
    <div className="mt-8 space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold">Extraction Debug Info</h3>
      
      <div className="space-y-2">
        <h4 className="font-medium">Extracted Data:</h4>
        <pre className="bg-white p-4 rounded border overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      {rawText && (
        <div className="space-y-2">
          <h4 className="font-medium">Raw Extracted Text:</h4>
          <pre className="bg-white p-4 rounded border overflow-x-auto max-h-40">
            {rawText}
          </pre>
        </div>
      )}
    </div>
  );
};