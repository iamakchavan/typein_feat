import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FileText, FileCode, FileArchive, Upload, Calendar, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (format: 'txt' | 'md' | 'zip', retainDate: boolean, file: File) => void;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'md' | 'zip'>('md');
  const [retainDate, setRetainDate] = useState(true);

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    
    // Set accept based on selected format
    const acceptMap = {
      txt: '.txt',
      md: '.md,.markdown',
      zip: '.zip',
    };
    input.accept = acceptMap[selectedFormat];

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImport(selectedFormat, retainDate, file);
        onClose();
      }
    };

    input.click();
  };

  const formats = [
    {
      value: 'md' as const,
      label: 'Markdown (.md)',
      description: 'Import from Markdown files with formatting',
      icon: FileCode,
      supportsDate: true,
    },
    {
      value: 'txt' as const,
      label: 'Plain Text (.txt)',
      description: 'Import from plain text files',
      icon: FileText,
      supportsDate: false,
    },
    {
      value: 'zip' as const,
      label: 'Backup Archive (.zip)',
      description: 'Restore from typein backup',
      icon: FileArchive,
      supportsDate: true,
    },
  ];

  const selectedFormatData = formats.find(f => f.value === selectedFormat);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Notes
          </DialogTitle>
          <DialogDescription>
            Choose a format to import your notes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Import Format</Label>
            <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as any)}>
              {formats.map((format) => (
                <div
                  key={format.value}
                  className={cn(
                    'flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                    selectedFormat === format.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                  onClick={() => setSelectedFormat(format.value)}
                >
                  <RadioGroupItem value={format.value} id={format.value} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <format.icon className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={format.value} className="font-medium cursor-pointer">
                        {format.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Date Retention Option */}
          {selectedFormatData?.supportsDate && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Date Handling</Label>
                <RadioGroup value={retainDate ? 'retain' : 'new'} onValueChange={(value) => setRetainDate(value === 'retain')}>
                  <div
                    className={cn(
                      'flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                      retainDate
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => setRetainDate(true)}
                  >
                    <RadioGroupItem value="retain" id="retain" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="retain" className="font-medium cursor-pointer">
                          Retain Original Date
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Keep the original date from the file metadata
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                      !retainDate
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => setRetainDate(false)}
                  >
                    <RadioGroupItem value="new" id="new" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="new" className="font-medium cursor-pointer">
                          Import as New Entry
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Use today's date for the imported note
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleFileSelect} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
