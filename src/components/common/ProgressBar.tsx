import React from 'react';

interface ProgressBarProps {
  /** Current value (0-100 or custom max) */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Show percentage text */
  showLabel?: boolean;
  /** Custom label */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'gradient';
  /** Animate progress changes */
  animated?: boolean;
  /** Show striped pattern */
  striped?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Progress bar component for showing completion status
 * Used for session progress, accuracy, study goals
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = false,
  label,
  size = 'md',
  variant = 'primary',
  animated = true,
  striped = false,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantClasses = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    gradient: 'bg-gradient-to-l from-primary to-success',
  };

  const stripedPattern = striped
    ? 'bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)]'
    : '';

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1 text-sm">
          <span className="text-gray-600">{label || 'התקדמות'}</span>
          <span className="font-medium text-gray-900">
            {Math.round(percentage)}%
          </span>
        </div>
      )}

      {/* Track */}
      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {/* Fill */}
        <div
          className={`
            h-full rounded-full
            ${variantClasses[variant]}
            ${stripedPattern}
            ${animated ? 'transition-all duration-500 ease-out' : ''}
            ${striped ? 'animate-[progress-stripes_1s_linear_infinite]' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Circular progress indicator
 */
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  variant = 'primary',
  showLabel = true,
  label,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: 'stroke-primary',
    success: 'stroke-success',
    warning: 'stroke-warning',
    error: 'stroke-error',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colorClasses[variant]} transition-all duration-500 ease-out`}
        />
      </svg>
      
      {/* Center content */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">
            {Math.round(percentage)}%
          </span>
          {label && (
            <span className="text-xs text-gray-500">{label}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
