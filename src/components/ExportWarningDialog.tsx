import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, FileJson } from 'lucide-react';

interface ExportWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onUseJson: () => void;
  format: 'md' | 'txt';
}

export function ExportWarningDialog({
  isOpen,
  onClose,
  onContinue,
  onUseJson,
  format,
}: ExportWarningDialogProps) {
  const formatName = format === 'md' ? 'Markdown' : 'Plain Text';
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="rounded-full p-2 bg-yellow-500/20 flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <AlertDialogTitle className="text-left leading-tight">
              Some Features May Be Lost
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 text-left">
            <p className="break-words">
              Exporting as <span className="font-medium">{formatName}</span> may not preserve all formatting and features:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm break-words">
              <li>Tables may lose structure</li>
              <li>Media files (images, videos) will be lost</li>
              <li>Rich formatting may be simplified</li>
              <li>Special blocks may not be preserved</li>
            </ul>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
              <div className="flex items-start gap-2">
                <FileJson className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm break-words">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Recommended: Use JSON
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    JSON format preserves all content, formatting, and media perfectly.
                  </p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onClose} className="sm:flex-1">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className="bg-muted text-foreground hover:bg-muted/80 sm:flex-1"
          >
            Continue with {formatName}
          </AlertDialogAction>
          <AlertDialogAction 
            onClick={onUseJson} 
            className="bg-primary hover:bg-primary/90 sm:flex-1"
          >
            <FileJson className="h-4 w-4 mr-2" />
            Use JSON
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
