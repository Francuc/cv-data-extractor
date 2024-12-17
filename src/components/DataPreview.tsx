import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ExtractedData } from '@/types/data';
import { toast } from 'sonner';
import { extractSpecificField } from '@/utils/fileProcessing';

interface DataPreviewProps {
  data: ExtractedData[];
  onDataUpdate: (index: number, updatedData: Partial<ExtractedData>) => void;
}

export const DataPreview = ({ data, onDataUpdate }: DataPreviewProps) => {
  const handleRetryField = async (index: number, field: keyof ExtractedData, rawText: string) => {
    try {
      const extractedValue = await extractSpecificField(field, rawText);
      if (extractedValue) {
        onDataUpdate(index, { [field]: extractedValue });
        toast.success(`Successfully re-extracted ${field}`);
      } else {
        toast.error(`Could not extract ${field} from the text`);
      }
    } catch (error) {
      console.error(`Error re-extracting ${field}:`, error);
      toast.error(`Failed to re-extract ${field}`);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First Name</TableHead>
            <TableHead>Surname</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Source File</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              <TableCell>
                {item.firstName}
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-6 w-6"
                  onClick={() => handleRetryField(index, 'firstName', item.rawText)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>
                {item.surname}
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-6 w-6"
                  onClick={() => handleRetryField(index, 'surname', item.rawText)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>
                {item.phoneNumber}
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-6 w-6"
                  onClick={() => handleRetryField(index, 'phoneNumber', item.rawText)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell className="text-gray-500 text-sm">
                {item.fileName}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    handleRetryField(index, 'phoneNumber', item.rawText);
                    handleRetryField(index, 'firstName', item.rawText);
                    handleRetryField(index, 'surname', item.rawText);
                  }}
                >
                  Retry All
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};