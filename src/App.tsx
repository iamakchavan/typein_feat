import { Suspense, lazy } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EntryProvider } from '@/contexts/EntryContext';

// Lazy load the Editor component
const Editor = lazy(() => import('@/components/Editor').then(module => ({ default: module.Editor })));

// Loading component
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider storageKey="editor-theme">
        <EntryProvider>
          <Suspense fallback={<Loading />}>
            <Editor />
          </Suspense>
          <Toaster />
        </EntryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;