import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore, useExamStore } from '../stores';
import { Card, CardHeader, Button, CircularProgress, LoadingPage } from '../components/common';
import { getSession, getAnswersBySession } from '../db';
import type { Session, UserAnswer } from '../types';

/**
 * Review page showing session results after completion
 */
const ReviewPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const { currentSession, answers, resetSession } = useSessionStore();
  const { getQuestion } = useExamStore();
  
  // Local state for session loaded from DB
  const [loadedSession, setLoadedSession] = useState<Session | null>(null);
  const [loadedAnswers, setLoadedAnswers] = useState<UserAnswer[]>([]);
  
  // Determine if we need to load from DB
  const needsLoad = !currentSession && sessionId && !loadedSession;

  // Try to load session from DB if not in store
  useEffect(() => {
    if (needsLoad) {
      let cancelled = false;
      
      Promise.all([
        getSession(sessionId!),
        getAnswersBySession(sessionId!)
      ]).then(([session, sessionAnswers]) => {
        if (cancelled) return;
        
        if (session) {
          setLoadedSession(session);
          setLoadedAnswers(sessionAnswers);
        } else {
          navigate('/');
        }
      }).catch(() => {
        if (!cancelled) {
          navigate('/');
        }
      });
      
      return () => {
        cancelled = true;
      };
    }
  }, [needsLoad, sessionId, navigate]);

  // Use store data if available, otherwise use loaded data
  const session = currentSession || loadedSession;
  const answersList = currentSession 
    ? Object.values(answers) 
    : loadedAnswers;
  
  // Loading state - show while we're fetching from DB
  if (needsLoad) {
    return <LoadingPage message="טוען תוצאות..." />;
  }

  // If no session at all, redirect
  if (!session && !sessionId) {
    return null;
  }
  
  if (!session) {
    return null;
  }

  const score = session.score;

  // Group answers by correctness
  const correctQuestions = answersList.filter(a => a.isCorrect);
  const incorrectQuestions = answersList.filter(a => !a.isCorrect);

  // Calculate average time
  const avgTime = answersList.length > 0
    ? answersList.reduce((sum, a) => sum + a.timeSpentSeconds, 0) / answersList.length
    : 0;

  // Helper to get percentage from score
  const getPercentage = () => {
    if (!score) return 0;
    return score.raw.total > 0 ? (score.raw.correct / score.raw.total) * 100 : 0;
  };
  
  const percentage = getPercentage();

  const handleNewSession = () => {
    resetSession();
    navigate('/training');
  };

  const handleGoHome = () => {
    resetSession();
    navigate('/');
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="text-center py-4">
        <div className="text-5xl mb-4">
          {percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '💪'}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {session.mode === 'training' ? 'סיום תרגול' : 'סיום סימולציה'}
        </h1>
        <p className="text-gray-600 mt-1">
          הנה הסיכום שלך
        </p>
      </div>

      {/* Score overview */}
      {score && (
        <Card className="text-center py-6">
          <CircularProgress
            value={score.raw.correct}
            max={score.raw.total}
            size={140}
            strokeWidth={12}
            variant={percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'error'}
          />
          <div className="mt-4 space-y-2">
            <div className="text-3xl font-bold text-gray-900">
              {score.raw.correct} / {score.raw.total}
            </div>
            <div className="text-lg text-gray-500">
              {Math.round(percentage)}% הצלחה
            </div>
          </div>
        </Card>
      )}

      {/* Stats breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-success">
            {correctQuestions.length}
          </div>
          <div className="text-xs text-gray-500">נכונות</div>
        </Card>
        
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-error">
            {incorrectQuestions.length}
          </div>
          <div className="text-xs text-gray-500">שגויות</div>
        </Card>
        
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-gray-700">
            {Math.round(avgTime)}שׁ
          </div>
          <div className="text-xs text-gray-500">זמן ממוצע</div>
        </Card>
      </div>

      {/* Incorrect answers review */}
      {incorrectQuestions.length > 0 && (
        <Card>
          <CardHeader 
            title="שאלות לחזרה"
            subtitle={`${incorrectQuestions.length} שאלות לא נענו נכון`}
          />
          <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
            {incorrectQuestions.map((answer, index) => {
              const question = getQuestion(answer.questionId);
              if (!question) return null;

              return (
                <div key={answer.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-error/20 text-error rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 line-clamp-2">{question.stem}</p>
                      
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-error">✗</span>
                          <span className="text-gray-600">התשובה שלך:</span>
                          <span className="font-medium">{answer.selectedAnswer}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-success">✓</span>
                          <span className="text-gray-600">התשובה הנכונה:</span>
                          <span className="font-medium">{question.correctAnswer}</span>
                        </div>
                      </div>

                      {question.explanation && (
                        <details className="mt-2">
                          <summary className="text-sm text-primary cursor-pointer hover:underline">
                            הצג הסבר
                          </summary>
                          <p className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                            {question.explanation}
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Motivational message */}
      <Card className="bg-primary/5 border-primary/20 text-center py-4">
        {percentage >= 80 ? (
          <>
            <div className="text-xl font-bold text-gray-900 mb-1">מצוין! 🌟</div>
            <p className="text-gray-600">המשיכי כך, את בדרך להצלחה!</p>
          </>
        ) : percentage >= 60 ? (
          <>
            <div className="text-xl font-bold text-gray-900 mb-1">יפה מאוד! 👏</div>
            <p className="text-gray-600">עוד קצת תרגול ותגיעי ליעד</p>
          </>
        ) : (
          <>
            <div className="text-xl font-bold text-gray-900 mb-1">אל תוותרי! 💪</div>
            <p className="text-gray-600">כל תרגול מקרב אותך להצלחה</p>
          </>
        )}
      </Card>

      {/* Action buttons */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Button 
            variant="secondary" 
            size="lg" 
            fullWidth
            onClick={handleGoHome}
          >
            לעמוד הבית
          </Button>
          <Button 
            size="lg" 
            fullWidth
            onClick={handleNewSession}
          >
            תרגול נוסף
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
