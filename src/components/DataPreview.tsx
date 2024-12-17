import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Copy, Eye } from 'lucide-react';
import { ExtractedData } from '@/types/data';
import { toast } from 'sonner';

interface DataPreviewProps {
  data: ExtractedData[];
  onDataUpdate: (index: number, updatedData: Partial<ExtractedData>) => void;
  onReview: (index: number) => void;
}

export const DataPreview = ({ data, onReview }: DataPreviewProps) => {
  const copyToClipboard = () => {
    const formattedData = data
      .map(item => `${item.firstName} ${item.surname}\n${item.phoneNumber}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(formattedData).then(() => {
      toast.success('Data copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy data');
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={copyToClipboard}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Copy All
        </Button>
      </div>
      
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
                <TableCell>{item.firstName}</TableCell>
                <TableCell>{item.surname}</TableCell>
                <TableCell>{item.phoneNumber}</TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {item.fileName}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReview(index)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};