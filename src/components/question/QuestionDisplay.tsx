import React, { useState } from 'react';
import type { Question, QuestionType, Option } from '../../types';
import VisualContentParser from './VisualContentParser';

interface QuestionDisplayProps {
  question: Question;
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  showCorrectAnswer: boolean;
  onToggleFlag?: () => void;
  onToggleBookmark?: () => void;
  isFlagged?: boolean;
  isBookmarked?: boolean;
  questionNumber?: number;
  totalQuestions?: number;
  isReviewMode?: boolean;
  className?: string;
}

/**
 * Main question display component
 * Handles multiple choice questions with Hebrew RTL support
 */
export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  selectedAnswer,
  onSelectAnswer,
  showCorrectAnswer,
  onToggleFlag,
  onToggleBookmark,
  isFlagged = false,
  isBookmarked = false,
  questionNumber,
  totalQuestions,
  isReviewMode = false,
  className = '',
}) => {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key;
      
      // Option selection (1-4 keys)
      const optionIndex = ['1', '2', '3', '4'].indexOf(key);
      if (optionIndex !== -1 && question.options[optionIndex]) {
        e.preventDefault();
        if (!showCorrectAnswer || isReviewMode) {
          onSelectAnswer(question.options[optionIndex].label);
        }
      }

      // Flag toggle (F key)
      if (key.toLowerCase() === 'f' && onToggleFlag) {
        e.preventDefault();
        onToggleFlag();
      }

      // Bookmark toggle (B key)
      if (key.toLowerCase() === 'b' && onToggleBookmark) {
        e.preventDefault();
        onToggleBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, onSelectAnswer, showCorrectAnswer, isReviewMode, onToggleFlag, onToggleBookmark]);

  // Determine option state for styling
  const getOptionState = (option: Option): 'default' | 'selected' | 'correct' | 'incorrect' | 'missed' => {
    if (!showCorrectAnswer) {
      return option.label === selectedAnswer ? 'selected' : 'default';
    }

    const isCorrect = option.label === question.correctAnswer;
    const isSelected = option.label === selectedAnswer;

    if (isCorrect) return 'correct';
    if (isSelected && !isCorrect) return 'incorrect';
    return 'default';
  };

  const optionStateClasses = {
    default: 'border-gray-200 hover:border-primary/50 hover:bg-primary/5',
    selected: 'border-primary bg-primary/10 ring-2 ring-primary/20',
    correct: 'border-success bg-success/10 ring-2 ring-success/20',
    incorrect: 'border-error bg-error/10 ring-2 ring-error/20',
    missed: 'border-warning bg-warning/10',
  };

  // Use numbers for English section questions, Hebrew letters for others
  // English question types: sentence-completion-english, restatement, reading-comprehension-english
  const englishQuestionTypes = ['sentence-completion-english', 'restatement', 'reading-comprehension-english'];
  const isEnglishQuestion = englishQuestionTypes.includes(question.type);
  const optionLetters = isEnglishQuestion 
    ? ['1', '2', '3', '4'] 
    : ['א', 'ב', 'ג', 'ד'];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Question header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {questionNumber && totalQuestions && (
            <span className="text-sm text-gray-500">
              שאלה {questionNumber} מתוך {totalQuestions}
            </span>
          )}
          <QuestionTypeBadge type={question.type} />
        </div>

        <div className="flex items-center gap-2">
          {/* Flag button */}
          {onToggleFlag && (
            <button
              type="button"
              onClick={onToggleFlag}
              className={`p-2 rounded-lg transition-colors ${
                isFlagged
                  ? 'bg-warning/20 text-warning'
                  : 'hover:bg-gray-100 text-gray-400'
              }`}
              title="סמן לבדיקה (F)"
              aria-label={isFlagged ? 'הסר סימון' : 'סמן לבדיקה'}
            >
              <FlagIcon filled={isFlagged} />
            </button>
          )}

          {/* Bookmark button */}
          {onToggleBookmark && (
            <button
              type="button"
              onClick={onToggleBookmark}
              className={`p-2 rounded-lg transition-colors ${
                isBookmarked
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-gray-100 text-gray-400'
              }`}
              title="שמור לתרגול (B)"
              aria-label={isBookmarked ? 'הסר מהשמורים' : 'שמור לתרגול'}
            >
              <BookmarkIcon filled={isBookmarked} />
            </button>
          )}
        </div>
      </div>

      {/* Question text */}
      <div className="px-6 py-5" dir="auto">
        <p className="text-lg text-gray-900 leading-relaxed whitespace-pre-wrap" 
           style={{ 
             unicodeBidi: 'plaintext', 
             textAlign: 'start',
             lineHeight: '1.6'
           }}>
          {question.stem}
        </p>

        {/* Media content (if any) */}
        {question.images && question.images.length > 0 && (
          <div className="mt-4">
            <img
              src={question.images[0].filename}
              alt={question.images[0].alt || 'תמונה לשאלה'}
              className="max-w-full rounded-lg border border-gray-200"
            />
          </div>
        )}

        {/* Visual content parser for mathematical diagrams */}
        <VisualContentParser content={question.stem} />

        {/* Passage (for reading comprehension) */}
        {question.passage && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200" dir="auto">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" 
               style={{ 
                 unicodeBidi: 'plaintext', 
                 textAlign: 'start',
                 lineHeight: '1.6'
               }}>
              {question.passage}
            </p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="px-6 pb-6 space-y-3">
        {question.options.map((option, index) => {
          const state = getOptionState(option);
          const letter = optionLetters[index];
          const keyNumber = index + 1;

          return (
            <button
              type="button"
              key={index}
              onClick={() => {
                // Allow selection when answer isn't shown, or in review mode
                if (!showCorrectAnswer || isReviewMode) {
                  onSelectAnswer(option.label);
                }
              }}
              onMouseEnter={() => setHoveredOption(option.label)}
              onMouseLeave={() => setHoveredOption(null)}
              disabled={showCorrectAnswer && !isReviewMode}
              className={`
                w-full text-start p-4 rounded-lg border-2 transition-all
                ${optionStateClasses[state]}
                ${showCorrectAnswer && !isReviewMode ? 'cursor-default' : 'cursor-pointer'}
              `}
              aria-pressed={option.label === selectedAnswer}
            >
              <div className="flex items-start gap-3">
                {/* Option letter circle */}
                <span
                  className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    text-sm font-medium transition-colors
                    ${state === 'selected' ? 'bg-primary text-white' : ''}
                    ${state === 'correct' ? 'bg-success text-white' : ''}
                    ${state === 'incorrect' ? 'bg-error text-white' : ''}
                    ${state === 'default' ? 'bg-gray-100 text-gray-600' : ''}
                  `}
                >
                  {letter}
                </span>

                {/* Option text */}
                <span className="flex-1 text-gray-900 pt-1" 
                      style={{ 
                        unicodeBidi: 'plaintext', 
                        textAlign: 'start',
                        lineHeight: '1.5' 
                      }}>
                  {option.text}
                </span>

                {/* Keyboard shortcut hint */}
                {hoveredOption === option.label && !showCorrectAnswer && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {keyNumber}
                  </span>
                )}

                {/* Correct/Incorrect indicator */}
                {showCorrectAnswer && state === 'correct' && (
                  <CheckIcon className="w-5 h-5 text-success" />
                )}
                {showCorrectAnswer && state === 'incorrect' && (
                  <XIcon className="w-5 h-5 text-error" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation (shown after answering) */}
      {showCorrectAnswer && question.explanation && (
        <div className="px-6 pb-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <LightBulbIcon className="w-5 h-5" />
              הסבר
            </h4>
            <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
              {question.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Question type badge
interface QuestionTypeBadgeProps {
  type: QuestionType;
}

const QuestionTypeBadge: React.FC<QuestionTypeBadgeProps> = ({ type }) => {
  const labels: Record<QuestionType, string> = {
    // Quantitative
    'algebra': 'אלגברה',
    'geometry': 'גאומטריה',
    'data-interpretation': 'פרשנות נתונים',
    'word-problem': 'בעיות מילוליות',
    'sequences': 'סדרות',
    'probability': 'הסתברות',
    'arithmetic': 'חשבון',
    // Verbal
    'analogy': 'אנלוגיות',
    'sentence-completion': 'השלמת משפטים',
    'reading-comprehension-hebrew': 'הבנת הנקרא',
    'logic': 'חשיבה לוגית',
    // English
    'sentence-completion-english': 'השלמת משפטים',
    'restatement': 'ניסוח מחדש',
    'reading-comprehension-english': 'הבנת הנקרא',
  };

  const colors: Record<QuestionType, string> = {
    // Quantitative - greens
    'algebra': 'bg-emerald-100 text-emerald-800',
    'geometry': 'bg-teal-100 text-teal-800',
    'data-interpretation': 'bg-cyan-100 text-cyan-800',
    'word-problem': 'bg-green-100 text-green-800',
    'sequences': 'bg-lime-100 text-lime-800',
    'probability': 'bg-green-100 text-green-800',
    'arithmetic': 'bg-emerald-100 text-emerald-800',
    // Verbal - blues/purples
    'analogy': 'bg-indigo-100 text-indigo-800',
    'sentence-completion': 'bg-purple-100 text-purple-800',
    'reading-comprehension-hebrew': 'bg-blue-100 text-blue-800',
    'logic': 'bg-violet-100 text-violet-800',
    // English - oranges
    'sentence-completion-english': 'bg-orange-100 text-orange-800',
    'restatement': 'bg-amber-100 text-amber-800',
    'reading-comprehension-english': 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[type]}`}>
      {labels[type]}
    </span>
  );
};

// Icon components
const FlagIcon: React.FC<{ filled?: boolean; className?: string }> = ({ filled, className = 'w-5 h-5' }) => (
  <svg className={className} fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
);

const BookmarkIcon: React.FC<{ filled?: boolean; className?: string }> = ({ filled, className = 'w-5 h-5' }) => (
  <svg className={className} fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LightBulbIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

export default QuestionDisplay;
