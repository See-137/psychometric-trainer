import React from 'react';
import type { Question, UserAnswer } from '../../types';

interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  flaggedQuestions: Set<string>;
  onNavigate: (index: number) => void;
  className?: string;
}

/**
 * Question navigator grid showing all questions with status indicators
 * Allows jumping to any question in the session
 */
export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentIndex,
  answers,
  flaggedQuestions,
  onNavigate,
  className = '',
}) => {
  const getQuestionState = (question: Question, index: number) => {
    const isCurrent = index === currentIndex;
    const isAnswered = !!answers[question.id];
    const isFlagged = flaggedQuestions.has(question.id);

    return { isCurrent, isAnswered, isFlagged };
  };

  const getButtonClasses = (state: { isCurrent: boolean; isAnswered: boolean; isFlagged: boolean }) => {
    const base = 'w-10 h-10 rounded-lg font-medium text-sm transition-all relative';
    
    if (state.isCurrent) {
      return `${base} bg-primary text-white ring-2 ring-primary ring-offset-2`;
    }
    
    if (state.isAnswered) {
      return `${base} bg-success/20 text-success hover:bg-success/30`;
    }
    
    return `${base} bg-gray-100 text-gray-600 hover:bg-gray-200`;
  };

  // Group questions by section if needed
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flaggedQuestions.size;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">ניווט שאלות</h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">
            נענו: <span className="font-medium text-success">{answeredCount}</span>/{questions.length}
          </span>
          {flaggedCount > 0 && (
            <span className="text-warning">
              מסומנות: {flaggedCount}
            </span>
          )}
        </div>
      </div>

      {/* Question grid */}
      <div className="grid grid-cols-5 gap-2">
        {questions.map((question, index) => {
          const state = getQuestionState(question, index);
          
          return (
            <button
              type="button"
              key={question.id}
              onClick={() => onNavigate(index)}
              className={getButtonClasses(state)}
              title={`שאלה ${index + 1}${state.isFlagged ? ' (מסומנת)' : ''}`}
            >
              {index + 1}
              
              {/* Flag indicator */}
              {state.isFlagged && (
                <span className="absolute -top-1 -end-1 w-3 h-3 bg-warning rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary" />
          <span>נוכחית</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success/20 border border-success/30" />
          <span>נענתה</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
          <span>לא נענתה</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-warning" />
          <span>מסומנת</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact horizontal navigator for mobile/bottom bar
 */
interface CompactNavigatorProps {
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onOpenFullNavigator?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

export const CompactNavigator: React.FC<CompactNavigatorProps> = ({
  currentIndex,
  totalQuestions,
  answeredCount,
  onPrevious,
  onNext,
  onOpenFullNavigator,
  canGoPrevious = true,
  canGoNext = true,
}) => {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        {/* Previous button */}
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={`
            flex items-center gap-1 px-4 py-2.5 rounded-lg transition-colors font-medium
            ${canGoPrevious 
              ? 'text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20' 
              : 'text-gray-300 cursor-not-allowed bg-gray-50'}
          `}
        >
          <ChevronIcon direction="right" className="w-5 h-5" />
          <span className="text-sm">הקודמת</span>
        </button>

        {/* Center status */}
        <button
          type="button"
          onClick={onOpenFullNavigator}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <span className="font-medium">
            {currentIndex + 1} / {totalQuestions}
          </span>
          <span className="text-xs text-gray-500">
            ({answeredCount} נענו)
          </span>
        </button>

        {/* Next button */}
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className={`
            flex items-center gap-1 px-4 py-2.5 rounded-lg transition-colors font-medium shadow-sm
            ${canGoNext 
              ? 'text-white bg-primary hover:bg-primary/90' 
              : 'text-gray-300 cursor-not-allowed bg-gray-50'}
          `}
        >
          <span className="text-sm">הבאה</span>
          <ChevronIcon direction="left" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Chevron icon (flipped for RTL)
const ChevronIcon: React.FC<{ direction: 'left' | 'right'; className?: string }> = ({ 
  direction, 
  className = 'w-5 h-5' 
}) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    {direction === 'left' ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    )}
  </svg>
);

export default QuestionNavigator;
