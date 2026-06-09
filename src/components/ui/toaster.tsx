import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Check, AlertTriangle, FileDown, X, Info } from 'lucide-react';
import { CopiedSuccessIcon, PinIcon } from '../Icons';

interface ToastProps {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive' | null;
  duration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isMobile?: boolean;
  [key: string]: any;
}

function getToastIcon(title?: string, description?: string, variant?: string | null) {
  const t = (title || '').toLowerCase();
  const d = (description || '').toLowerCase();
  
  if (variant === 'destructive' || t.includes('fail') || d.includes('fail') || t.includes('error') || d.includes('error')) {
    return <AlertTriangle size={17} className="text-red-500" />;
  }
  if (d.includes('copied') || t.includes('copied')) {
    return <CopiedSuccessIcon size={18} className="text-primary" />;
  }
  if (d.includes('pinned') || d.includes('unpinned') || t.includes('pin')) {
    return <PinIcon size={17} className="text-primary" />;
  }
  if (d.includes('branch') || t.includes('branch')) {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="text-orange-500"
      >
        <path d="M6.02,5.78m0,15.31V4.55m0,0v-1.91m0,3.14v-1.23m0,1.23c0,1.61,1.21,3.11,3.2,3.94l4.58,1.92c1.98,.83,3.2,2.32,3.2,3.94v3.84"></path>
        <path d="M20.53,17.59l-3.41,3.66-3.66-3.41"></path>
      </svg>
    );
  }
  if (d.includes('export') || t.includes('export')) {
    return <FileDown size={16} className="text-primary" />;
  }
  if (d.includes('restore') || t.includes('restore') || d.includes('success') || t.includes('success') || d.includes('imported')) {
    return <Check size={17} className="text-green-500" />;
  }
  return <Info size={16} className="text-primary" />;
}

function ToastItem({ title, description, action, variant, duration = 3000, onOpenChange, isMobile = false }: ToastProps) {
  const [paused, setPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (paused) return;
    const start = Date.now();
    const timer = setTimeout(() => {
      onOpenChange?.(false);
    }, timeLeft);

    return () => {
      clearTimeout(timer);
      setTimeLeft((prev) => Math.max(0, prev - (Date.now() - start)));
    };
  }, [paused, timeLeft, onOpenChange]);

  const hasTitle = !!title;
  const hasDescription = !!description;
  const isCapsule = !hasTitle && hasDescription && typeof description === 'string' && description.length < 50 && !action;

  const icon = getToastIcon(
    typeof title === 'string' ? title : '',
    typeof description === 'string' ? description : '',
    variant
  );

  return (
    <motion.div
      layout
      drag={isMobile ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.8, right: 0.8 }}
      onDragEnd={(_, info) => {
        const swipeThreshold = 80;
        const velocityThreshold = 150;
        if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
          setSwipeDirection(info.offset.x > 0 ? 'right' : 'left');
          onOpenChange?.(false);
        }
      }}
      initial={{ opacity: 0, y: isMobile ? 30 : -30, scale: 0.94, filter: 'blur(5px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{
        opacity: 0,
        x: swipeDirection === 'right' ? 240 : swipeDirection === 'left' ? -240 : 0,
        y: swipeDirection ? 0 : (isMobile ? 20 : -20),
        scale: 0.94,
        filter: 'blur(2px)'
      }}
      transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: 'hsla(var(--background)/0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: variant === 'destructive' 
          ? '1px solid rgba(239, 68, 68, 0.22)' 
          : '1px solid hsl(var(--border)/0.45)',
        boxShadow: variant === 'destructive'
          ? '0 12px 36px rgba(239, 68, 68, 0.08), 0 4px 16px rgba(239, 68, 68, 0.04)'
          : '0 16px 48px rgba(0, 0, 0, 0.1), 0 6px 16px rgba(0, 0, 0, 0.04)',
        color: 'hsl(var(--foreground))',
        fontFamily: 'inherit',
        overflow: 'hidden',
        ...(isCapsule ? {
          borderRadius: 99,
          padding: '10px 20px',
          gap: 10,
          maxWidth: '90vw',
          width: 'max-content',
        } : {
          borderRadius: 99,
          padding: '14px 24px 14px 18px',
          gap: 14,
          width: 360,
          maxWidth: '90vw',
          alignItems: 'center',
        })
      }}
    >
      {/* Icon Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...(isCapsule ? {
          width: 22,
          height: 22,
        } : {
          width: 32,
          height: 32,
          borderRadius: 99,
          background: variant === 'destructive' ? 'rgba(239, 68, 68, 0.08)' : 'hsl(var(--primary)/0.06)',
          color: variant === 'destructive' ? 'rgb(239, 68, 68)' : 'hsl(var(--primary))',
        })
      }}>
        {icon}
      </div>

      {/* Content Section */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isCapsule ? (
          <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.1px', lineHeight: 1.35 }}>
            {description}
          </span>
        ) : (
          <>
            {title && (
              <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.2px', lineHeight: 1.25 }}>
                {title}
              </span>
            )}
            {description && (
              <span style={{ 
                fontSize: 13, 
                color: 'hsl(var(--muted-foreground))', 
                lineHeight: 1.4,
                fontWeight: 450,
              }}>
                {description}
              </span>
            )}
          </>
        )}
      </div>

      {/* Action Block */}
      {action && (
        <div style={{ flexShrink: 0, marginLeft: 8 }}>
          {action}
        </div>
      )}

      {/* Close button for non-capsules */}
      {!isCapsule && (
        <button
          onClick={() => onOpenChange?.(false)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: 'hsl(var(--muted-foreground)/0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            marginLeft: 6,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'hsl(var(--foreground))';
            e.currentTarget.style.backgroundColor = 'hsl(var(--muted))';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'hsl(var(--muted-foreground)/0.5)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={14} />
        </button>
      )}
    </motion.div>
  );
}

export function Toaster() {
  const { toasts } = useToast();
  const activeToasts = toasts.filter((t) => t.open !== false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
        width: 'max-content',
        maxWidth: '100vw',
        ...(isMobile ? { bottom: 24 } : { top: 24 })
      }}
    >
      <AnimatePresence mode="popLayout">
        {activeToasts.map((toast) => (
          <ToastItem key={toast.id} isMobile={isMobile} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
