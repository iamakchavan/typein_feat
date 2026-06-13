import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CheckCircle2, Download, Upload, Loader2, AlertCircle, X, Image } from 'lucide-react';
import { EntryPageIcon } from './Icons';
import { db } from '@/lib/db';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useModalHistory } from '@/hooks/useModalHistory';
import { mediaStorage } from '@/lib/mediaStorage';
import { getReferencedMediaIds, getReferencedMediaCount } from '@/lib/backup';

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

// Detect mobile devices for performance-optimized transitions
const isMobileDevice = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.innerWidth < 768
);

const spring = isMobileDevice
  ? { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.28 }
  : { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 };

const springMed = isMobileDevice
  ? { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.32 }
  : { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 };

export function BackupStatusDialog({
  isOpen,
  onClose,
  type,
  status,
  progress = 0,
  stats,
  error,
}: BackupStatusDialogProps) {
  useModalHistory(isOpen, onClose, 'backup-status');
  const [displayProgress, setDisplayProgress] = useState(0);
  const isMobile = useIsMobile();

  // Smooth progress animation
  useEffect(() => {
    if (progress > displayProgress) {
      const timer = setTimeout(() => {
        setDisplayProgress(Math.min(displayProgress + 1, progress));
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [progress, displayProgress]);

  // Reset display progress when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setDisplayProgress(0);
    }
  }, [isOpen]);

  const isExport = type === 'export';
  const isComplete = status === 'complete';
  const isError = status === 'error';
  const isProcessing = status === 'processing' || status === 'preparing';

  const iconBg = isComplete
    ? 'hsl(var(--primary)/0.1)'
    : isError
      ? 'rgba(239, 68, 68, 0.1)'
      : 'hsl(var(--primary)/0.08)';

  const iconColor = isComplete
    ? 'hsl(var(--primary))'
    : isError
      ? 'rgb(239, 68, 68)'
      : 'hsl(var(--primary))';

  return (
    <AnimatePresence>
      {isOpen && (
        <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
          <DialogPrimitive.Portal forceMount>
            
            {/* Backdrop */}
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 50,
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                }}
              />
            </DialogPrimitive.Overlay>

            {/* Sheet Content */}
            <DialogPrimitive.Content asChild>
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.85 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 300) {
                    onClose();
                  }
                }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={springMed}
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 51,
                  background: 'hsl(var(--background))',
                  borderRadius: isMobile ? '24px 24px 0 0' : '32px 32px 0 0',
                  boxShadow: '0 -12px 60px rgba(0,0,0,0.15)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  maxWidth: 520,
                  margin: '0 auto',
                  paddingBottom: 'env(safe-area-inset-bottom, 24px)',
                  maxHeight: isMobile ? '85vh' : '90vh',
                  overflowY: 'auto',
                }}
              >
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 2 }}>
                  <div style={{ width: 38, height: 5, borderRadius: 99, background: 'hsl(var(--muted-foreground)/0.2)' }} />
                </div>

                <div style={{ padding: isMobile ? '10px 16px 16px' : '10px 24px 24px', position: 'relative' }}>
                  {/* Close button (top right of sheet) */}
                  <DialogPrimitive.Close asChild>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: isMobile ? 16 : 20,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'hsl(var(--muted))',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'hsl(var(--muted-foreground))',
                      }}
                    >
                      <X size={16} />
                    </motion.button>
                  </DialogPrimitive.Close>

                  {/* Hero Header */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.04 }}
                    style={{ marginBottom: isMobile ? 16 : 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <motion.div
                      animate={{
                        scale: [0.95, 1],
                        opacity: [0, 1]
                      }}
                      transition={spring}
                      style={{
                        width: isMobile ? 44 : 52,
                        height: isMobile ? 44 : 52,
                        borderRadius: 99,
                        background: iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: isMobile ? 10 : 14,
                      }}
                    >
                      {isComplete ? (
                        <CheckCircle2 size={isMobile ? 18 : 22} style={{ color: iconColor }} />
                      ) : isError ? (
                        <AlertCircle size={isMobile ? 18 : 22} style={{ color: iconColor }} />
                      ) : isExport ? (
                        <Download size={isMobile ? 18 : 22} style={{ color: iconColor }} />
                      ) : (
                        <Upload size={isMobile ? 18 : 22} style={{ color: iconColor }} />
                      )}
                    </motion.div>

                    <div style={{ fontSize: isMobile ? 18 : 21, fontWeight: 500, color: 'hsl(var(--foreground))', letterSpacing: '-0.3px', lineHeight: 1.2, marginBottom: 4 }}>
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
                    </div>
                    <div style={{ fontSize: isMobile ? 12 : 13, color: 'hsl(var(--muted-foreground))' }}>
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
                    </div>
                  </motion.div>

                  {/* Body Content */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
                    {/* Progress Bar */}
                    {isProcessing && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.08 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>Progress</span>
                          <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{Math.round(displayProgress)}%</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', height: 8, gap: 2 }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${displayProgress}%` }}
                            transition={{ ease: 'easeOut', duration: 0.2 }}
                            style={{
                              height: '100%',
                              background: 'hsl(var(--primary))',
                              boxShadow: '0 0 8px hsl(var(--primary)/0.25)',
                              flexShrink: 0,
                            }}
                          />
                          <motion.div
                            animate={status === 'preparing' || displayProgress === 0 ? {
                              opacity: [0.3, 0.75, 0.3]
                            } : {
                              opacity: 1
                            }}
                            transition={status === 'preparing' || displayProgress === 0 ? {
                              repeat: Infinity,
                              duration: 1.5,
                              ease: "easeInOut"
                            } : undefined}
                            style={{
                              height: '100%',
                              flex: 1,
                              backgroundImage: 'repeating-linear-gradient(to right, hsl(var(--muted-foreground)/0.25) 0, hsl(var(--muted-foreground)/0.25) 3px, transparent 3px, transparent 6px)',
                              marginLeft: 2
                            }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Stats Card */}
                    {stats && (stats.totalEntries || stats.totalMedia) && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.1 }}
                        style={{
                          borderRadius: 20,
                          border: '1px solid hsl(var(--border)/0.4)',
                          background: 'hsl(var(--muted)/0.12)',
                          backdropFilter: 'blur(10px)',
                          padding: isMobile ? '12px 14px' : '16px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: isMobile ? 10 : 12,
                        }}
                      >
                        {stats.totalEntries !== undefined && (() => {
                          const isEntriesComplete = !isProcessing || (stats.entriesProcessed === stats.totalEntries);
                          const isEntriesActive = isProcessing && !isEntriesComplete && status !== 'preparing';
                          const isEntriesPending = status === 'preparing';
                          
                          let subtext = '';
                          if (isEntriesPending) subtext = 'Waiting...';
                          else if (isEntriesActive) subtext = isExport ? `Saving ${stats.entriesProcessed || 0} of ${stats.totalEntries}...` : `Restoring ${stats.entriesProcessed || 0} of ${stats.totalEntries}...`;
                          else subtext = `${stats.totalEntries} entries ${isExport ? 'exported' : 'imported'}`;

                          return (
                            <div style={{ display: 'flex', gap: isMobile ? 10 : 14, alignItems: 'center' }}>
                              {/* Icon Wrapper */}
                              <div style={{
                                width: isMobile ? 32 : 38,
                                height: isMobile ? 32 : 38,
                                borderRadius: isMobile ? 10 : 12,
                                background: isEntriesComplete ? 'hsl(var(--primary)/0.08)' : 'hsl(var(--primary)/0.03)',
                                color: isEntriesComplete ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground)/0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.3s ease',
                              }}>
                                <EntryPageIcon size={isMobile ? 15 : 18} />
                              </div>
                              
                              {/* Content */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                <span style={{ fontSize: isMobile ? 12.5 : 13, fontWeight: 500, color: 'hsl(var(--foreground))' }}>Entries</span>
                                <span style={{ fontSize: isMobile ? 10.5 : 11, color: 'hsl(var(--muted-foreground)/0.8)', transition: 'all 0.3s ease' }}>
                                  {subtext}
                                </span>
                              </div>

                              {/* Right Side Status */}
                              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                {isEntriesPending && (
                                  <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground)/0.5)', fontWeight: 500 }}>Pending</span>
                                )}
                                {isEntriesActive && (
                                  <Loader2 size={isMobile ? 13 : 14} className="animate-spin text-primary" style={{ color: 'hsl(var(--primary))' }} />
                                )}
                                {isEntriesComplete && (
                                  <CheckCircle2 size={isMobile ? 15 : 16} style={{ color: 'hsl(var(--primary))' }} />
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {stats.totalEntries !== undefined && stats.totalMedia !== undefined && stats.totalMedia > 0 && (
                          <div style={{ height: 1, background: 'hsl(var(--border)/0.2)', margin: '2px 0' }} />
                        )}

                        {stats.totalMedia !== undefined && stats.totalMedia > 0 && (() => {
                          const isMediaComplete = !isProcessing || (stats.mediaProcessed === stats.totalMedia);
                          const isMediaActive = isProcessing && !isMediaComplete && (stats.entriesProcessed === stats.totalEntries || stats.entriesProcessed === undefined);
                          const isMediaPending = isProcessing && !isMediaActive && !isMediaComplete;
                          
                          let subtext = '';
                          if (isMediaPending) subtext = 'Waiting...';
                          else if (isMediaActive) subtext = isExport ? `Saving ${stats.mediaProcessed || 0} of ${stats.totalMedia}...` : `Restoring ${stats.mediaProcessed || 0} of ${stats.totalMedia}...`;
                          else subtext = `${stats.totalMedia} media files ${isExport ? 'exported' : 'imported'}`;

                          return (
                            <div style={{ display: 'flex', gap: isMobile ? 10 : 14, alignItems: 'center' }}>
                              {/* Icon Wrapper */}
                              <div style={{
                                width: isMobile ? 32 : 38,
                                height: isMobile ? 32 : 38,
                                borderRadius: isMobile ? 10 : 12,
                                background: isMediaComplete ? 'hsl(var(--primary)/0.08)' : 'hsl(var(--primary)/0.03)',
                                color: isMediaComplete ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground)/0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.3s ease',
                              }}>
                                <Image size={isMobile ? 15 : 18} />
                              </div>
                              
                              {/* Content */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                <span style={{ fontSize: isMobile ? 12.5 : 13, fontWeight: 500, color: 'hsl(var(--foreground))' }}>Media Files</span>
                                <span style={{ fontSize: isMobile ? 10.5 : 11, color: 'hsl(var(--muted-foreground)/0.8)', transition: 'all 0.3s ease' }}>
                                  {subtext}
                                </span>
                              </div>

                              {/* Right Side Status */}
                              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                {isMediaPending && (
                                  <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground)/0.5)', fontWeight: 500 }}>Pending</span>
                                )}
                                {isMediaActive && (
                                  <Loader2 size={isMobile ? 13 : 14} className="animate-spin text-primary" style={{ color: 'hsl(var(--primary))' }} />
                                )}
                                {isMediaComplete && (
                                  <CheckCircle2 size={isMobile ? 15 : 16} style={{ color: 'hsl(var(--primary))' }} />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* Success Message Card */}
                    {isComplete && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={spring}
                        style={{
                          borderRadius: 20,
                          background: 'hsl(var(--primary)/0.06)',
                          border: '1px solid hsl(var(--primary)/0.15)',
                          padding: isMobile ? '10px 14px' : '14px 18px',
                          display: 'flex',
                          alignItems: 'start',
                          gap: isMobile ? 10 : 12,
                        }}
                      >
                        <CheckCircle2 size={isMobile ? 15 : 18} style={{ color: 'hsl(var(--primary))', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ fontSize: isMobile ? 12 : 13, color: 'hsl(var(--foreground))', lineHeight: 1.45 }}>
                          {isExport
                            ? 'Your backup file has been saved to your downloads folder.'
                            : 'Your notes and media have been successfully restored. The page will reload shortly.'}
                        </div>
                      </motion.div>
                    )}

                    {/* Error Message Card */}
                    {isError && error && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={spring}
                        style={{
                          borderRadius: 20,
                          background: 'rgba(239, 68, 68, 0.06)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'start',
                          gap: 12,
                        }}
                      >
                        <AlertCircle size={18} style={{ color: 'rgb(239, 68, 68)', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ fontSize: 13, color: 'rgb(239, 68, 68)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                          {error}
                        </div>
                      </motion.div>
                    )}


                  </div>

                  {/* Actions CTA Button */}
                  {(isComplete || isError) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.12 }}
                    >
                      <motion.button
                        onClick={onClose}
                        whileTap={{ scale: 0.97 }}
                        transition={spring}
                        style={{
                          width: '100%',
                          height: isMobile ? 48 : 56,
                          borderRadius: 99,
                          background: isComplete ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: isMobile ? 13 : 14,
                          fontWeight: 600,
                          color: isComplete ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                          fontFamily: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isComplete ? 'Done' : 'Close'}
                      </motion.button>
                    </motion.div>
                  )}

                </div>
              </motion.div>
            </DialogPrimitive.Content>

          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </AnimatePresence>
  );
}

export function BackupTestTrigger() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
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
  } | null>(null);

  const simulateProgress = async () => {
    // 1. Fetch actual database counts
    let totalEntries = 120;
    let totalMedia = 15;
    try {
      const allEntries = await db.getEntries();
      const validEntries = allEntries.filter(entry => entry && typeof entry === 'object' && entry.id);
      totalEntries = validEntries.length;
      
      const referencedMediaIds = getReferencedMediaIds(validEntries);
      const media = await mediaStorage.getAllMedia();
      const validMedia = media.filter(m => referencedMediaIds.has(m.id));
      const validMediaIds = new Set(validMedia.map(m => m.id));
      totalMedia = getReferencedMediaCount(validEntries, validMediaIds);
    } catch (e) {
      console.warn('Failed to fetch actual DB counts for simulation, using defaults', e);
    }

    setDialogState({
      isOpen: true,
      type: 'export',
      status: 'preparing',
      progress: 0,
      stats: {
        entriesProcessed: 0,
        totalEntries,
        mediaProcessed: 0,
        totalMedia,
      },
    });
    
    // 2. Transition to processing after 1 second
    setTimeout(() => {
      setDialogState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'processing',
          progress: 5,
        };
      });

      const intervalId = setInterval(() => {
        setDialogState(prev => {
          if (!prev || prev.status !== 'processing') {
            clearInterval(intervalId);
            return prev;
          }

          const nextProgress = Math.min((prev.progress || 0) + 8, 100);
          const nextEntries = Math.min(
            Math.round((nextProgress / 100) * totalEntries),
            totalEntries
          );
          const nextMedia = Math.min(
            Math.round((nextProgress / 100) * totalMedia),
            totalMedia
          );

          if (nextProgress >= 100) {
            clearInterval(intervalId);
            // Transition to complete screen after reaching 100%
            setTimeout(() => {
              setDialogState(p => {
                if (!p) return null;
                return {
                  ...p,
                  status: 'complete',
                  progress: 100,
                  stats: {
                    totalEntries,
                    totalMedia,
                  },
                };
              });
            }, 300);
          }

          return {
            ...prev,
            progress: nextProgress,
            stats: {
              entriesProcessed: nextEntries,
              totalEntries,
              mediaProcessed: nextMedia,
              totalMedia,
            },
          };
        });
      }, 100);
    }, 1000);
  };

  const simulateError = () => {
    setDialogState({
      isOpen: true,
      type: 'export',
      status: 'error',
      error: 'A requested file or directory could not be found at the time an operation was processed.',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[
        { label: 'Preview backup flow (Success)', onClick: simulateProgress },
        { label: 'Preview backup flow (Error)', onClick: simulateError },
      ].map(({ label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          style={{ all: 'unset', cursor: 'pointer', width: '100%', display: 'block' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 11px',
              borderRadius: 10,
              border: '1px dashed hsl(var(--primary)/0.4)',
              fontSize: 12,
              fontWeight: 500,
              color: 'hsl(var(--primary))',
              transition: 'all .15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = 'hsl(var(--primary)/0.07)';
              el.style.borderColor = 'hsl(var(--primary)/0.65)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = 'transparent';
              el.style.borderColor = 'hsl(var(--primary)/0.4)';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
            </svg>
            {label}
          </div>
        </button>
      ))}
      <BackupStatusDialog
        isOpen={dialogState !== null}
        onClose={() => setDialogState(null)}
        type={dialogState?.type || 'export'}
        status={dialogState?.status || 'preparing'}
        progress={dialogState?.progress}
        stats={dialogState?.stats}
        error={dialogState?.error}
      />
    </div>
  );
}
