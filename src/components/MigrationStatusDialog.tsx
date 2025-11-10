import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Image,
  Table,
  Video,
} from 'lucide-react';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';

interface MigrationStatus {
  version: number;
  completedAt?: string;
  totalEntries: number;
  migratedEntries: number;
  failedEntries: string[];
}

export function MigrationStatusDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkMigrationStatus = async () => {
      try {
        // Check if we've already shown the migration status for this version
        const shownKey = 'migration-status-shown-v6';
        const hasShown = localStorage.getItem(shownKey);

        if (hasShown) {
          setIsChecking(false);
          return;
        }

        // Get migration status from IndexedDB
        const migrationStatus = await db.getMigrationStatus();

        // Only show if there's a migration status AND there were entries to migrate
        if (migrationStatus && migrationStatus.totalEntries > 0) {
          setStatus(migrationStatus);
          setIsOpen(true);
          // Mark as shown
          localStorage.setItem(shownKey, 'true');
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Failed to check migration status:', error);
        setIsChecking(false);
      }
    };

    checkMigrationStatus();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (isChecking || !status) {
    return null;
  }

  const allMigrated = status.migratedEntries === status.totalEntries;
  const hasFailed = status.failedEntries.length > 0;
  const successRate = Math.round(
    (status.migratedEntries / status.totalEntries) * 100
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg overflow-hidden p-0">
        {/* Header with gradient background */}
        <div
          className={cn(
            'px-6 pt-6 pb-8',
            allMigrated && !hasFailed
              ? 'bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent'
              : hasFailed
                ? 'bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent'
                : 'bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent'
          )}
        >
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'rounded-full p-3 ring-4 ring-offset-2 ring-offset-background',
                  allMigrated && !hasFailed
                    ? 'bg-green-500/20 ring-green-500/20'
                    : hasFailed
                      ? 'bg-yellow-500/20 ring-yellow-500/20'
                      : 'bg-blue-500/20 ring-blue-500/20'
                )}
              >
                {allMigrated && !hasFailed ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold mb-2">
                  {allMigrated && !hasFailed
                    ? 'Migration Complete!'
                    : hasFailed
                      ? 'Migration Completed'
                      : 'Migration In Progress'}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {allMigrated && !hasFailed
                    ? 'Your journal has been upgraded with powerful new features'
                    : 'Your entries have been updated to the new format'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Migration Progress</span>
              <Badge
                variant={allMigrated && !hasFailed ? 'default' : 'secondary'}
                className={cn(
                  allMigrated && !hasFailed &&
                    'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                )}
              >
                {successRate}% Complete
              </Badge>
            </div>
            <Progress value={successRate} className="h-2" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {status.migratedEntries} of {status.totalEntries} entries
              </span>
              {hasFailed && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  {status.failedEntries.length} skipped
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-foreground">
                {status.totalEntries}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <FileText className="h-3 w-3" />
                Total
              </div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {status.migratedEntries}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Migrated
              </div>
            </div>
            <div className="text-center space-y-1">
              <div
                className={cn(
                  'text-2xl font-bold',
                  hasFailed
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-muted-foreground'
                )}
              >
                {status.failedEntries.length}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Skipped
              </div>
            </div>
          </div>

          {/* New Features Section */}
          {allMigrated && !hasFailed && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    New Features Available
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: FileText, label: 'Rich Text' },
                    { icon: Image, label: 'Images' },
                    { icon: Table, label: 'Tables' },
                    { icon: Video, label: 'Videos' },
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <feature.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{feature.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Warning Message */}
          {hasFailed && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-900 dark:text-yellow-100">
                  <p className="font-medium mb-1">Some entries were skipped</p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    These entries have been preserved in their original format
                    and will continue to work normally.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timestamp */}
          {status.completedAt && (
            <div className="text-center text-xs text-muted-foreground">
              Completed {new Date(status.completedAt).toLocaleString()}
            </div>
          )}

          {/* Action Button */}
          <Button onClick={handleClose} className="w-full" size="lg">
            {allMigrated && !hasFailed ? "Let's Go!" : 'Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
