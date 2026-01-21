import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSessionStore, useExamStore, useProgressStore } from '../stores';
import { SessionLayout, SessionHeader } from '../components/layout';
import { QuestionDisplay, CompactNavigator } from '../components/question';
import { Timer, LoadingPage } from '../components/common';
import { getSession } from '../db';
import type { SectionType, ScoreResult } from '../types';

/**
 * Active session page for both training and simulation modes
 */
const SessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  
  const { 
    currentSession, 
    answers, 
    flaggedQuestions,
    bookmarkedQuestions,
    isPaused,
    showExplanation,
    sectionTimeRemaining,
    answerQuestion,
    toggleFlag,
    toggleBookmark,
    nextQuestion,
    prevQuestion,
    togglePause,
    setShowExplanation,
    setTimeRemaining,
    completeSession,
    abandonSession,
    loadSession,
  } = useSessionStore();
  
  const { getQuestion, getSection } = useExamStore();
  const { updateProgress } = useProgressStore();

  // Refs for tracking timing
  const questionStartTimeRef = useRef<number>(0);
  
  // Load session from DB if sessionId is provided but no currentSession
  useEffect(() => {
    if (sessionId && !currentSession) {
      getSession(sessionId).then((session) => {
        if (session && session.status === 'in-progress') {
          loadSession(session);
        } else {
          // Session not found or already completed, go home
          navigate('/');
        }
      });
    }
  }, [sessionId, currentSession, loadSession, navigate]);
  
  // Current question ID
  const currentQuestionId = currentSession?.questionIds[currentSession?.currentQuestionIndex ?? 0];
  
  // Derive current question from session state
  const currentQuestion = useMemo(() => {
    if (!currentSession) return null;
    const questionId = currentSession.questionIds[currentSession.currentQuestionIndex];
    return getQuestion(questionId) || null;
  }, [currentSession, getQuestion]);
  
  // Derive selected answer from existing answers (single source of truth)
  const selectedAnswer = useMemo(() => {
    if (!currentSession) return null;
    const questionId = currentSession.questionIds[currentSession.currentQuestionIndex];
    return answers[questionId]?.selectedAnswer || null;
  }, [currentSession, answers]);
  
  // Initialize timer when question changes
  useEffect(() => {
    questionStartTimeRef.current = performance.now();
  }, [currentQuestionId]);

  // Handle session completion
  const handleComplete = useCallback(async () => {
    if (!currentSession) return;
    
    // Calculate score
    const totalQuestions = currentSession.questionIds.length;
    const correctAnswers = Object.values(answers).filter(a => a.isCorrect).length;
    const totalTime = Object.values(answers).reduce((sum, a) => sum + a.timeSpentSeconds, 0);
    
    const score: ScoreResult = {
      raw: {
        correct: correctAnswers,
        total: totalQuestions,
        bySection: {},
      },
      scaled: {
        total: 500, // Placeholder - real calculation is complex
        quantitative: 100,
        verbal: 100,
        english: 100,
      },
      timeStats: {
        totalSeconds: totalTime,
        averagePerQuestion: totalQuestions > 0 ? totalTime / totalQuestions : 0,
        bySection: {},
      },
      isApproximate: true,
    };
    
    await completeSession(score);
    
    // Update progress stats
    const answerArray = Object.values(answers);
    if (answerArray.length > 0) {
      // Get section type from the section's actual type field
      const firstQuestionId = currentSession.questionIds[0];
      const firstQuestion = getQuestion(firstQuestionId);
      if (firstQuestion) {
        // Use the section's type field directly
        const section = getSection(firstQuestion.sectionId);
        const sectionType: SectionType = section?.type || 'verbal';
        
        await updateProgress(
          currentSession.examId || 'training',
          sectionType,
          answerArray
        );
      }
    }
    
    // Navigate to review
    navigate(`/review/${currentSession.id}`);
  }, [currentSession, answers, completeSession, updateProgress, getQuestion, getSection, navigate]);

  // Handle answer selection
  const handleSelectAnswer = useCallback(async (answer: string) => {
    if (!currentQuestion || !currentSession) return;
    
    const timeSpent = Math.round((performance.now() - questionStartTimeRef.current) / 1000);
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    // In training mode, show explanation immediately
    if (currentSession.mode === 'training') {
      setShowExplanation(true);
    }
    
    // Save answer - this updates the answers store, which updates selectedAnswer via useMemo
    await answerQuestion(currentQuestion.id, answer, isCorrect, timeSpent);
  }, [currentQuestion, currentSession, answerQuestion, setShowExplanation]);

  // Handle next question
  const handleNext = useCallback(() => {
    if (!currentSession) return;
    
    // In training mode, need to answer before proceeding
    if (currentSession.mode === 'training' && !selectedAnswer) {
      return;
    }
    
    // Check if this is the last question
    if (currentSession.currentQuestionIndex >= currentSession.questionIds.length - 1) {
      handleComplete();
      return;
    }
    
    setShowExplanation(false);
    nextQuestion();
  }, [currentSession, selectedAnswer, nextQuestion, setShowExplanation, handleComplete]);

  // Handle previous question (training mode only)
  const handlePrevious = useCallback(() => {
    if (!currentSession || currentSession.mode !== 'training') return;
    setShowExplanation(false);
    prevQuestion();
  }, [currentSession, prevQuestion, setShowExplanation]);

  // Handle session exit
  const handleExit = useCallback(async () => {
    await abandonSession();
    navigate('/');
  }, [abandonSession, navigate]);

  // Handle timer tick
  const handleTimerTick = useCallback((remaining: number) => {
    setTimeRemaining(remaining);
  }, [setTimeRemaining]);

  // Handle time up
  const handleTimeUp = useCallback(() => {
    // In simulation mode, auto-advance to next section or complete
    if (currentSession?.mode === 'simulation') {
      handleComplete();
    }
  }, [currentSession, handleComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft': // Next in RTL
          if (selectedAnswer || currentSession?.mode === 'simulation') {
            handleNext();
          }
          break;
        case 'ArrowRight': // Previous in RTL
          handlePrevious();
          break;
        case 'Enter':
          if (selectedAnswer && showExplanation) {
            handleNext();
          }
          break;
        case ' ':
          if (currentSession?.mode === 'simulation') {
            e.preventDefault();
            togglePause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnswer, showExplanation, currentSession, handleNext, handlePrevious, togglePause]);

  // Redirect to home if no session exists
  useEffect(() => {
    if (!currentSession) {
      const timeout = setTimeout(() => {
        navigate('/');
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentSession, navigate]);

  // Loading state
  if (!currentSession || !currentQuestion) {
    return <LoadingPage message="טוען שאלות..." />;
  }

  const isTrainingMode = currentSession.mode === 'training';
  const canShowExplanation = isTrainingMode && selectedAnswer;
  const currentIndex = currentSession.currentQuestionIndex;
  const totalQuestions = currentSession.questionIds.length;
  const answeredCount = Object.keys(answers).length;
  
  // Can navigate to previous only in training mode
  const canGoPrevious = isTrainingMode && currentIndex > 0;
  // Can navigate to next after answering (training) or always (simulation)
  const canGoNext = !isTrainingMode || selectedAnswer !== null;

  return (
    <SessionLayout
      header={
        <SessionHeader
          title={isTrainingMode ? 'תרגול' : 'סימולציה'}
          timer={
            !isTrainingMode && (
              <Timer
                initialSeconds={sectionTimeRemaining}
                onTick={handleTimerTick}
                onTimeUp={handleTimeUp}
                isPaused={isPaused}
                size="sm"
              />
            )
          }
          onPause={!isTrainingMode ? togglePause : undefined}
          onExit={handleExit}
          isPaused={isPaused}
          showPauseButton={!isTrainingMode}
        />
      }
      footer={
        <CompactNavigator
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          answeredCount={answeredCount}
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
        />
      }
    >
      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-40 bg-gray-900/80 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-5xl mb-4">⏸️</div>
            <h2 className="text-2xl font-bold mb-2">המבחן מושהה</h2>
            <p className="text-gray-300 mb-6">לחצי על Space או על כפתור ההפעלה להמשך</p>
            <button
              type="button"
              onClick={togglePause}
              className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              המשך
            </button>
          </div>
        </div>
      )}

      {/* Question content */}
      <div className="p-4 pb-8 max-w-3xl mx-auto">
        <QuestionDisplay
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          onSelectAnswer={handleSelectAnswer}
          showCorrectAnswer={Boolean(canShowExplanation && showExplanation)}
          onToggleFlag={() => toggleFlag(currentQuestion.id)}
          onToggleBookmark={() => toggleBookmark(currentQuestion.id)}
          isFlagged={flaggedQuestions.has(currentQuestion.id)}
          isBookmarked={bookmarkedQuestions.has(currentQuestion.id)}
          questionNumber={currentIndex + 1}
          totalQuestions={totalQuestions}
        />

        {/* Training mode: Show explanation toggle and next button */}
        {isTrainingMode && selectedAnswer && (
          <div className="mt-6 mb-4 space-y-3">
            {!showExplanation && currentQuestion.explanation && (
              <button
                type="button"
                onClick={() => setShowExplanation(true)}
                className="w-full py-3 text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors border border-primary/20"
              >
                הצג הסבר
              </button>
            )}
            
            <button
              type="button"
              onClick={handleNext}
              className="w-full py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              {currentIndex < totalQuestions - 1 ? 'לשאלה הבאה' : 'סיום תרגול'}
            </button>
          </div>
        )}

        {/* Simulation mode: Show centered navigation buttons */}
        {!isTrainingMode && selectedAnswer && (
          <div className="mt-6 mb-4 flex justify-center gap-3">
            {canGoPrevious && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-3 text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors font-medium border border-primary/20"
              >
                הקודמת
              </button>
            )}
            
            <button
              type="button"
              onClick={handleNext}
              className="px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              {currentIndex < totalQuestions - 1 ? 'הבאה' : 'סיום'}
            </button>
          </div>
        )}
      </div>
    </SessionLayout>
  );
};

export default SessionPage;
