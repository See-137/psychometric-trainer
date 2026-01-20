import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore, useSessionStore } from '../stores';
import { Card, Button, LoadingPage } from '../components/common';
import type { Exam } from '../types';

/**
 * Simulation selection page
 * Lists available exams for full timed simulation
 */
const SimulationPage: React.FC = () => {
  const { exams, isLoading } = useExamStore();
  const { startSimulationSession } = useSessionStore();
  const navigate = useNavigate();

  const handleStartSimulation = useCallback((exam: Exam) => {
    // Start the simulation session with the exam's sections
    startSimulationSession(exam.id, exam.sections);
    // Navigate to the session page
    navigate('/session');
  }, [startSimulationSession, navigate]);

  if (isLoading) {
    return <LoadingPage message="טוען מבחנים..." />;
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="text-center py-2">
        <h1 className="text-xl font-bold text-gray-900">סימולציה מלאה</h1>
        <p className="text-gray-600 text-sm mt-1">מבחן בתנאים אמיתיים עם טיימר</p>
      </div>

      {/* Info card */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-blue-900">מה זו סימולציה?</h3>
            <p className="text-sm text-blue-700 mt-1">
              מבחן בתנאים הדומים למבחן האמיתי - עם הגבלת זמן לכל חלק, 
              ללא אפשרות לראות תשובות נכונות עד הסוף, וללא אפשרות לחזור לחלקים קודמים.
            </p>
          </div>
        </div>
      </Card>

      {/* Exam list */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900">בחרי מבחן</h2>
        
        {exams.length > 0 ? (
          <div className="grid gap-3">
            {exams.map(exam => (
              <Card 
                key={exam.id} 
                variant="interactive" 
                className="hover:border-primary hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleStartSimulation(exam)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exam.hebrewName}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{exam.sections.length} חלקים</span>
                      <span>•</span>
                      <span>{exam.sections.reduce((sum, s) => sum + s.questions.length, 0)} שאלות</span>
                      <span>•</span>
                      <span>{exam.sections.reduce((sum, s) => sum + s.timeLimitMinutes, 0)} דקות</span>
                    </div>
                  </div>
                  <Button type="button">התחלה</Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              אין מבחנים זמינים
            </h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              יש להעלות קבצי מבחן לתיקיית content/exams כדי להתחיל
            </p>
          </Card>
        )}
      </div>

      {/* Tips */}
      <Card className="bg-gray-50">
        <h3 className="font-medium text-gray-900 mb-3">טיפים להצלחה</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-success">✓</span>
            וודאי שאת באיזור שקט ולא תופרעי
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success">✓</span>
            הכיני דף ועט לטיוטות (במיוחד לחלק הכמותי)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success">✓</span>
            שימי את הטלפון במצב שקט
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success">✓</span>
            התחילי כשיש לך מספיק זמן להשלים את כל המבחן
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default SimulationPage;
