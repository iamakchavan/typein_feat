import { Suspense, lazy } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EntryProvider, useEntries } from '@/contexts/EntryContext';
import { Analytics } from '@vercel/analytics/react';
import { MigrationStatusDialog } from './components/MigrationStatusDialog';
import React from 'react';

// Lazy load the BlockNote Editor component
const Editor = lazy(() => import('@/components/EditorBlockNote').then(module => ({ default: module.EditorBlockNote })));

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

  return (
    <>
      <MigrationStatusDialog />
      <Suspense fallback={<Loading />}>
        <Editor 
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
        <EntryProvider>
          <AppContent />
        </EntryProvider>
      </ThemeProvider>
      <Analytics />
    </ErrorBoundary>
  );
}

export default App;