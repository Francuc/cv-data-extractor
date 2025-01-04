import { useEffect, useState } from 'react';

interface ProcessingTimerProps {
  isProcessing: boolean;
  totalFiles: number;
}

export const ProcessingTimer = ({ isProcessing, totalFiles }: ProcessingTimerProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const ESTIMATED_TIME_PER_FILE = 4; // Increased to account for processing + upload time

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isProcessing) {
      setElapsedTime(0);
      intervalId = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isProcessing]);

  if (!isProcessing || totalFiles === 0) return null;

  const estimatedTotalTime = totalFiles * ESTIMATED_TIME_PER_FILE;
  const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  };

  return (
    <div className="text-sm text-gray-600 text-center mt-2">
      <p>
        Estimated time remaining: {formatTime(remainingTime)}
        <br />
        Time elapsed: {formatTime(elapsedTime)}
      </p>
    </div>
  );
};