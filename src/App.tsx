import { Suspense, lazy } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EntryProvider } from '@/contexts/EntryContext';
import { Analytics } from '@vercel/analytics/react';
import OnboardingModal from './components/OnboardingModal';
import React from 'react';

// Lazy load the Editor component
const Editor = lazy(() => import('@/components/Editor').then(module => ({ default: module.Editor })));

// Loading component
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

function App() {
  const [showOnboarding, setShowOnboarding] = React.useState(() => {
    return localStorage.getItem('typein_onboarding_complete') !== 'true';
  });

  const handleCloseOnboarding = React.useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('typein_onboarding_complete', 'true');
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider storageKey="editor-theme">
        <EntryProvider>
          {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
          <Suspense fallback={<Loading />}>
            <Editor onShowOnboarding={() => setShowOnboarding(true)} />
          </Suspense>
          <Toaster />
        </EntryProvider>
      </ThemeProvider>
      <Analytics />
    </ErrorBoundary>
  );
}

export default App;