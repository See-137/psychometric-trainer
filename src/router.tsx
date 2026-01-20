import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { LoadingPage } from './components/common';

// Lazy load pages for code splitting
const HomePage = React.lazy(() => import('./pages/HomePage'));
const TrainingPage = React.lazy(() => import('./pages/TrainingPage'));
const SimulationPage = React.lazy(() => import('./pages/SimulationPage'));
const SessionPage = React.lazy(() => import('./pages/SessionPage'));
const ReviewPage = React.lazy(() => import('./pages/ReviewPage'));
const ProgressPage = React.lazy(() => import('./pages/ProgressPage'));

// Suspense wrapper for lazy loaded pages
const LazyPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <React.Suspense fallback={<LoadingPage />}>
    {children}
  </React.Suspense>
);

// Router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <LazyPage>
            <HomePage />
          </LazyPage>
        ),
      },
      {
        path: 'training',
        element: (
          <LazyPage>
            <TrainingPage />
          </LazyPage>
        ),
      },
      {
        path: 'simulation',
        element: (
          <LazyPage>
            <SimulationPage />
          </LazyPage>
        ),
      },
      {
        path: 'progress',
        element: (
          <LazyPage>
            <ProgressPage />
          </LazyPage>
        ),
      },
    ],
  },
  {
    // Session page outside of main layout (no bottom nav)
    path: 'session',
    element: (
      <LazyPage>
        <SessionPage />
      </LazyPage>
    ),
  },
  {
    // Session page with optional session ID (for resuming)
    path: 'session/:sessionId',
    element: (
      <LazyPage>
        <SessionPage />
      </LazyPage>
    ),
  },
  {
    // Review page with minimal layout
    path: 'review/:sessionId',
    element: (
      <LazyPage>
        <ReviewPage />
      </LazyPage>
    ),
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
