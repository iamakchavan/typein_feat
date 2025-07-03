import { Suspense, lazy } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EntryProvider, useEntries } from '@/contexts/EntryContext';
import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext';
import { Analytics } from '@vercel/analytics/react';
import OnboardingModal from './components/OnboardingModal';
import { WhatsNewModal } from './components/WhatsNewModal';
import React from 'react';

// Lazy load the Editor component
const Editor = lazy(() => import('@/components/Editor').then(module => ({ default: module.Editor })));

// Loading component
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// Inner component that has access to EntryContext
function AppContent() {
  const { createNewEntry } = useEntries();
  const [openCommandPalette, setOpenCommandPalette] = React.useState(false);
  
  const [showOnboarding, setShowOnboarding] = React.useState(() => {
    return localStorage.getItem('typein_onboarding_complete') !== 'true';
  });

  const [showWhatsNew, setShowWhatsNew] = React.useState(() => {
    // Only show to existing users who have completed onboarding but haven't seen v2.0 features
    const hasCompletedOnboarding = localStorage.getItem('typein_onboarding_complete') === 'true';
    const hasSeenWhatsNew = localStorage.getItem('typein_whats_new_v2') === 'true';
    return hasCompletedOnboarding && !hasSeenWhatsNew;
  });

  // Handle URL parameters on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'new') {
      // Create a new entry
      createNewEntry();
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    } else if (action === 'commands') {
      // Open command palette after a short delay to ensure Editor is ready
      setTimeout(() => {
        setOpenCommandPalette(true);
      }, 100);
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [createNewEntry]);

  const handleCloseOnboarding = React.useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('typein_onboarding_complete', 'true');
  }, []);

  const handleCloseWhatsNew = React.useCallback(() => {
    setShowWhatsNew(false);
    localStorage.setItem('typein_whats_new_v2', 'true');
  }, []);

  return (
    <>
      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
      {showWhatsNew && <WhatsNewModal isOpen={showWhatsNew} onClose={handleCloseWhatsNew} />}
      <Suspense fallback={<Loading />}>
        <Editor 
          onShowOnboarding={() => setShowOnboarding(true)}
          openCommandPalette={openCommandPalette}
          setOpenCommandPalette={setOpenCommandPalette}
        />
      </Suspense>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider storageKey="editor-theme">
        <AudioPlayerProvider>
          <EntryProvider>
            <AppContent />
          </EntryProvider>
        </AudioPlayerProvider>
      </ThemeProvider>
      <Analytics />
    </ErrorBoundary>
  );
}

export default App;