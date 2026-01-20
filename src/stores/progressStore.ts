import { create } from 'zustand';
import type { UserProgress, UserAnswer, SectionType } from '../types';
import { db, getAnswerHistory, saveProgress, getProgress } from '../db';

interface ProgressStats {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  averageTimeSeconds: number;
  totalTimeMinutes: number;
}

interface SectionProgress extends ProgressStats {
  sectionType: SectionType;
  lastPracticed: string | null;
  strengthLevel: 'weak' | 'medium' | 'strong';
}

interface ProgressStore {
  // State
  userProgress: UserProgress | null;
  answerHistory: UserAnswer[];
  sectionProgress: Record<SectionType, SectionProgress>;
  overallStats: ProgressStats;
  isLoading: boolean;
  
  // Actions
  loadProgress: () => Promise<void>;
  calculateStats: () => void;
  updateProgress: (examId: string, sectionType: SectionType, answers: UserAnswer[]) => Promise<void>;
  getWeakAreas: () => SectionType[];
  getStrongAreas: () => SectionType[];
  getRecommendedPractice: () => SectionType | null;
  getStreak: () => number;
  resetProgress: () => Promise<void>;
  
  // Analytics helpers
  getAccuracyBySection: () => Record<SectionType, number>;
  getProgressOverTime: (days: number) => Array<{ date: string; correct: number; total: number; accuracy: number }>;
  getTimePerQuestion: () => Record<SectionType, number>;
}

const createEmptySectionProgress = (sectionType: SectionType): SectionProgress => ({
  sectionType,
  totalQuestions: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  accuracy: 0,
  averageTimeSeconds: 0,
  totalTimeMinutes: 0,
  lastPracticed: null,
  strengthLevel: 'weak',
});

const calculateStrengthLevel = (accuracy: number, totalQuestions: number): 'weak' | 'medium' | 'strong' => {
  if (totalQuestions < 10) return 'weak'; // Not enough data
  if (accuracy >= 0.8) return 'strong';
  if (accuracy >= 0.6) return 'medium';
  return 'weak';
};

export const useProgressStore = create<ProgressStore>((set, get) => ({
  userProgress: null,
  answerHistory: [],
  sectionProgress: {
    verbal: createEmptySectionProgress('verbal'),
    quantitative: createEmptySectionProgress('quantitative'),
    english: createEmptySectionProgress('english'),
  },
  overallStats: {
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    accuracy: 0,
    averageTimeSeconds: 0,
    totalTimeMinutes: 0,
  },
  isLoading: false,

  loadProgress: async () => {
    set({ isLoading: true });
    
    try {
      const [progress, answers] = await Promise.all([
        getProgress(),
        getAnswerHistory(),
      ]);

      set({
        userProgress: progress || null,
        answerHistory: answers,
      });

      // Calculate derived stats
      get().calculateStats();
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  calculateStats: () => {
    const { answerHistory } = get();
    
    const totalQuestions = answerHistory.length;
    const correctAnswers = answerHistory.filter(a => a.isCorrect).length;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const totalTimeSeconds = answerHistory.reduce((sum, a) => sum + a.timeSpentSeconds, 0);
    const averageTimeSeconds = totalQuestions > 0 ? totalTimeSeconds / totalQuestions : 0;

    const overallStats: ProgressStats = {
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      accuracy,
      averageTimeSeconds,
      totalTimeMinutes: totalTimeSeconds / 60,
    };

    set({ overallStats });
  },

  updateProgress: async (_examId: string, sectionType: SectionType, answers: UserAnswer[]) => {
    const { userProgress, sectionProgress } = get();
    
    const correct = answers.filter(a => a.isCorrect).length;
    const total = answers.length;
    const totalTime = answers.reduce((sum, a) => sum + a.timeSpentSeconds, 0);
    
    // Update section progress
    const currentSection = sectionProgress[sectionType];
    const newSectionProgress: SectionProgress = {
      ...currentSection,
      totalQuestions: currentSection.totalQuestions + total,
      correctAnswers: currentSection.correctAnswers + correct,
      incorrectAnswers: currentSection.incorrectAnswers + (total - correct),
      accuracy: (currentSection.correctAnswers + correct) / (currentSection.totalQuestions + total),
      averageTimeSeconds: currentSection.totalQuestions > 0
        ? (currentSection.averageTimeSeconds * currentSection.totalQuestions + totalTime) / (currentSection.totalQuestions + total)
        : totalTime / total,
      totalTimeMinutes: currentSection.totalTimeMinutes + totalTime / 60,
      lastPracticed: new Date().toISOString(),
      strengthLevel: calculateStrengthLevel(
        (currentSection.correctAnswers + correct) / (currentSection.totalQuestions + total),
        currentSection.totalQuestions + total
      ),
    };

    // Update overall progress
    const questionsAttempted = (userProgress?.questionsAttempted || 0) + total;
    const questionsCorrect = (userProgress?.questionsCorrect || 0) + correct;
    const totalStudyTime = (userProgress?.totalStudyTimeMinutes || 0) + totalTime / 60;
    
    // Calculate streak
    const today = new Date().toISOString().split('T')[0];
    const lastPractice = userProgress?.lastPracticeDate?.split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let streak = userProgress?.streakDays || 0;
    if (lastPractice === today) {
      // Already practiced today, keep streak
    } else if (lastPractice === yesterday) {
      // Practiced yesterday, increment streak
      streak += 1;
    } else if (!lastPractice) {
      // First time, start streak
      streak = 1;
    } else {
      // Streak broken, reset
      streak = 1;
    }

    const newProgress: UserProgress = {
      id: userProgress?.id || crypto.randomUUID(),
      questionsAttempted,
      questionsCorrect,
      totalStudyTimeMinutes: totalStudyTime,
      streakDays: streak,
      lastPracticeDate: new Date().toISOString(),
      sectionProgress: {
        quantitative: userProgress?.sectionProgress?.quantitative || { attempted: 0, correct: 0, averageTime: 0 },
        verbal: userProgress?.sectionProgress?.verbal || { attempted: 0, correct: 0, averageTime: 0 },
        english: userProgress?.sectionProgress?.english || { attempted: 0, correct: 0, averageTime: 0 },
        [sectionType]: {
          attempted: newSectionProgress.totalQuestions,
          correct: newSectionProgress.correctAnswers,
          averageTime: newSectionProgress.averageTimeSeconds,
        },
      },
      examsCompleted: userProgress?.examsCompleted || [],
    };

    await saveProgress(newProgress);

    set({
      userProgress: newProgress,
      sectionProgress: {
        ...sectionProgress,
        [sectionType]: newSectionProgress,
      },
    });

    // Recalculate overall stats
    get().calculateStats();
  },

  getWeakAreas: () => {
    const { sectionProgress } = get();
    return (Object.entries(sectionProgress) as [SectionType, SectionProgress][])
      .filter(([, progress]) => progress.strengthLevel === 'weak' && progress.totalQuestions >= 5)
      .map(([type]) => type);
  },

  getStrongAreas: () => {
    const { sectionProgress } = get();
    return (Object.entries(sectionProgress) as [SectionType, SectionProgress][])
      .filter(([, progress]) => progress.strengthLevel === 'strong')
      .map(([type]) => type);
  },

  getRecommendedPractice: () => {
    const { sectionProgress } = get();
    
    // Find section with lowest accuracy that has been attempted
    const attemptedSections = (Object.entries(sectionProgress) as [SectionType, SectionProgress][])
      .filter(([, progress]) => progress.totalQuestions > 0)
      .sort(([, a], [, b]) => a.accuracy - b.accuracy);

    if (attemptedSections.length > 0) {
      return attemptedSections[0][0];
    }

    // If no sections attempted, return verbal (most common starting point)
    return 'verbal';
  },

  getStreak: () => {
    const { userProgress } = get();
    if (!userProgress) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const lastPractice = userProgress.lastPracticeDate?.split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Streak is valid if practiced today or yesterday
    if (lastPractice === today || lastPractice === yesterday) {
      return userProgress.streakDays;
    }
    
    return 0; // Streak broken
  },

  resetProgress: async () => {
    await db.transaction('rw', [db.answers, db.sessions, db.progress], async () => {
      await db.answers.clear();
      await db.sessions.clear();
      await db.progress.clear();
    });

    set({
      userProgress: null,
      answerHistory: [],
      sectionProgress: {
        verbal: createEmptySectionProgress('verbal'),
        quantitative: createEmptySectionProgress('quantitative'),
        english: createEmptySectionProgress('english'),
      },
      overallStats: {
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracy: 0,
        averageTimeSeconds: 0,
        totalTimeMinutes: 0,
      },
    });
  },

  getAccuracyBySection: () => {
    const { sectionProgress } = get();
    return {
      verbal: sectionProgress.verbal.accuracy,
      quantitative: sectionProgress.quantitative.accuracy,
      english: sectionProgress.english.accuracy,
    };
  },

  getProgressOverTime: (days: number) => {
    const { answerHistory } = get();
    const result: Array<{ date: string; correct: number; total: number; accuracy: number }> = [];
    
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAnswers = answerHistory.filter(a => 
        a.answeredAt.startsWith(dateStr)
      );
      
      const correct = dayAnswers.filter(a => a.isCorrect).length;
      const total = dayAnswers.length;
      
      result.push({
        date: dateStr,
        correct,
        total,
        accuracy: total > 0 ? correct / total : 0,
      });
    }
    
    return result;
  },

  getTimePerQuestion: () => {
    const { sectionProgress } = get();
    return {
      verbal: sectionProgress.verbal.averageTimeSeconds,
      quantitative: sectionProgress.quantitative.averageTimeSeconds,
      english: sectionProgress.english.averageTimeSeconds,
    };
  },
}));
