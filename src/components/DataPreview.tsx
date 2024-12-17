import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExtractedData } from '@/types/data';

interface DataPreviewProps {
  data: ExtractedData[];
  onDataUpdate: (index: number, updatedData: Partial<ExtractedData>) => void;
}

export const DataPreview = ({ data }: DataPreviewProps) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First Name</TableHead>
            <TableHead>Surname</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Source File</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};