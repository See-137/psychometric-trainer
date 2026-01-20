import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

/**
 * App header with navigation and actions
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  rightAction,
  className = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Determine title from route if not provided
  const getDefaultTitle = (): string => {
    const path = location.pathname;
    if (path === '/') return 'אימון פסיכומטרי';
    if (path.startsWith('/training')) return 'תרגול';
    if (path.startsWith('/simulation')) return 'סימולציה';
    if (path.startsWith('/progress')) return 'התקדמות';
    if (path.startsWith('/review')) return 'סיכום';
    if (path.startsWith('/settings')) return 'הגדרות';
    return 'אימון פסיכומטרי';
  };

  const displayTitle = title || getDefaultTitle();

  return (
    <header 
      className={`sticky top-0 z-40 bg-white border-b border-gray-200 ${className}`}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-4xl mx-auto">
        {/* Left side (in RTL: right visually) */}
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 -m-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="חזור"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {displayTitle}
        </h1>

        {/* Right side (in RTL: left visually) */}
        <div className="flex items-center gap-2">
          {rightAction || <div className="w-10" />}
        </div>
      </div>
    </header>
  );
};

/**
 * Session header with timer and controls
 */
interface SessionHeaderProps {
  title: string;
  timer?: React.ReactNode;
  onPause?: () => void;
  onExit?: () => void;
  isPaused?: boolean;
  showPauseButton?: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  title,
  timer,
  onPause,
  onExit,
  isPaused = false,
  showPauseButton = true,
}) => {
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4 max-w-4xl mx-auto">
          {/* Exit button */}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-2 -m-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-error transition-colors"
            aria-label="יציאה"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title */}
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>

          {/* Timer and controls */}
          <div className="flex items-center gap-2">
            {timer}
            
            {showPauseButton && onPause && (
              <button
                onClick={onPause}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isPaused 
                    ? 'bg-primary text-white' 
                    : 'text-gray-500 hover:bg-gray-100'}
                `}
                aria-label={isPaused ? 'המשך' : 'השהה'}
              >
                {isPaused ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowExitConfirm(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              לצאת מהמבחן?
            </h2>
            <p className="text-gray-600 mb-6">
              ההתקדמות שלך בתרגול הנוכחי תישמר, אבל לא תוכל/י להמשיך מאותה נקודה.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit?.();
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-error text-white font-medium hover:bg-error/90 transition-colors"
              >
                יציאה
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
