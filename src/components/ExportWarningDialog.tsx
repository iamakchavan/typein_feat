import { motion, AnimatePresence } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { JsonFileIcon } from './Icons';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ExportWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onUseJson: () => void;
  format: 'md' | 'txt';
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

export function ExportWarningDialog({
  isOpen,
  onClose,
  onContinue,
  onUseJson,
  format,
}: ExportWarningDialogProps) {
  const isMobile = useIsMobile();
  const formatName = format === 'md' ? 'Markdown' : 'Plain Text';

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

                <div style={{ padding: isMobile ? '10px 16px 16px' : '10px 24px 24px', position: 'relative' }}>
                  {/* Close button */}
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
                    style={{ marginBottom: isMobile ? 16 : 24 }}
                  >
                    <div style={{
                      width: isMobile ? 44 : 56,
                      height: isMobile ? 44 : 56,
                      borderRadius: 99,
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: 'rgb(245, 158, 11)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: isMobile ? 12 : 16,
                    }}>
                      <AlertTriangle size={isMobile ? 20 : 24} />
                    </div>
                    <div style={{
                      fontSize: isMobile ? 20 : 26,
                      fontWeight: 600,
                      color: 'hsl(var(--foreground))',
                      letterSpacing: '-0.6px',
                      lineHeight: 1.25,
                      marginBottom: isMobile ? 4 : 6,
                    }}>
                      Some Features May Be Lost
                    </div>
                    <div style={{ fontSize: isMobile ? 12.5 : 14, color: 'hsl(var(--muted-foreground))', lineHeight: 1.45 }}>
                      Exporting as <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>{formatName}</span> may not preserve all formatting and features:
                    </div>
                  </motion.div>

                  {/* Body Content */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24 }}>
                    {/* Warning Points Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.08 }}
                      style={{
                        borderRadius: 20,
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--muted)/0.25)',
                        padding: isMobile ? '12px 14px' : '16px 20px',
                      }}
                    >
                      <ul style={{
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isMobile ? 8 : 10,
                      }}>
                        {[
                          'Tables will lose their structure and formatting',
                          'Media files (images, videos) will not be embedded',
                          'Rich text layout details will be simplified',
                          'Special editor blocks will be flattened to plain text',
                        ].map((point, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'start', gap: 10, fontSize: isMobile ? 12 : 13, color: 'hsl(var(--foreground))', lineHeight: 1.4 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgb(245, 158, 11)', marginTop: isMobile ? 6 : 7, flexShrink: 0 }} />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </motion.div>

                    {/* Recommendation Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.1 }}
                      style={{
                        borderRadius: 99,
                        border: '1px solid hsl(var(--primary)/0.2)',
                        background: 'hsl(var(--primary)/0.04)',
                        padding: isMobile ? '8px 16px 8px 12px' : '12px 24px 12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? 10 : 14,
                      }}
                    >
                      <div style={{
                        width: isMobile ? 32 : 38,
                        height: isMobile ? 32 : 38,
                        borderRadius: 99,
                        flexShrink: 0,
                        background: 'hsl(var(--primary)/0.12)',
                        color: 'hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <JsonFileIcon size={isMobile ? 14 : 16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 2 }}>
                          Recommended: Use JSON
                        </div>
                        <div style={{ fontSize: isMobile ? 10.5 : 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4 }}>
                          JSON format preserves all content, formatting, and media files perfectly.
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Actions CTA buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.12 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}
                  >
                    <motion.button
                      onClick={onUseJson}
                      whileTap={{ scale: 0.975 }}
                      transition={spring}
                      style={{
                        width: '100%',
                        height: isMobile ? 46 : 52,
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
                      <JsonFileIcon size={isMobile ? 14 : 16} />
                      Use JSON (Preserve Everything)
                    </motion.button>
                    
                    <div style={{ display: 'flex', gap: isMobile ? 8 : 12 }}>
                      <motion.button
                        onClick={onClose}
                        whileTap={{ scale: 0.97 }}
                        transition={spring}
                        style={{
                          flex: 1,
                          height: isMobile ? 44 : 50,
                          borderRadius: 99,
                          background: 'hsl(var(--muted))',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: isMobile ? 13 : 14,
                          fontWeight: 500,
                          color: 'hsl(var(--foreground))',
                          fontFamily: 'inherit',
                        }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        onClick={onContinue}
                        whileTap={{ scale: 0.97 }}
                        transition={spring}
                        style={{
                          flex: 1.3,
                          height: isMobile ? 44 : 50,
                          borderRadius: 99,
                          background: 'transparent',
                          border: '1px solid hsl(var(--border))',
                          cursor: 'pointer',
                          fontSize: isMobile ? 12 : 13,
                          fontWeight: 500,
                          color: 'hsl(var(--muted-foreground))',
                          fontFamily: 'inherit',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          padding: '0 8px',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'hsl(var(--muted)/0.5)';
                          e.currentTarget.style.color = 'hsl(var(--foreground))';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                        }}
                      >
                        Continue with {formatName}
                      </motion.button>
                    </div>
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
