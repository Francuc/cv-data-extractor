import { useState } from 'react';
import { ExtractedData } from '@/types/data';
import { exportDataToSheets } from '@/utils/googleSheets';

export const useGoogleSheets = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToSheets = async (data: ExtractedData[]) => {
    setIsExporting(true);
    try {
      await exportDataToSheets(data);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToSheets, isExporting };
};