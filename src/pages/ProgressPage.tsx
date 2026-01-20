import React from 'react';
import { useProgressStore } from '../stores';
import { Card, CardHeader, CircularProgress, ProgressBar, LoadingPage } from '../components/common';
import type { SectionType } from '../types';

// We'll add Recharts later for more advanced charts
// import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Progress page showing statistics and analytics
 */
const ProgressPage: React.FC = () => {
  const { 
    overallStats, 
    sectionProgress, 
    getStreak, 
    getProgressOverTime,
    isLoading,
    loadProgress,
  } = useProgressStore();

  React.useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  if (isLoading) {
    return <LoadingPage message="טוען נתונים..." />;
  }

  const streak = getStreak();
  const progressData = getProgressOverTime(7);

  const sectionLabels: Record<SectionType, string> = {
    verbal: 'חשיבה מילולית',
    quantitative: 'חשיבה כמותית',
    english: 'אנגלית',
  };

  const sectionColors: Record<SectionType, 'primary' | 'success' | 'warning'> = {
    verbal: 'primary',
    quantitative: 'success',
    english: 'warning',
  };

  // Format time display
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} דקות`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours} שעות ${mins > 0 ? `ו-${mins} דקות` : ''}`;
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="text-center py-2">
        <h1 className="text-xl font-bold text-gray-900">התקדמות</h1>
        <p className="text-gray-600 text-sm mt-1">מעקב אחרי הביצועים שלך</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md" className="text-center">
          <div className="text-3xl font-bold text-primary">
            {overallStats.totalQuestions}
          </div>
          <div className="text-sm text-gray-500 mt-1">שאלות נפתרו</div>
        </Card>

        <Card padding="md" className="text-center">
          <div className="text-3xl font-bold text-success">
            {Math.round(overallStats.accuracy * 100)}%
          </div>
          <div className="text-sm text-gray-500 mt-1">אחוז הצלחה</div>
        </Card>

        <Card padding="md" className="text-center">
          <div className="text-3xl font-bold text-warning">
            {streak}
          </div>
          <div className="text-sm text-gray-500 mt-1">ימים ברצף</div>
        </Card>

        <Card padding="md" className="text-center">
          <div className="text-3xl font-bold text-gray-700">
            {formatTime(overallStats.totalTimeMinutes)}
          </div>
          <div className="text-sm text-gray-500 mt-1">זמן לימוד</div>
        </Card>
      </div>

      {/* Section progress */}
      <Card>
        <CardHeader title="התקדמות לפי נושא" />
        <div className="mt-4 space-y-6">
          {(Object.entries(sectionProgress) as [SectionType, typeof sectionProgress.verbal][]).map(
            ([type, progress]) => (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{sectionLabels[type]}</span>
                  <span className="text-sm text-gray-500">
                    {progress.totalQuestions} שאלות
                  </span>
                </div>
                <ProgressBar 
                  value={progress.accuracy * 100}
                  variant={sectionColors[type]}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {progress.correctAnswers} נכונות מתוך {progress.totalQuestions}
                  </span>
                  <span>
                    {Math.round(progress.averageTimeSeconds)}שׁ זמן ממוצע
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      </Card>

      {/* Weekly activity */}
      <Card>
        <CardHeader title="פעילות השבוע האחרון" />
        <div className="mt-4">
          <div className="flex justify-between items-end h-32 gap-1">
            {progressData.map((day, index) => {
              const maxTotal = Math.max(...progressData.map(d => d.total), 1);
              const height = day.total > 0 ? (day.total / maxTotal) * 100 : 5;
              
              return (
                <div 
                  key={index} 
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div 
                    className="w-full bg-primary/20 rounded-t relative overflow-hidden"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  >
                    {day.total > 0 && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-primary transition-all"
                        style={{ height: `${day.accuracy * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(day.date).toLocaleDateString('he-IL', { weekday: 'narrow' })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-primary/20 rounded" />
              <span>סה"כ</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-primary rounded" />
              <span>נכונות</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Accuracy breakdown */}
      <Card>
        <CardHeader title="התפלגות תשובות" />
        <div className="mt-4 flex items-center justify-center gap-8">
          <CircularProgress
            value={overallStats.correctAnswers}
            max={overallStats.totalQuestions || 1}
            size={120}
            strokeWidth={10}
            variant="success"
            label="נכונות"
          />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-gray-600">
                {overallStats.correctAnswers} נכונות
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-error" />
              <span className="text-sm text-gray-600">
                {overallStats.incorrectAnswers} שגויות
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance tips */}
      {overallStats.totalQuestions >= 20 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            title="טיפ להצלחה" 
          />
          <p className="text-sm text-gray-600 mt-2">
            {overallStats.accuracy < 0.6 
              ? 'נסי להתמקד בנושאים שמאתגרים אותך יותר. תרגול ממוקד יעזור לשפר את הציון.'
              : overallStats.accuracy < 0.8
              ? 'את בכיוון הנכון! המשיכי לתרגל באופן עקבי כדי לשפר את הדיוק.'
              : 'עבודה מצוינת! שמרי על הקצב ונסי להתאמן גם על מהירות.'}
          </p>
        </Card>
      )}

      {/* Empty state */}
      {overallStats.totalQuestions === 0 && (
        <Card className="text-center py-8">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            עוד אין נתונים
          </h3>
          <p className="text-gray-600 max-w-sm mx-auto">
            התחילי לתרגל כדי לראות את ההתקדמות שלך
          </p>
        </Card>
      )}
    </div>
  );
};

export default ProgressPage;
