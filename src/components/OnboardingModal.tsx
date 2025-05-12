import React, { useState } from 'react';
import { Button } from './ui/button';

const steps = [
  {
    title: 'Welcome to TypeIn!',
    description: 'A minimal, beautiful journaling app. Your private writing space, organized by day.',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Daily Entries',
    description: 'TypeIn automatically creates a new entry for each day. Use the sidebar to browse your history.',
    image: '',
  },
  {
    title: 'Distraction-Free Editor',
    description: 'Enjoy a clean writing experience with auto-save, keyboard shortcuts, and fullscreen mode.',
    image: '',
  },
  {
    title: 'Customize Your Space',
    description: 'Switch between light/dark themes and choose your favorite font in settings.',
    image: '',
  },
  {
    title: 'Your Data, Your Privacy',
    description: 'All your entries are stored locally in your browser. No accounts, no cloud, 100% private.',
    image: '',
  },
];

export default function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

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