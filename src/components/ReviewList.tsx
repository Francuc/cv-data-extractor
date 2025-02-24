import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';
import { ExtractedData } from '@/types/data';

interface ReviewListProps {
  data: ExtractedData[];
}

export const ReviewList = ({ data }: ReviewListProps) => {
  if (data.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Under Review</h2>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First Name</TableHead>
              <TableHead>Surname</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Source File</TableHead>
              <TableHead>File Link</TableHead>
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
                  {item.fileLink ? (
                    <a
                      href={item.fileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                    >
                      View <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-gray-500">No link available</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};