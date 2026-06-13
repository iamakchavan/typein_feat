import { motion, AnimatePresence } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { DeleteTitleIcon } from './Icons';
import { useIsMobile } from '@/hooks/useIsMobile';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entryTitle: string;
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

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  entryTitle,
}: DeleteConfirmModalProps) {
  const isMobile = useIsMobile();
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
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'rgb(239, 68, 68)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: isMobile ? 12 : 16,
                    }}>
                      <DeleteTitleIcon size={isMobile ? 20 : 24} />
                    </div>
                    <div style={{
                      fontSize: isMobile ? 20 : 26,
                      fontWeight: 600,
                      color: 'hsl(var(--foreground))',
                      letterSpacing: '-0.6px',
                      lineHeight: 1.25,
                      marginBottom: isMobile ? 4 : 6,
                    }}>
                      Delete Entry
                    </div>
                    <div style={{ fontSize: isMobile ? 12.5 : 14, color: 'hsl(var(--muted-foreground))', lineHeight: 1.45 }}>
                      Are you sure you want to delete the entry <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>"{entryTitle}"</span>?
                    </div>
                  </motion.div>

                  {/* Warning message card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={spring}
                    style={{
                      borderRadius: 20,
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      padding: isMobile ? '12px 14px' : '16px 20px',
                      display: 'flex',
                      alignItems: 'start',
                      gap: isMobile ? 10 : 12,
                      marginBottom: isMobile ? 16 : 24,
                    }}
                  >
                    <AlertTriangle size={isMobile ? 15 : 18} style={{ color: 'rgb(239, 68, 68)', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: isMobile ? 12 : 13, color: 'rgb(239, 68, 68)', lineHeight: 1.45, fontWeight: 500 }}>
                      This action is permanent. All text, tables, and media references inside this note will be deleted and cannot be recovered.
                    </div>
                  </motion.div>

                  {/* Actions CTA buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.12 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}
                  >
                    <motion.button
                      onClick={onConfirm}
                      whileTap={{ scale: 0.975 }}
                      transition={spring}
                      style={{
                        width: '100%',
                        height: isMobile ? 48 : 56,
                        borderRadius: 99,
                        background: 'rgb(239, 68, 68)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: 600,
                        color: '#ffffff',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgb(220, 38, 38)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgb(239, 68, 68)';
                      }}
                    >
                      <Trash2 size={isMobile ? 15 : 16} />
                      Delete Entry
                    </motion.button>
                    
                    <motion.button
                      onClick={onClose}
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                      style={{
                        width: '100%',
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