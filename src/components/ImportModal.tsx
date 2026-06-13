import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Upload, ChevronRight } from 'lucide-react';
import { JsonFileIcon, MarkdownFileIcon, RestoreBackupIcon, EntryPageIcon, RetainOriginalDateIcon, ImportAsNewEntryIcon, SidebarImportPillIcon, ImportModalTitleIcon } from './Icons';
import { useTheme } from '@/components/ThemeProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useModalHistory } from '@/hooks/useModalHistory';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (format: 'txt' | 'md' | 'json', retainDate: boolean, file: File) => void;
  onImportBackup: () => void;
}

const FORMATS = [
  { value: 'md'   as const, label: 'Markdown',  sub: '.md',   Icon: MarkdownFileIcon },
  { value: 'txt'  as const, label: 'Plain Text', sub: '.txt',  Icon: EntryPageIcon    },
  { value: 'json' as const, label: 'JSON',       sub: '.json', Icon: JsonFileIcon    },
];

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

export function ImportModal({ isOpen, onClose, onImport, onImportBackup }: ImportModalProps) {
  useModalHistory(isOpen, onClose, 'import');
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDarkMode = theme === 'dark' || theme.endsWith('-dark');
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'md' | 'json'>('md');
  const [retainDate, setRetainDate] = useState(true);

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = { txt: '.txt', md: '.md,.markdown', json: '.json' }[selectedFormat];
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImport(selectedFormat, retainDate, file);
        onClose();
      }
    };
    input.click();
  };

  const supportsDate = selectedFormat !== 'txt';

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

            {/* Duplicate floating pill for visual continuity on desktop */}
            <motion.div
              className="md:block hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                bottom: 20,
                left: 18,
                width: 200,
                height: 42,
                zIndex: 55, // above backdrop (50) and content sheet (51)
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 99,
                  border: 'none',
                }}
                className="liquid-glass-dock shadow-lg text-foreground/90"
              >
                <SidebarImportPillIcon className="h-3.5 w-3.5 mr-2 opacity-85" />
                Import Notes
              </div>
            </motion.div>

            {/* Content Sheet */}
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

                <div style={{ padding: isMobile ? '10px 16px 20px' : '10px 24px 24px' }}>

                  {/* Hero Header */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.04 }}
                    style={{ marginBottom: isMobile ? 20 : 28 }}
                  >
                    <div style={{
                      width: isMobile ? 44 : 56,
                      height: isMobile ? 44 : 56,
                      borderRadius: 99,
                      background: 'hsl(var(--primary)/0.1)',
                      color: 'hsl(var(--primary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: isMobile ? 12 : 16,
                    }}>
                      <ImportModalTitleIcon size={isMobile ? 20 : 24} />
                    </div>
                    <div style={{
                      fontSize: isMobile ? 20 : 26,
                      fontWeight: 600,
                      color: 'hsl(var(--foreground))',
                      letterSpacing: '-0.6px',
                      lineHeight: 1.25,
                      marginBottom: isMobile ? 4 : 6,
                    }}>
                      Import Notes
                    </div>
                    <div style={{ fontSize: isMobile ? 12.5 : 14, color: 'hsl(var(--muted-foreground))', lineHeight: 1.45 }}>
                      Choose a format and select a file to import your work.
                    </div>
                  </motion.div>

                  {/* Format Picker */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.07 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                      Format
                    </div>
                    <div style={{
                      display: 'flex',
                      background: 'hsl(var(--muted))',
                      borderRadius: 99,
                      padding: 4,
                      gap: 4,
                      position: 'relative'
                    }}>
                      {FORMATS.map((f) => {
                        const active = selectedFormat === f.value;
                        return (
                          <button
                            key={f.value}
                            onClick={() => setSelectedFormat(f.value)}
                            style={{
                              flex: 1,
                              height: isMobile ? 54 : 64,
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              zIndex: 1,
                            }}
                          >
                            {active && (
                              <motion.div
                                layoutId="active-format-pill"
                                transition={spring}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: isDarkMode ? 'hsl(var(--accent))' : 'hsl(var(--background))',
                                  borderRadius: 99,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.04)',
                                  zIndex: -1,
                                }}
                              />
                            )}
                            <f.Icon
                              size={isMobile ? 14 : 16}
                              style={{
                                color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                transition: 'color 0.2s',
                              }}
                            />
                            <span
                              style={{
                                fontSize: isMobile ? 11 : 12,
                                fontWeight: active ? 600 : 500,
                                color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                                transition: 'color 0.2s',
                              }}
                            >
                              {f.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Date Handling */}
                  <AnimatePresence>
                    {supportsDate && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: 'hidden', willChange: 'height, opacity' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, paddingBottom: 20 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                            Date Setting
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                              { val: true,  label: 'Retain Original Date', sub: "Use the file's original date", Icon: RetainOriginalDateIcon },
                              { val: false, label: 'Import as New Entry',   sub: "Use today's date",            Icon: ImportAsNewEntryIcon },
                            ].map((opt) => {
                              const selected = retainDate === opt.val;
                              return (
                                <motion.button
                                  key={String(opt.val)}
                                  onClick={() => setRetainDate(opt.val)}
                                  whileTap={{ scale: 0.985 }}
                                  transition={spring}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: isMobile ? 10 : 14,
                                    padding: isMobile ? '10px 16px' : '12px 24px 12px 16px',
                                    borderRadius: 99,
                                    background: selected ? 'hsl(var(--primary)/0.04)' : 'hsl(var(--muted)/0.2)',
                                    border: selected ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    position: 'relative',
                                    transition: 'background 0.2s, border-color 0.2s',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: isMobile ? 32 : 38,
                                      height: isMobile ? 32 : 38,
                                      borderRadius: 99,
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: selected ? 'hsl(var(--primary)/0.12)' : 'hsl(var(--muted))',
                                      color: selected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                      transition: 'background 0.2s, color 0.2s',
                                    }}
                                  >
                                    <opt.Icon size={isMobile ? 14 : 16} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div
                                      style={{
                                        fontSize: isMobile ? 12 : 13,
                                        fontWeight: 600,
                                        color: 'hsl(var(--foreground))',
                                        marginBottom: 2,
                                      }}
                                    >
                                      {opt.label}
                                    </div>
                                    <div style={{ fontSize: isMobile ? 10 : 11, color: 'hsl(var(--muted-foreground))' }}>
                                      {opt.sub}
                                    </div>
                                  </div>
                                  <motion.div
                                    animate={{
                                      background: selected ? 'hsl(var(--primary))' : 'transparent',
                                      borderColor: selected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                                      scale: selected ? 1.05 : 1,
                                    }}
                                    transition={spring}
                                    style={{
                                      width: isMobile ? 18 : 22,
                                      height: isMobile ? 18 : 22,
                                      borderRadius: '50%',
                                      flexShrink: 0,
                                      border: '1.5px solid',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <AnimatePresence>
                                      {selected && (
                                        <motion.svg
                                          initial={{ opacity: 0, scale: 0.4 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.4 }}
                                          transition={spring}
                                          width={isMobile ? "8" : "10"}
                                          height={isMobile ? "6" : "8"}
                                          viewBox={isMobile ? "0 0 8 6" : "0 0 10 8"}
                                          fill="none"
                                        >
                                          <path
                                            d={isMobile ? "M1 3l2 2 4-4" : "M1 4l3 3 5-6"}
                                            stroke="hsl(var(--primary-foreground))"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </motion.svg>
                                      )}
                                    </AnimatePresence>
                                  </motion.div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Backup Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                      Backup & Restore
                    </div>
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.1 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => {
                        onImportBackup();
                        onClose();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? 10 : 14,
                        padding: isMobile ? '10px 16px' : '12px 24px 12px 16px',
                        borderRadius: 99,
                        background: 'hsl(var(--muted)/0.2)',
                        border: '1px solid hsl(var(--border))',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'hsl(var(--muted)/0.3)';
                        e.currentTarget.style.borderColor = 'hsl(var(--primary)/0.25)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'hsl(var(--muted)/0.2)';
                        e.currentTarget.style.borderColor = 'hsl(var(--border))';
                      }}
                    >
                      <div style={{
                        width: isMobile ? 32 : 38,
                        height: isMobile ? 32 : 38,
                        borderRadius: 99,
                        flexShrink: 0,
                        background: 'hsl(var(--primary)/0.08)',
                        color: 'hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <RestoreBackupIcon size={isMobile ? 15 : 18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 2 }}>
                          Restore from backup
                        </div>
                        <div style={{ fontSize: isMobile ? 10 : 11, color: 'hsl(var(--muted-foreground))' }}>
                          Import a full .zip backup archive
                        </div>
                      </div>
                      <ChevronRight size={isMobile ? 16 : 18} style={{ color: 'hsl(var(--muted-foreground)/0.4)', flexShrink: 0 }} />
                    </motion.button>
                  </div>

                  {/* Actions CTA buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.12 }}
                    style={{ display: 'flex', gap: isMobile ? 8 : 12 }}
                  >
                    <motion.button
                      onClick={onClose}
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                      style={{
                        flex: 1,
                        height: isMobile ? 48 : 56,
                        borderRadius: 99,
                        background: 'hsl(var(--muted))',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: 600,
                        color: 'hsl(var(--foreground))',
                        fontFamily: 'inherit',
                      }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleFileSelect}
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                      style={{
                        flex: 2,
                        height: isMobile ? 48 : 56,
                        borderRadius: 99,
                        background: 'hsl(var(--primary))',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: 600,
                        color: 'hsl(var(--primary-foreground))',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <Upload size={isMobile ? 14 : 16} />
                      Select File
                    </motion.button>
                  </motion.div>

                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </AnimatePresence>
  );
}
