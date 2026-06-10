import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Hash, FileText, Image, Table2, Code2, Video, Type, CheckCircle2, AlertCircle, X, Loader2, Database } from 'lucide-react';

interface MigrationStatus {
  version: number;
  completedAt?: string;
  totalEntries: number;
  migratedEntries: number;
  failedEntries: string[];
}

type Phase = 'welcome' | 'indexing' | 'migrating' | 'success' | 'partial' | 'empty' | 'error';
interface Props { simulate?: boolean; onClose?: () => void; }

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

const phaseVariants = {
  initial: { opacity: 0, y: 16, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.985 }
};

const phaseTransition = {
  type: 'spring',
  stiffness: 380,
  damping: 38,
  mass: 1
};

const FEATURES = [
  { Icon: Hash, label: 'Headings', desc: 'Structure your notes' },
  { Icon: FileText, label: 'Rich Text', desc: 'Formatting on the fly' },
  { Icon: Image, label: 'Images & Media', desc: 'Embed files and visuals' },
  { Icon: Table2, label: 'Tables', desc: 'Organize data cleanly' },
  { Icon: Code2, label: 'Code Blocks', desc: 'Syntax highlighting' },
  { Icon: Video, label: 'Video & Audio', desc: 'Inline players' },
  { Icon: Type, label: 'Custom Fonts', desc: 'Choose your typeface' },
];

function Counter({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!to) return;
    const t0 = Date.now(), dur = 800;
    const run = () => {
      const p = Math.min((Date.now() - t0) / dur, 1);
      setV(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [to]);
  return <>{v}</>;
}

function Card({ simulate = false, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [indexCount, setIndexCount] = useState(0);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [displayProgress, setDisplayProgress] = useState(0);

  const [height, setHeight] = useState<number | 'auto'>('auto');
  const contentRef = useRef<HTMLDivElement>(null);

  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
  const isMigrating = phase === 'migrating';
  const isDone = phase === 'success' || phase === 'partial';
  const skipped = status?.failedEntries.length ?? 0;

  // ResizeObserver to track height updates fluidly
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setHeight(entry.contentRect.height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Smooth progress bar rendering
  useEffect(() => {
    if (pct > displayProgress) {
      const timer = setTimeout(() => {
        setDisplayProgress(Math.min(displayProgress + 1, pct));
      }, 8);
      return () => clearTimeout(timer);
    } else if (isDone) {
      setDisplayProgress(100);
    }
  }, [pct, displayProgress, isDone]);

  // ── Simulation ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!simulate) return;
    setPhase('welcome');
  }, [simulate]);

  const handleSimContinue = () => {
    setPhase('indexing');
    const SIM = 12;
    setIndexCount(SIM);
    setTimeout(() => {
      setTotal(SIM);
      setPhase('migrating');
      let n = 0;
      const id = setInterval(() => {
        n++;
        setCurrent(n);
        if (n >= SIM) {
          clearInterval(id);
          setTimeout(() => {
            setStatus({
              version: 1,
              completedAt: new Date().toISOString(),
              totalEntries: SIM,
              migratedEntries: SIM - 1,
              failedEntries: ['s1']
            });
            setPhase('partial');
          }, 400);
        }
      }, 150);
    }, 1200);
  };

  // ── Real events ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (simulate) return;
    const onIndex = (e: Event) => {
      const { totalEntries } = (e as CustomEvent).detail;
      setIndexCount(totalEntries);
      setPhase(totalEntries === 0 ? 'empty' : 'indexing');
    };
    const onStart = (e: Event) => {
      setTotal((e as CustomEvent).detail.totalEntries);
      setPhase('migrating');
    };
    const onProgress = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setCurrent(d.migratedCount);
      setTotal(d.totalEntries);
    };
    const onComplete = (e: Event) => {
      const d: MigrationStatus = (e as CustomEvent).detail;
      setStatus(d);
      setPhase(d.failedEntries.length > 0 ? 'partial' : 'success');
    };
    const onError = (e: Event) => {
      setErrorMsg((e as CustomEvent).detail?.message ?? 'Unknown error');
      setPhase('error');
    };
    window.addEventListener('migration-indexing', onIndex);
    window.addEventListener('migration-start',    onStart);
    window.addEventListener('migration-progress', onProgress);
    window.addEventListener('migration-complete', onComplete);
    window.addEventListener('migration-error',    onError);
    return () => {
      window.removeEventListener('migration-indexing', onIndex);
      window.removeEventListener('migration-start',    onStart);
      window.removeEventListener('migration-progress', onProgress);
      window.removeEventListener('migration-complete', onComplete);
      window.removeEventListener('migration-error',    onError);
    };
  }, [simulate]);

  const handleContinue = () => {
    if (simulate) {
      handleSimContinue();
      return;
    }
    window.dispatchEvent(new CustomEvent('migration-ready'));
  };

  return (
    <motion.div
      animate={{ height }}
      transition={springMed}
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      <div ref={contentRef} style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Close button (only visible if simulated or completed) */}
        {(simulate || isDone || phase === 'empty' || phase === 'error') && (
          <DialogPrimitive.Close asChild>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 8,
                right: 20,
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
                zIndex: 10,
              }}
            >
              <X size={16} />
            </motion.button>
          </DialogPrimitive.Close>
        )}

        <AnimatePresence mode="popLayout" initial={false}>
          {/* ════ WELCOME PHASE ════ */}
          {phase === 'welcome' && (
            <motion.div
              key="welcome"
              variants={phaseVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={phaseTransition}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                padding: '18px 24px 24px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {/* Header */}
              <div>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 99,
                  background: 'hsl(var(--primary)/0.1)',
                  color: 'hsl(var(--primary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                }}>
                  <Database size={24} />
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 600,
                  color: 'hsl(var(--foreground))',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.25,
                  marginBottom: 8,
                }}>
                  Upgrade Database
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'hsl(var(--muted-foreground))',
                  lineHeight: 1.5,
                  marginBottom: 4,
                }}>
                  typein has been updated with a beautiful modular rich-text editor. Upgrade your database to enable structure, media, and fonts.
                </p>
              </div>

              <div style={{ height: 1, background: 'hsl(var(--border)/0.3)' }} />

              {/* Features grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What's new</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 274, overflowY: 'auto', paddingRight: 4 }} className="custom-scrollbar-visible">
                  {FEATURES.map((item) => {
                    const Icon = item.Icon;
                    return (
                      <div
                        key={item.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '10px 14px',
                          borderRadius: 20,
                          background: 'hsl(var(--muted)/0.25)',
                          border: '1px solid hsl(var(--border)/0.2)',
                        }}
                      >
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'hsl(var(--primary)/0.08)',
                          color: 'hsl(var(--primary))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={18} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{item.label}</span>
                          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{item.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ height: 1, background: 'hsl(var(--border)/0.3)', marginTop: 4 }} />

              {/* Actions CTA buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  onClick={onClose}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 99,
                    background: 'hsl(var(--muted))',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'hsl(var(--foreground))',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleContinue}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  style={{
                    flex: 2,
                    height: 52,
                    borderRadius: 99,
                    background: 'hsl(var(--primary))',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'hsl(var(--primary-foreground))',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Upgrade Now
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ════ INDEXING PHASE ════ */}
          {phase === 'indexing' && (
            <motion.div
              key="indexing"
              variants={phaseVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={phaseTransition}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                padding: '18px 24px 24px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 99,
                  background: 'hsl(var(--primary)/0.1)',
                  color: 'hsl(var(--primary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                }}>
                  <Loader2 size={24} className="animate-spin" />
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 600,
                  color: 'hsl(var(--foreground))',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.25,
                  marginBottom: 6,
                }}>
                  Scanning Entries
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'hsl(var(--muted-foreground))',
                  lineHeight: 1.45,
                  marginBottom: 16,
                }}>
                  {indexCount > 0 ? (
                    <>Found {indexCount} notes in local storage...</>
                  ) : (
                    'Searching for entries...'
                  )}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                <div style={{ height: 6, background: 'hsl(var(--muted))', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                    style={{ height: '100%', background: 'hsl(var(--primary))', borderRadius: 99 }}
                  />
                </div>
                <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                  Reading browser database cache
                </span>
              </div>
            </motion.div>
          )}

          {/* ════ MIGRATING / DONE PHASE ════ */}
          {(isMigrating || isDone) && (
            <motion.div
              key="migrating"
              variants={phaseVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={phaseTransition}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                padding: '18px 24px 24px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 99,
                  background: 'hsl(var(--primary)/0.1)',
                  color: 'hsl(var(--primary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                }}>
                  {isDone ? (
                    <CheckCircle2 size={24} />
                  ) : (
                    <Loader2 size={24} className="animate-spin" />
                  )}
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 600,
                  color: 'hsl(var(--foreground))',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.25,
                  marginBottom: 6,
                }}>
                  {isDone ? 'Database Ready' : 'Upgrading Notes'}
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'hsl(var(--muted-foreground))',
                  lineHeight: 1.45,
                  marginBottom: 8,
                }}>
                  {isDone ? 'Your notes have been successfully migrated.' : 'Please wait while we convert your entries...'}
                </p>
              </div>

              {/* Progress Bar & Counters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  borderRadius: 20,
                  border: '1px solid hsl(var(--border)/0.4)',
                  background: 'hsl(var(--muted)/0.12)',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Converted</span>
                      <span style={{ fontSize: 22, fontWeight: 500, color: 'hsl(var(--foreground))' }}>
                        {isDone ? <Counter to={status?.migratedEntries ?? current} /> : current}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Entries</span>
                      <span style={{ fontSize: 22, fontWeight: 500, color: 'hsl(var(--foreground))' }}>
                        {total}
                      </span>
                    </div>
                  </div>

                  {/* Progress Segment bar */}
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
                        borderRadius: 99
                      }}
                    />
                    {displayProgress < 100 && (
                      <div style={{
                        height: '100%',
                        flex: 1,
                        backgroundImage: 'repeating-linear-gradient(to right, hsl(var(--muted-foreground)/0.2) 0, hsl(var(--muted-foreground)/0.2) 3px, transparent 3px, transparent 6px)',
                        marginLeft: 2
                      }} />
                    )}
                  </div>
                </div>

                {isDone && skipped > 0 && (
                  <div style={{
                    borderRadius: 20,
                    background: 'hsl(var(--muted)/0.2)',
                    padding: '12px 16px',
                    fontSize: 12,
                    color: 'hsl(var(--muted-foreground))'
                  }}>
                    <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>{skipped} note{skipped === 1 ? '' : 's'}</span> skipped (kept as plain-text format cleanly, no data lost).
                  </div>
                )}
              </div>

              {/* CTA Done Button */}
              {isDone && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.1 }}
                  style={{ marginTop: 8 }}
                >
                  <motion.button
                    onClick={onClose}
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                    style={{
                      width: '100%',
                      height: 52,
                      borderRadius: 99,
                      background: 'hsl(var(--primary))',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'hsl(var(--primary-foreground))',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Let's Write
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ════ EMPTY PHASE ════ */}
          {phase === 'empty' && (
            <motion.div
              key="empty"
              variants={phaseVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={phaseTransition}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                padding: '18px 24px 24px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 99,
                  background: 'hsl(var(--primary)/0.1)',
                  color: 'hsl(var(--primary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                }}>
                  <CheckCircle2 size={24} />
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 600,
                  color: 'hsl(var(--foreground))',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.25,
                  marginBottom: 6,
                }}>
                  Ready to Write
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'hsl(var(--muted-foreground))',
                  lineHeight: 1.5,
                  marginBottom: 28,
                }}>
                  No legacy entries found on this device. You're ready to get started.
                </p>
              </div>

              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 99,
                  background: 'hsl(var(--primary))',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'hsl(var(--primary-foreground))',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Get Started
              </motion.button>
            </motion.div>
          )}

          {/* ════ ERROR PHASE ════ */}
          {phase === 'error' && (
            <motion.div
              key="error"
              variants={phaseVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={phaseTransition}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                padding: '18px 24px 24px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 99,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'rgb(239, 68, 68)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                }}>
                  <AlertCircle size={24} />
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 600,
                  color: 'hsl(var(--foreground))',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.25,
                  marginBottom: 6,
                }}>
                  Migration Error
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'hsl(var(--muted-foreground))',
                  lineHeight: 1.5,
                  marginBottom: 20,
                }}>
                  An error occurred during database migration. Your original notes remain untouched and completely safe.
                </p>
              </div>

              {errorMsg && (
                <div style={{
                  borderRadius: 20,
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  padding: '12px 16px',
                  fontSize: 12,
                  color: 'rgb(239, 68, 68)',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  marginBottom: 24,
                }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 99,
                    background: 'hsl(var(--primary))',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'hsl(var(--primary-foreground))',
                    fontFamily: 'inherit',
                  }}
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 99,
                    background: 'hsl(var(--muted))',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'hsl(var(--foreground))',
                    fontFamily: 'inherit',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function MigrationStatusDialog({ simulate = false, onClose }: Props) {
  const [active, setActive] = useState(simulate);

  useEffect(() => {
    setActive(simulate);
  }, [simulate]);

  useEffect(() => {
    if (simulate) return;
    const open = () => setActive(true);
    window.addEventListener('migration-welcome', open);
    window.addEventListener('migration-indexing', open);
    window.addEventListener('migration-error', open);
    
    // Dispatch that the dialog is mounted and ready to receive events
    console.log('MigrationStatusDialog: Dispatching migration-dialog-mounted');
    window.dispatchEvent(new CustomEvent('migration-dialog-mounted'));
    
    return () => {
      window.removeEventListener('migration-welcome', open);
      window.removeEventListener('migration-indexing', open);
      window.removeEventListener('migration-error', open);
    };
  }, [simulate]);

  const handleClose = () => {
    setActive(false);
    onClose?.();
    window.dispatchEvent(new CustomEvent('migration-cancelled'));
  };

  return (
    <AnimatePresence>
      {active && (
        <DialogPrimitive.Root open={active} onOpenChange={handleClose}>
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
                  zIndex: 9998,
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                }}
              />
            </DialogPrimitive.Overlay>

            {/* Bottom Sheet wrapper */}
            <DialogPrimitive.Content asChild>
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.85 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 300) {
                    handleClose();
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
                  zIndex: 9999,
                  background: 'hsl(var(--background))',
                  borderRadius: '32px 32px 0 0',
                  boxShadow: '0 -12px 60px rgba(0,0,0,0.15)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  maxWidth: 520,
                  margin: '0 auto',
                  paddingBottom: 'env(safe-area-inset-bottom, 24px)',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                }}
              >
                {/* Drag handle line */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 2 }}>
                  <div style={{ width: 38, height: 5, borderRadius: 99, background: 'hsl(var(--muted-foreground)/0.2)' }} />
                </div>

                <Card simulate={simulate} onClose={handleClose} />
              </motion.div>
            </DialogPrimitive.Content>

          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </AnimatePresence>
  );
}

export function MigrationTestTrigger() {
  const [show, setShow] = useState(false);
  return (
    <>
      <button onClick={() => setShow(true)} style={{ all: 'unset', cursor: 'pointer', width: '100%', display: 'block' }}>
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
          Preview migration UI
        </div>
      </button>
      <MigrationStatusDialog simulate={show} onClose={() => setShow(false)} />
    </>
  );
}
