import React from 'react';
import { Link } from 'react-router-dom';
import { useProgressStore } from '../stores';
import { Card, CircularProgress, Button } from '../components/common';
import type { SectionType } from '../types';

/**
 * Home page - Dashboard with quick actions and progress overview
 */
const HomePage: React.FC = () => {
  const { overallStats, sectionProgress, getStreak, getRecommendedPractice, loadProgress, isLoading } = useProgressStore();

  React.useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const streak = getStreak();
  const recommended = getRecommendedPractice();

  const sectionLabels: Record<SectionType, string> = {
    verbal: 'מילולי',
    quantitative: 'כמותי',
    english: 'אנגלית',
  };

  const sectionColors: Record<SectionType, 'primary' | 'success' | 'warning'> = {
    verbal: 'primary',
    quantitative: 'success',
    english: 'warning',
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Welcome header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          שלום! 👋
        </h1>
        <p className="text-gray-600">
          בואי נתרגל יחד לפסיכומטרי
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-primary">
            {overallStats.totalQuestions}
          </div>
          <div className="text-xs text-gray-500 mt-1">שאלות נפתרו</div>
        </Card>
        
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-success">
            {Math.round(overallStats.accuracy * 100)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">דיוק</div>
        </Card>
        
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-warning">
            {streak}
          </div>
          <div className="text-xs text-gray-500 mt-1">ימים ברצף</div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">התחלה מהירה</h2>
        
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/training">
            <Card variant="interactive" padding="lg" className="h-full">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">תרגול חופשי</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    בחרי נושא ותרגלי בקצב שלך
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/simulation">
            <Card variant="interactive" padding="lg" className="h-full">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-success/10 rounded-xl">
                  <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">סימולציה מלאה</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    מבחן בתנאים אמיתיים עם טיימר
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Recommended practice */}
        {recommended && overallStats.totalQuestions > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">מומלץ לתרגל</h3>
                <p className="text-sm text-gray-600">
                  חלק {sectionLabels[recommended]} - יש מקום לשיפור
                </p>
              </div>
              <Link to={`/training?section=${recommended}`}>
                <Button size="sm">לתרגול</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* Section progress */}
      {overallStats.totalQuestions > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">התקדמות לפי נושא</h2>
          
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.entries(sectionProgress) as [SectionType, typeof sectionProgress.verbal][]).map(
              ([type, progress]) => (
                <Link key={type} to={`/training?section=${type}`}>
                  <Card padding="md" variant="interactive">
                    <div className="flex items-center gap-4">
                      <CircularProgress
                        value={progress.accuracy * 100}
                        size={60}
                        strokeWidth={6}
                        variant={sectionColors[type]}
                        showLabel={false}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{sectionLabels[type]}</h3>
                        <p className="text-sm text-gray-500">
                          {Math.round(progress.accuracy * 100)}% דיוק
                        </p>
                        <p className="text-xs text-gray-400">
                          {progress.totalQuestions} שאלות
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            )}
          </div>
        </div>
      )}

      {/* Empty state for new users */}
      {overallStats.totalQuestions === 0 && !isLoading && (
        <Card className="text-center py-8">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            בואי נתחיל!
          </h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
            עוד לא התחלת לתרגל. לחצי על "תרגול חופשי" כדי להתחיל
          </p>
          <Link to="/training">
            <Button size="lg">להתחלה</Button>
          </Link>
        </Card>
      )}
    </div>
  );
};

export default HomePage;
