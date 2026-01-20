import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    renderWithProviders(
      <ErrorBoundary>
        <div data-testid="child">Hello World</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders error UI when a child throws', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('אופס! משהו השתבש')).toBeInTheDocument();
    expect(screen.getByText('נסה שוב')).toBeInTheDocument();
    expect(screen.getByText('חזרה לדף הבית')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('renders custom fallback when provided', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });
});

describe('Basic Rendering', () => {
  it('renders content correctly', () => {
    const { container } = renderWithProviders(
      <div data-testid="app-root">App Content</div>
    );
    
    expect(container).toBeInTheDocument();
    expect(screen.getByTestId('app-root')).toHaveTextContent('App Content');
  });
});
