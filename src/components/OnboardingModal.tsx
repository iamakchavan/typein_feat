import { useState, useEffect } from 'react';
import { Button } from './ui/button';

const steps = [
  {
    title: 'Welcome to typein!',
    description: 'A minimal, beautiful journaling app. Your private writing space, organized by day.',
    image: '/OB1.png',
  },
  {
    title: 'Daily Entries',
    description: 'typein automatically creates a new entry for each day. Use the sidebar to browse your history.',
    image: '/OB2.png',
  },
  {
    title: 'Distraction-Free Editor',
    description: 'Enjoy a clean writing experience with auto-save, keyboard shortcuts, and fullscreen mode.',
    image: '/OB3.png',
  },
  {
    title: 'Made for Power Users',
    description: 'command palette, for quick access to features, and powerful search, use Cmd+K or Ctrl+K to open.',
    image: '/cmdk.png',
  },
  {
    title: 'Customize Your Space',
    description: 'Switch between light/dark themes and choose your favorite font in settings.',
    image: '/OB4.png',
  },
  {
    title: 'Your Data, Your Privacy',
    description: 'All your entries are stored locally in your browser. No accounts, no cloud, 100% private.',
    image: '/OB5.png',
  },
];

export default function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  // Preload all images in background
  useEffect(() => {
    const preloadImages = () => {
      steps.forEach(stepData => {
        if (stepData.image) {
          const img = new Image();
          img.src = stepData.image;
        }
      });
    };
    
    // Start preloading after a short delay
    const timer = setTimeout(preloadImages, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 relative flex flex-col items-center">
        {/* Progress bar */}
        <div className="flex justify-center mb-6 w-full">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full mx-1 transition-all duration-300 ${
                i <= step ? 'bg-primary w-8' : 'bg-muted w-4'
              }`}
              style={{ minWidth: 16 }}
            />
          ))}
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">{steps[step].title}</h2>
        <p className="text-muted-foreground text-center mb-6">{steps[step].description}</p>
        {steps[step].image && (
          <img
            src={steps[step].image}
            alt="onboarding step"
            className="rounded-xl mb-6 w-full object-cover max-h-56"
          />
        )}
        <div className="flex w-full gap-2 mt-4">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
          >
            {step === 0 ? 'Skip' : 'Back'}
          </Button>
          {step < steps.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button className="flex-1" onClick={onClose}>
              Finish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 