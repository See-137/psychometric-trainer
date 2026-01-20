import React, { useEffect, useState, useCallback, useRef } from 'react';

interface TimerProps {
  /** Initial time in seconds */
  initialSeconds: number;
  /** Called when timer reaches zero */
  onTimeUp?: () => void;
  /** Called every second with remaining time */
  onTick?: (remainingSeconds: number) => void;
  /** Whether timer is paused */
  isPaused?: boolean;
  /** Show warning when below this many seconds */
  warningThreshold?: number;
  /** Show critical when below this many seconds */
  criticalThreshold?: number;
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show progress ring */
  showProgress?: boolean;
}

/**
 * Countdown timer component with visual warnings
 * Used for timed exam sections
 */
export const Timer: React.FC<TimerProps> = ({
  initialSeconds,
  onTimeUp,
  onTick,
  isPaused = false,
  warningThreshold = 300, // 5 minutes
  criticalThreshold = 60,  // 1 minute
  className = '',
  size = 'md',
  showProgress = true,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);

  // Update refs when callbacks change
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
    onTickRef.current = onTick;
  }, [onTimeUp, onTick]);

  // Timer logic
  useEffect(() => {
    if (isPaused || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        
        if (next <= 0) {
          clearInterval(interval);
          onTimeUpRef.current?.();
          return 0;
        }
        
        onTickRef.current?.(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, remainingSeconds]);

  // Reset timer if initial value changes
  useEffect(() => {
    setRemainingSeconds(initialSeconds);
  }, [initialSeconds]);

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Determine color state
  const getColorClass = (): string => {
    if (remainingSeconds <= criticalThreshold) {
      return 'text-error';
    }
    if (remainingSeconds <= warningThreshold) {
      return 'text-warning';
    }
    return 'text-gray-700';
  };

  const getBackgroundClass = (): string => {
    if (remainingSeconds <= criticalThreshold) {
      return 'bg-error/10';
    }
    if (remainingSeconds <= warningThreshold) {
      return 'bg-warning/10';
    }
    return 'bg-gray-100';
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-lg px-3 py-2',
    lg: 'text-2xl px-4 py-3',
  };

  // Progress percentage
  const progressPercent = (remainingSeconds / initialSeconds) * 100;

  return (
    <div 
      className={`
        inline-flex items-center gap-2 rounded-lg font-mono font-semibold transition-colors
        ${getBackgroundClass()} ${getColorClass()} ${sizeClasses[size]} ${className}
        ${remainingSeconds <= criticalThreshold ? 'animate-pulse' : ''}
      `}
      role="timer"
      aria-label={`זמן נותר: ${formatTime(remainingSeconds)}`}
    >
      {/* Clock icon */}
      <svg 
        className="w-5 h-5" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>

      {/* Time display */}
      <span dir="ltr">{formatTime(remainingSeconds)}</span>

      {/* Optional progress ring */}
      {showProgress && (
        <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.2"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 10}`}
            strokeDashoffset={`${2 * Math.PI * 10 * (1 - progressPercent / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
      )}

      {/* Pause indicator */}
      {isPaused && (
        <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
          מושהה
        </span>
      )}
    </div>
  );
};

export default Timer;
