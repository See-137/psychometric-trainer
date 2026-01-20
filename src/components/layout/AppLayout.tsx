import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

interface AppLayoutProps {
  children?: React.ReactNode;
}

/**
 * Main application layout with header and bottom navigation
 * Provides consistent structure for all pages
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-1 pb-20">
        {children || <Outlet />}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

/**
 * Session layout without bottom navigation
 * Used during active training/simulation sessions
 */
interface SessionLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const SessionLayout: React.FC<SessionLayoutProps> = ({
  children,
  header,
  footer,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Session header */}
      {header}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Footer (e.g., compact navigator) */}
      {footer}
    </div>
  );
};

/**
 * Centered content layout for modals, results, etc.
 */
interface CenteredLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CenteredLayout: React.FC<CenteredLayoutProps> = ({
  children,
  maxWidth = 'lg',
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className={`w-full ${maxWidthClasses[maxWidth]}`}>
        {children}
      </div>
    </div>
  );
};

export default AppLayout;
