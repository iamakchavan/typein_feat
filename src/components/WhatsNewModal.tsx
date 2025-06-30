import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Palette, Sparkles } from 'lucide-react';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-4 sm:p-6">
          <DialogHeader className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <DialogTitle className="text-xl sm:text-2xl font-bold">What's New!</DialogTitle>
              <Badge variant="secondary" className="ml-auto text-xs">
                v2.0
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              We've added some amazing new features to enhance your writing experience!
            </p>
          </DialogHeader>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Music Player Feature */}
          <div className="flex gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg">🎵 Ambient Music Player</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Set the perfect writing mood with our new music player! Choose from lofi and ambient tracks, 
                adjust volume, and let the music loop while you write. <span className="hidden sm:inline">Find it in the status bar on desktop.</span>
              </p>
            </div>
          </div>

          {/* Special Themes Feature */}
          <div className="flex gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Palette className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg">🎨 Beautiful Special Themes</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Express your creativity with 6 stunning new themes! From mystical Amethyst to cosmic vibes, 
                futuristic Perpetuity, and romantic Quantum Rose. <span className="hidden sm:inline">Access them in Settings → Special Themes.</span>
              </p>
              <div className="flex gap-1.5 sm:gap-2 mt-2">
                <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-gradient-to-r from-purple-300 to-pink-300" title="Amethyst" />
                <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-gradient-to-r from-blue-300 to-purple-400" title="Cosmic" />
                <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-gradient-to-r from-teal-300 to-cyan-400" title="Perpetuity" />
                <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-gradient-to-r from-pink-300 to-rose-400" title="Quantum Rose" />
              </div>
            </div>
          </div>

          {/* Performance Improvements */}
          <div className="flex gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg">⚡ Performance Improvements</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Faster loading, smoother theme switching, better layout stability, and improved font persistence. 
                Your writing experience is now more fluid than ever!
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 pt-0">
          <Button onClick={onClose} className="w-full text-sm sm:text-base">
            Awesome, let's write! ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 