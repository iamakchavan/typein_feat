import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Upload, FileArchive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackupStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'export' | 'import';
  status: 'preparing' | 'processing' | 'complete' | 'error';
  progress?: number;
  stats?: {
    entriesProcessed?: number;
    totalEntries?: number;
    mediaProcessed?: number;
    totalMedia?: number;
  };
  error?: string;
}

export function BackupStatusDialog({
  isOpen,
  onClose,
  type,
  status,
  progress = 0,
  stats,
  error,
}: BackupStatusDialogProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    if (progress > displayProgress) {
      const timer = setTimeout(() => {
        setDisplayProgress(Math.min(displayProgress + 1, progress));
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [progress, displayProgress]);

  const isExport = type === 'export';
  const isComplete = status === 'complete';
  const isError = status === 'error';
  const isProcessing = status === 'processing' || status === 'preparing';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-full p-3 ring-4 ring-offset-2 ring-offset-background',
                isComplete && 'bg-green-500/20 ring-green-500/20',
                isError && 'bg-red-500/20 ring-red-500/20',
                isProcessing && 'bg-blue-500/20 ring-blue-500/20'
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : isError ? (
                <FileArchive className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : isExport ? (
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-bounce" />
              ) : (
                <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-bounce" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle>
                {isComplete
                  ? isExport
                    ? 'Export Complete'
                    : 'Import Complete'
                  : isError
                    ? isExport
                      ? 'Export Failed'
                      : 'Import Failed'
                    : isExport
                      ? 'Exporting Backup'
                      : 'Importing Backup'}
              </DialogTitle>
              <DialogDescription>
                {isComplete
                  ? isExport
                    ? 'Your backup has been downloaded'
                    : 'Your notes have been restored'
                  : isError
                    ? 'An error occurred during the process'
                    : status === 'preparing'
                      ? 'Preparing your data...'
                      : isExport
                        ? 'Creating backup archive...'
                        : 'Restoring your notes...'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(displayProgress)}%</span>
              </div>
              <Progress value={displayProgress} className="h-2" />
            </div>
          )}

          {/* Stats */}
          {stats && (stats.totalEntries || stats.totalMedia) && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              {stats.totalEntries !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Entries</span>
                  <span className="font-medium">
                    {isProcessing ? (
                      <>
                        {stats.entriesProcessed || 0} / {stats.totalEntries}
                      </>
                    ) : (
                      stats.totalEntries
                    )}
                  </span>
                </div>
              )}
              {stats.totalMedia !== undefined && stats.totalMedia > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Media Files</span>
                  <span className="font-medium">
                    {isProcessing ? (
                      <>
                        {stats.mediaProcessed || 0} / {stats.totalMedia}
                      </>
                    ) : (
                      stats.totalMedia
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {isError && error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {isComplete && !isError && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              <p className="text-sm text-green-900 dark:text-green-100">
                {isExport
                  ? 'Your backup file has been saved to your downloads folder.'
                  : 'Your notes and media have been successfully restored. The page will reload shortly.'}
              </p>
            </div>
          )}

          {/* Loading Spinner */}
          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Action Button */}
          {(isComplete || isError) && (
            <Button onClick={onClose} className="w-full" size="lg">
              {isComplete ? 'Done' : 'Close'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
