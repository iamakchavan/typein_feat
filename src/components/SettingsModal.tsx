import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Download, Upload, Sparkles, ChevronRight, Sun, Moon, Mail, Palette, Check } from 'lucide-react';
import { SettingsIcon } from './Icons';
import { useTheme } from '@/components/ThemeProvider';
import { Slider } from '@/components/ui/slider';
import { fonts } from '@/lib/fonts';
import packageJson from '../../package.json';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onShowOnboarding?: () => void;
}

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

const themeLabels: Record<string, string> = {
  'light': 'Default Light',
  'amethyst-light': 'Amethyst Light',
  'cosmic-light': 'Cosmic Light',
  'perpetuity-light': 'Perpetuity Light',
  'quantum-rose-light': 'Quantum Rose Light',
  'clean-slate-light': 'Clean Slate Light',
  'dark': 'Default Dark',
  'amethyst-dark': 'Amethyst Dark',
  'cosmic-dark': 'Cosmic Dark',
  'perpetuity-dark': 'Perpetuity Dark',
  'quantum-rose-dark': 'Quantum Rose Dark',
  'clean-slate-dark': 'Clean Slate Dark',
};

// Custom FA message-text SVG mask icon for font family
const FontSelectorIcon = () => (
  <svg 
    className="h-[18px] w-[18px] bg-primary flex-shrink-0" 
    aria-hidden="true" 
    focusable="false" 
    style={{
      maskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/message-text.svg")',
      WebkitMaskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/message-text.svg")',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center center',
      WebkitMaskPosition: 'center center',
    }}
  />
);

export function SettingsModal({
  isOpen,
  onClose,
  onExportBackup,
  onImportBackup,
  onShowOnboarding
}: SettingsModalProps) {
  const { theme, setTheme, selectedFont, setSelectedFont, fontSize, setFontSize } = useTheme();

  // Sub-modal states
  const [isFontSheetOpen, setIsFontSheetOpen] = useState(false);
  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false);
  const [isSliding, setIsSliding] = useState(false);

  // Handle pointer up on window to ensure we always release sliding state
  useEffect(() => {
    if (!isSliding) return;
    const handleRelease = () => {
      setIsSliding(false);
    };
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('touchend', handleRelease);
    return () => {
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('touchend', handleRelease);
    };
  }, [isSliding]);

  // Active presets list dependent on current theme mode
  const activePresets = (theme === 'light' || theme.endsWith('-light'))
    ? [
        { value: 'light', label: 'Default Light', gradient: 'linear-gradient(to right, rgb(243, 244, 246), rgb(229, 231, 235))' },
        { value: 'amethyst-light', label: 'Amethyst Light', gradient: 'linear-gradient(to right, rgb(216, 180, 254), rgb(244, 114, 182))' },
        { value: 'cosmic-light', label: 'Cosmic Light', gradient: 'linear-gradient(to right, rgb(147, 197, 253), rgb(192, 132, 252))' },
        { value: 'perpetuity-light', label: 'Perpetuity Light', gradient: 'linear-gradient(to right, rgb(94, 234, 212), rgb(34, 211, 238))' },
        { value: 'quantum-rose-light', label: 'Quantum Rose Light', gradient: 'linear-gradient(to right, rgb(244, 114, 182), rgb(251, 113, 133))' },
        { value: 'clean-slate-light', label: 'Clean Slate Light', gradient: 'linear-gradient(to right, rgb(226, 232, 240), rgb(165, 180, 252))' },
      ]
    : [
        { value: 'dark', label: 'Default Dark', gradient: 'linear-gradient(to right, rgb(55, 65, 81), rgb(31, 41, 55))' },
        { value: 'amethyst-dark', label: 'Amethyst Dark', gradient: 'linear-gradient(to right, rgb(147, 51, 234), rgb(219, 39, 119))' },
        { value: 'cosmic-dark', label: 'Cosmic Dark', gradient: 'linear-gradient(to right, rgb(30, 58, 138), rgb(88, 28, 135))' },
        { value: 'perpetuity-dark', label: 'Perpetuity Dark', gradient: 'linear-gradient(to right, rgb(13, 148, 136), rgb(8, 145, 178))' },
        { value: 'quantum-rose-dark', label: 'Quantum Rose Dark', gradient: 'linear-gradient(to right, rgb(219, 39, 119), rgb(192, 38, 211))' },
        { value: 'clean-slate-dark', label: 'Clean Slate Dark', gradient: 'linear-gradient(to right, rgb(71, 85, 105), rgb(79, 70, 229))' },
      ];

  const selectedFontLabel = fonts.find(f => f.value === selectedFont)?.label || selectedFont;
  const selectedThemeLabel = themeLabels[theme] || theme;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
            <DialogPrimitive.Portal forceMount>
              {/* Backdrop */}
              <DialogPrimitive.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isSliding ? 0 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: isSliding ? 'none' : 'blur(18px)',
                    WebkitBackdropFilter: isSliding ? 'none' : 'blur(18px)',
                    pointerEvents: isSliding ? 'none' : 'auto',
                  }}
                />
              </DialogPrimitive.Overlay>

              {/* Content Sheet */}
              <DialogPrimitive.Content asChild>
                <motion.div
                  drag={isSliding ? false : "y"}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.85 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 300) {
                      onClose();
                    }
                  }}
                  initial={{ y: '100%' }}
                  animate={{ 
                    y: 0,
                    background: isSliding ? 'rgba(0,0,0,0)' : 'hsl(var(--background))',
                    boxShadow: isSliding ? 'none' : '0 -12px 60px rgba(0,0,0,0.15)',
                  }}
                  exit={{ y: '100%' }}
                  transition={{
                    y: springMed,
                    background: { duration: 0.22, ease: 'easeInOut' },
                    boxShadow: { duration: 0.22, ease: 'easeInOut' },
                  }}
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 51,
                    borderRadius: '32px 32px 0 0',
                    outline: 'none',
                    fontFamily: 'inherit',
                    maxWidth: 520,
                    margin: '0 auto',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Drag handle (fixed) */}
                  <motion.div 
                    animate={{ opacity: isSliding ? 0 : 1 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 2, flexShrink: 0, pointerEvents: isSliding ? 'none' : 'auto' }}
                  >
                    <div style={{ width: 38, height: 5, borderRadius: 99, background: 'hsl(var(--muted-foreground)/0.2)' }} />
                  </motion.div>

                  {/* Hero Header (fixed at top, does not scroll) */}
                  <motion.div 
                    animate={{ opacity: isSliding ? 0 : 1 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    style={{ padding: '10px 24px 20px', position: 'relative', flexShrink: 0, pointerEvents: isSliding ? 'none' : 'auto' }}
                  >
                    {/* Close button */}
                    <DialogPrimitive.Close asChild>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
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
                        }}
                      >
                        <X size={16} />
                      </motion.button>
                    </DialogPrimitive.Close>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.04 }}
                    >
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 99,
                        background: 'hsl(var(--primary)/0.1)',
                        color: 'hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}>
                        <SettingsIcon size={24} />
                      </div>
                      <div style={{
                        fontSize: 26,
                        fontWeight: 600,
                        color: 'hsl(var(--foreground))',
                        letterSpacing: '-0.6px',
                        lineHeight: 1.25,
                        marginBottom: 6,
                      }}>
                        Settings
                      </div>
                      <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', lineHeight: 1.45 }}>
                        Customize your workspace, choose themes, and manage data backups.
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Scrollable body content */}
                  <div 
                    className="custom-scrollbar-visible scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
                    style={{ 
                      flex: 1, 
                      overflowY: 'auto', 
                      padding: '0 24px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Card 1: Font Family Selection */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: isSliding ? 0 : 1,
                        y: isSliding ? 10 : 0
                      }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      style={{ marginBottom: 20, pointerEvents: isSliding ? 'none' : 'auto' }}
                    >
                      <div style={{
                        borderRadius: 20,
                        border: '1px solid hsl(var(--border)/0.4)',
                        background: 'hsl(var(--muted)/0.12)',
                        backdropFilter: 'blur(10px)',
                        padding: '8px 0',
                      }}>
                        <button
                          onClick={() => setIsFontSheetOpen(true)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'start',
                            gap: 14,
                            padding: '14px 20px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'background .12s ease-in-out',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--muted)/0.35)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: 'hsl(var(--primary)/0.08)',
                            color: 'hsl(var(--primary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: 2,
                          }}>
                            <FontSelectorIcon />
                          </div>
                          <div style={{ flex: 1, minWidth: 0, marginTop: 2 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 1 }}>Font Family</div>
                            <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground)/0.8)', lineHeight: 1.35 }}>Selected interface typeface</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--muted-foreground))' }} className={`font-${selectedFont}`}>
                              {selectedFontLabel}
                            </span>
                            <svg 
                              className="h-3.5 w-3.5 bg-muted-foreground/60 flex-shrink-0" 
                              aria-hidden="true" 
                              focusable="false" 
                              style={{
                                maskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/sort.svg")',
                                WebkitMaskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/sort.svg")',
                                maskRepeat: 'no-repeat',
                                WebkitMaskRepeat: 'no-repeat',
                                maskPosition: 'center center',
                                WebkitMaskPosition: 'center center',
                              }}
                            />
                          </div>
                        </button>
                      </div>
                    </motion.div>

                    {/* Card 2: Font Size Selection */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: 1,
                        y: 0,
                        background: isSliding ? 'hsla(var(--background)/0.95)' : 'hsl(var(--muted)/0.12)',
                        borderColor: isSliding ? 'hsl(var(--border)/0.65)' : 'hsl(var(--border)/0.4)',
                      }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        padding: '16px 20px',
                        marginBottom: 20,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))' }}>Font Size</span>
                        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums', background: 'hsl(var(--muted))', padding: '2px 8px', borderRadius: 99 }}>
                          {fontSize}px
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>A</span>
                        <div 
                          style={{ flex: 1 }}
                          onPointerDown={() => setIsSliding(true)}
                          onTouchStart={() => setIsSliding(true)}
                        >
                          <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} max={28} min={16} step={1} />
                        </div>
                        <span style={{ fontSize: 18, color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>A</span>
                      </div>
                    </motion.div>

                    {/* Group 2: Theme preferences */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: isSliding ? 0 : 1,
                        y: isSliding ? 10 : 0
                      }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      style={{ marginBottom: 20, pointerEvents: isSliding ? 'none' : 'auto' }}
                    >
                      <div style={{
                        borderRadius: 20,
                        border: '1px solid hsl(var(--border)/0.4)',
                        background: 'hsl(var(--muted)/0.12)',
                        backdropFilter: 'blur(10px)',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 12 }}>Theme Mode</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {[
                              {
                                label: 'Light',
                                Icon: Sun,
                                isActive: theme === 'light' || theme.endsWith('-light'),
                                onClick: () => {
                                  if (theme.includes('-')) {
                                    const base = theme.endsWith('-dark')
                                      ? theme.slice(0, -5)
                                      : theme.endsWith('-light')
                                      ? theme.slice(0, -6)
                                      : theme;
                                    const valMap = {
                                      'amethyst-light': 'amethyst-light',
                                      'cosmic-light': 'cosmic-light',
                                      'perpetuity-light': 'perpetuity-light',
                                      'quantum-rose-light': 'quantum-rose-light',
                                      'clean-slate-light': 'clean-slate-light'
                                    } as Record<string, string>;
                                    setTheme((valMap[`${base}-light`] ?? 'light') as any);
                                  } else {
                                    setTheme('light');
                                  }
                                }
                              },
                              {
                                label: 'Dark',
                                Icon: Moon,
                                isActive: theme === 'dark' || theme.endsWith('-dark'),
                                onClick: () => {
                                  if (theme.includes('-')) {
                                    const base = theme.endsWith('-dark')
                                      ? theme.slice(0, -5)
                                      : theme.endsWith('-light')
                                      ? theme.slice(0, -6)
                                      : theme;
                                    const valMap = {
                                      'amethyst-dark': 'amethyst-dark',
                                      'cosmic-dark': 'cosmic-dark',
                                      'perpetuity-dark': 'perpetuity-dark',
                                      'quantum-rose-dark': 'quantum-rose-dark',
                                      'clean-slate-dark': 'clean-slate-dark'
                                    } as Record<string, string>;
                                    setTheme((valMap[`${base}-dark`] ?? 'dark') as any);
                                  } else {
                                    setTheme('dark');
                                  }
                                }
                              }
                            ].map(({ label, Icon, isActive, onClick }) => (
                              <button
                                key={label}
                                onClick={onClick}
                                style={{
                                  flex: 1,
                                  height: 42,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 8,
                                  fontSize: 13,
                                  fontWeight: 500,
                                  background: isActive ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--muted)/0.4)',
                                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                  border: `1.5px solid ${isActive ? 'hsl(var(--primary)/0.4)' : 'transparent'}`,
                                  borderRadius: 12,
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                  transition: 'all .12s ease-in-out',
                                }}
                                onMouseEnter={e => {
                                  if (!isActive) e.currentTarget.style.background = 'hsl(var(--accent))';
                                }}
                                onMouseLeave={e => {
                                  if (!isActive) e.currentTarget.style.background = 'hsl(var(--muted)/0.4)';
                                }}
                              >
                                <Icon size={16} />
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ height: 1, background: 'hsl(var(--border)/0.2)', margin: '0 -20px' }} />

                        {/* Theme Preset row button */}
                        <button
                          onClick={() => setIsThemeSheetOpen(true)}
                          style={{
                            width: 'calc(100% + 40px)',
                            marginLeft: -20,
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'start',
                            gap: 14,
                            padding: '14px 20px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'background .12s ease-in-out',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--muted)/0.35)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: 'hsl(var(--primary)/0.08)',
                            color: 'hsl(var(--primary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: 2,
                          }}>
                            <Palette size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0, marginTop: 2 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 1 }}>Color Preset</div>
                            <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground)/0.8)', lineHeight: 1.35 }}>Selected color theme preset</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--muted-foreground))' }}>
                              {selectedThemeLabel}
                            </span>
                            <svg 
                              className="h-3.5 w-3.5 bg-muted-foreground/60 flex-shrink-0" 
                              aria-hidden="true" 
                              focusable="false" 
                              style={{
                                maskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/sort.svg")',
                                WebkitMaskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/sort.svg")',
                                maskRepeat: 'no-repeat',
                                WebkitMaskRepeat: 'no-repeat',
                                maskPosition: 'center center',
                                WebkitMaskPosition: 'center center',
                              }}
                            />
                          </div>
                        </button>
                      </div>
                    </motion.div>

                    {/* Group 3: Data Actions & Support */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: isSliding ? 0 : 1,
                        y: isSliding ? 10 : 0
                      }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      style={{ marginBottom: 24, pointerEvents: isSliding ? 'none' : 'auto' }}
                    >
                      <div style={{
                        borderRadius: 20,
                        border: '1px solid hsl(var(--border)/0.4)',
                        background: 'hsl(var(--muted)/0.12)',
                        backdropFilter: 'blur(10px)',
                        padding: '8px 0',
                        display: 'flex',
                        flexDirection: 'column',
                      }}>
                        {[
                          {
                            label: 'Export backup',
                            sub: 'Download all notes and media files',
                            Icon: Download,
                            onClick: () => {
                              onClose();
                              onExportBackup();
                            }
                          },
                          {
                            label: 'Import backup',
                            sub: 'Restore your journal from a ZIP backup',
                            Icon: Upload,
                            onClick: () => {
                              onClose();
                              onImportBackup();
                            }
                          },
                          ...(onShowOnboarding ? [{
                            label: 'Replay onboarding',
                            sub: 'Review the quick intro tour',
                            Icon: Sparkles,
                            onClick: () => {
                              onClose();
                              onShowOnboarding();
                            }
                          }] : []),
                          {
                            label: 'Contact support',
                            sub: 'info@typein.space',
                            Icon: Mail,
                            onClick: () => {
                              window.location.href = 'mailto:info@typein.space';
                            }
                          }
                        ].map(({ label, sub, Icon, onClick }, i, arr) => (
                          <button
                            key={label}
                            onClick={onClick}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'start',
                              gap: 14,
                              padding: '12px 20px',
                              background: 'transparent',
                              border: 'none',
                              borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border)/0.2)' : 'none',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              transition: 'background .12s ease-in-out',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--muted)/0.35)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              background: 'hsl(var(--primary)/0.08)',
                              color: 'hsl(var(--primary))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 2,
                            }}>
                              <Icon size={18} />
                            </div>
                            <div style={{ flex: 1, marginTop: 2 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 1 }}>{label}</div>
                              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground)/0.8)', lineHeight: 1.2 }}>{sub}</div>
                            </div>
                            <ChevronRight size={16} style={{ color: 'hsl(var(--muted-foreground)/0.4)', alignSelf: 'center', marginRight: -4 }} />
                          </button>
                        ))}
                      </div>
                    </motion.div>

                    {/* Version metadata display */}
                    <motion.div 
                      animate={{ opacity: isSliding ? 0 : 1 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      style={{ display: 'flex', justifyContent: 'center', marginTop: 12, pointerEvents: isSliding ? 'none' : 'auto' }}
                    >
                      <div style={{
                        fontSize: 11,
                        color: 'hsl(var(--muted-foreground)/0.7)',
                        fontFamily: 'monospace',
                        background: 'hsl(var(--muted)/0.3)',
                        padding: '4px 10px',
                        borderRadius: 99,
                        border: '1px solid hsl(var(--border)/0.3)',
                      }}>
                        v{packageJson.version}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </AnimatePresence>

      {/* Font Family selector bottom-sheet Modal */}
      <AnimatePresence>
        {isFontSheetOpen && (
          <DialogPrimitive.Root open={isFontSheetOpen} onOpenChange={setIsFontSheetOpen}>
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
                    zIndex: 60,
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
                      setIsFontSheetOpen(false);
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
                    zIndex: 61,
                    background: 'hsl(var(--background))',
                    borderRadius: '32px 32px 0 0',
                    boxShadow: '0 -12px 60px rgba(0,0,0,0.15)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    maxWidth: 520,
                    margin: '0 auto',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Drag handle */}
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 2, flexShrink: 0 }}>
                    <div style={{ width: 38, height: 5, borderRadius: 99, background: 'hsl(var(--muted-foreground)/0.2)' }} />
                  </div>

                  {/* Header */}
                  <div style={{ padding: '10px 24px 20px', position: 'relative', flexShrink: 0 }}>
                    <DialogPrimitive.Close asChild>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
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
                        }}
                      >
                        <X size={16} />
                      </motion.button>
                    </DialogPrimitive.Close>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.04 }}
                    >
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 99,
                        background: 'hsl(var(--primary)/0.1)',
                        color: 'hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}>
                        <FontSelectorIcon />
                      </div>
                      <div style={{
                        fontSize: 24,
                        fontWeight: 600,
                        color: 'hsl(var(--foreground))',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.2,
                        marginBottom: 6,
                      }}>
                        Font Family
                      </div>
                      <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4 }}>
                        Choose your preferred typography for the writing space.
                      </div>
                    </motion.div>
                  </div>

                  {/* Scrollable list */}
                  <div 
                    className="custom-scrollbar-visible scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
                    style={{ 
                      flex: 1, 
                      overflowY: 'auto', 
                      padding: '0 24px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{
                      borderRadius: 20,
                      border: '1px solid hsl(var(--border)/0.4)',
                      background: 'hsl(var(--muted)/0.12)',
                      backdropFilter: 'blur(10px)',
                      overflow: 'hidden',
                    }}>
                      {fonts.map((font, i) => {
                        const isSelected = selectedFont === font.value;
                        return (
                          <button
                            key={font.value}
                            onClick={() => {
                              setSelectedFont(font.value);
                              setIsFontSheetOpen(false);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 20px',
                              background: 'transparent',
                              border: 'none',
                              borderBottom: i < fonts.length - 1 ? '1px solid hsl(var(--border)/0.2)' : 'none',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              transition: 'background .12s ease-in-out',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--muted)/0.35)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span className={`text-[14px] font-${font.value}`} style={{ color: 'hsl(var(--foreground))' }}>
                              {font.label}
                            </span>
                            {isSelected && (
                              <Check size={16} style={{ color: 'hsl(var(--primary))' }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </AnimatePresence>

      {/* Preset Theme selector bottom-sheet Modal */}
      <AnimatePresence>
        {isThemeSheetOpen && (
          <DialogPrimitive.Root open={isThemeSheetOpen} onOpenChange={setIsThemeSheetOpen}>
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
                    zIndex: 60,
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
                      setIsThemeSheetOpen(false);
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
                    zIndex: 61,
                    background: 'hsl(var(--background))',
                    borderRadius: '32px 32px 0 0',
                    boxShadow: '0 -12px 60px rgba(0,0,0,0.15)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    maxWidth: 520,
                    margin: '0 auto',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Drag handle */}
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 2, flexShrink: 0 }}>
                    <div style={{ width: 38, height: 5, borderRadius: 99, background: 'hsl(var(--muted-foreground)/0.2)' }} />
                  </div>

                  {/* Header */}
                  <div style={{ padding: '10px 24px 20px', position: 'relative', flexShrink: 0 }}>
                    <DialogPrimitive.Close asChild>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
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
                        }}
                      >
                        <X size={16} />
                      </motion.button>
                    </DialogPrimitive.Close>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.04 }}
                    >
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 99,
                        background: 'hsl(var(--primary)/0.1)',
                        color: 'hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}>
                        <Palette size={24} />
                      </div>
                      <div style={{
                        fontSize: 24,
                        fontWeight: 600,
                        color: 'hsl(var(--foreground))',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.2,
                        marginBottom: 6,
                      }}>
                        Color Preset
                      </div>
                      <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4 }}>
                        Select a beautiful theme preset designed for your active theme mode.
                      </div>
                    </motion.div>
                  </div>

                  {/* Scrollable list */}
                  <div 
                    className="custom-scrollbar-visible scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
                    style={{ 
                      flex: 1, 
                      overflowY: 'auto', 
                      padding: '0 24px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{
                      borderRadius: 20,
                      border: '1px solid hsl(var(--border)/0.4)',
                      background: 'hsl(var(--muted)/0.12)',
                      backdropFilter: 'blur(10px)',
                      overflow: 'hidden',
                    }}>
                      {activePresets.map((preset, i) => {
                        const isSelected = theme === preset.value;
                        return (
                          <button
                            key={preset.value}
                            onClick={() => {
                              setTheme(preset.value as any);
                              setIsThemeSheetOpen(false);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 20px',
                              background: 'transparent',
                              border: 'none',
                              borderBottom: i < activePresets.length - 1 ? '1px solid hsl(var(--border)/0.2)' : 'none',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              transition: 'background .12s ease-in-out',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--muted)/0.35)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div 
                                style={{ 
                                  width: 18, 
                                  height: 18, 
                                  borderRadius: '50%', 
                                  background: preset.gradient, 
                                  border: '1px solid hsl(var(--border)/0.6)' 
                                }} 
                              />
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))' }}>
                                {preset.label}
                              </span>
                            </div>
                            {isSelected && (
                              <Check size={16} style={{ color: 'hsl(var(--primary))' }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </AnimatePresence>
    </>
  );
}
