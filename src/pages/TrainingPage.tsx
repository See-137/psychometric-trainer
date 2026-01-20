import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useExamStore, useSessionStore } from '../stores';
import { Card, Button, LoadingPage } from '../components/common';
import type { SectionType, QuestionType } from '../types';
import { SECTION_CONFIG, QUESTION_TYPE_LABELS } from '../types';

/**
 * Training selection page
 * Allows selecting section, question types, and number of questions
 */
const TrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { exams, isLoading: examsLoading, getQuestionsBySectionType } = useExamStore();
  const { startTrainingSession } = useSessionStore();

  // Form state
  const [selectedSection, setSelectedSection] = useState<SectionType | null>(
    (searchParams.get('section') as SectionType) || null
  );
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sectionLabels: Record<SectionType, string> = {
    verbal: 'חשיבה מילולית',
    quantitative: 'חשיבה כמותית',
    english: 'אנגלית',
  };

  const sectionDescriptions: Record<SectionType, string> = {
    verbal: 'השלמת משפטים, אנלוגיות, הבנת הנקרא וחשיבה לוגית',
    quantitative: 'בעיות מילוליות, אלגברה, גאומטריה והסתברות',
    english: 'ניסוח מחדש, אוצר מילים ודקדוק',
  };

  const sectionIcons: Record<SectionType, React.ReactNode> = {
    verbal: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    quantitative: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    english: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
  };

  // Get available question types for selected section
  const availableTypes = selectedSection 
    ? SECTION_CONFIG[selectedSection].questionTypes 
    : [];

  // Toggle question type selection
  const toggleType = (type: QuestionType) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Count available questions
  const getAvailableQuestionCount = (): number => {
    if (!selectedSection) return 0;
    
    const questions = getQuestionsBySectionType(selectedSection);
    if (selectedTypes.length === 0) return questions.length;
    
    return questions.filter(q => selectedTypes.includes(q.type)).length;
  };

  // Start training session
  const handleStartTraining = () => {
    if (!selectedSection) return;

    let questions = getQuestionsBySectionType(selectedSection);
    
    // Filter by selected types
    if (selectedTypes.length > 0) {
      questions = questions.filter(q => selectedTypes.includes(q.type));
    }

    // Shuffle and limit
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, questionCount);
    
    if (selected.length === 0) {
      setErrorMessage('לא נמצאו שאלות מתאימות');
      // Auto-dismiss after 3 seconds
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // Start session
    const session = startTrainingSession(
      selected.map(q => q.id),
      [selectedSection]
    );

    // Navigate to session
    navigate(`/session/${session.id}`);
  };

  if (examsLoading) {
    return <LoadingPage message="טוען שאלות..." />;
  }

  const availableCount = getAvailableQuestionCount();

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Error notification */}
      {errorMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md">
          <div className="bg-error/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between">
            <span>{errorMessage}</span>
            <button 
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <div className="text-center py-2">
        <h1 className="text-xl font-bold text-gray-900">תרגול חופשי</h1>
        <p className="text-gray-600 text-sm mt-1">בחרי נושא והתחילי לתרגל</p>
      </div>

      {/* Section selection */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900">בחירת חלק</h2>
        
        <div className="grid gap-3">
          {(Object.keys(sectionLabels) as SectionType[]).map(section => (
            <button
              type="button"
              key={section}
              onClick={() => {
                setSelectedSection(section);
                setSelectedTypes([]);
              }}
              className={`
                w-full text-start p-4 rounded-xl border-2 transition-all
                ${selectedSection === section
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-gray-200 hover:border-primary/50'}
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  p-2 rounded-lg
                  ${selectedSection === section ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}
                `}>
                  {sectionIcons[section]}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{sectionLabels[section]}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{sectionDescriptions[section]}</p>
                </div>
                {selectedSection === section && (
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Question type selection */}
      {selectedSection && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">סוגי שאלות (אופציונלי)</h2>
          <p className="text-sm text-gray-500">השאירי ריק כדי לתרגל את כל הסוגים</p>
          
          <div className="flex flex-wrap gap-2">
            {availableTypes.map((type: QuestionType) => {
              return (
                <button
                  type="button"
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${selectedTypes.includes(type)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                  `}
                >
                  {QUESTION_TYPE_LABELS[type].hebrew}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question count */}
      {selectedSection && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">מספר שאלות</h2>
          
          <div className="flex items-center gap-3">
            {[5, 10, 15, 20, 30].map(count => (
              <button
                type="button"
                key={count}
                onClick={() => setQuestionCount(count)}
                disabled={count > availableCount}
                className={`
                  flex-1 py-2.5 rounded-lg font-medium transition-colors
                  ${questionCount === count
                    ? 'bg-primary text-white'
                    : count > availableCount
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                `}
              >
                {count}
              </button>
            ))}
          </div>
          
          {availableCount > 0 && (
            <p className="text-sm text-gray-500">
              {availableCount} שאלות זמינות
            </p>
          )}
        </div>
      )}

      {/* Start button */}
      {selectedSection && (
        <div className="pt-4">
          <Button
            size="lg"
            fullWidth
            onClick={handleStartTraining}
            disabled={availableCount === 0}
          >
            התחלת תרגול ({Math.min(questionCount, availableCount)} שאלות)
          </Button>
        </div>
      )}

      {/* Empty state */}
      {exams.length === 0 && (
        <Card className="text-center py-8">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין מבחנים זמינים
          </h3>
          <p className="text-gray-600 max-w-sm mx-auto">
            יש להעלות קבצי מבחן לתיקיית content/exams כדי להתחיל
          </p>
        </Card>
      )}
    </div>
  );
};

export default TrainingPage;
