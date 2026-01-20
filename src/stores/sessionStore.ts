import { create } from 'zustand';
import type { Session, Question, Section, UserAnswer, SessionState, ScoreResult } from '../types';
import { saveAnswer, saveSession, toggleBookmark as toggleBookmarkInDB, getBookmarkedQuestions } from '../db';

interface SessionStore extends SessionState {
  // Actions
  startTrainingSession: (questionIds: string[], sectionIds: string[]) => Session;
  startSimulationSession: (examId: string, sections: Section[]) => Session;
  setCurrentQuestion: (question: Question | null) => void;
  setCurrentSection: (section: Section | null) => void;
  answerQuestion: (questionId: string, answer: string, isCorrect: boolean, timeSpent: number) => Promise<void>;
  toggleFlag: (questionId: string) => void;
  toggleBookmark: (questionId: string) => Promise<void>;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  nextSection: () => void;
  setTimeRemaining: (seconds: number) => void;
  togglePause: () => void;
  setShowExplanation: (show: boolean) => void;
  completeSession: (score?: ScoreResult) => Promise<void>;
  abandonSession: () => Promise<void>;
  resetSession: () => void;
  loadSession: (session: Session) => Promise<void>;
  loadBookmarks: () => Promise<void>;
}

const generateId = () => crypto.randomUUID();

const initialState: SessionState = {
  currentSession: null,
  currentQuestion: null,
  currentSection: null,
  sectionTimeRemaining: 0,
  answers: {},
  flaggedQuestions: new Set(),
  bookmarkedQuestions: new Set(),
  isPaused: false,
  showExplanation: false,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  startTrainingSession: (questionIds: string[], sectionIds: string[]) => {
    const session: Session = {
      id: generateId(),
      mode: 'training',
      startedAt: new Date().toISOString(),
      sectionIds,
      questionIds,
      currentQuestionIndex: 0,
      currentSectionIndex: 0,
      status: 'in-progress',
    };

    set({
      currentSession: session,
      answers: {},
      flaggedQuestions: new Set(),
      bookmarkedQuestions: new Set(),
      isPaused: false,
      showExplanation: false,
    });

    // Persist session
    saveSession(session);

    return session;
  },

  startSimulationSession: (examId: string, sections: Section[]) => {
    const questionIds = sections.flatMap(s => s.questions.map(q => q.id));
    const sectionIds = sections.map(s => s.id);
    
    // Initialize time remaining for each section
    const sectionTimeRemaining: Record<string, number> = {};
    for (const section of sections) {
      sectionTimeRemaining[section.id] = section.timeLimitMinutes * 60;
    }

    const session: Session = {
      id: generateId(),
      mode: 'simulation',
      startedAt: new Date().toISOString(),
      examId,
      sectionIds,
      questionIds,
      currentQuestionIndex: 0,
      currentSectionIndex: 0,
      status: 'in-progress',
      sectionTimeRemaining,
    };

    const firstSection = sections[0];

    set({
      currentSession: session,
      currentSection: firstSection,
      sectionTimeRemaining: firstSection.timeLimitMinutes * 60,
      answers: {},
      flaggedQuestions: new Set(),
      bookmarkedQuestions: new Set(),
      isPaused: false,
      showExplanation: false,
    });

    saveSession(session);

    return session;
  },

  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  
  setCurrentSection: (section) => set({ 
    currentSection: section,
    sectionTimeRemaining: section ? section.timeLimitMinutes * 60 : 0,
  }),

  answerQuestion: async (questionId, selectedAnswer, isCorrect, timeSpent) => {
    const { currentSession, answers } = get();
    if (!currentSession) return;

    const answer: UserAnswer = {
      id: generateId(),
      questionId,
      selectedAnswer,
      isCorrect,
      timeSpentSeconds: timeSpent,
      answeredAt: new Date().toISOString(),
      mode: currentSession.mode,
      sessionId: currentSession.id,
      flagged: get().flaggedQuestions.has(questionId),
      bookmarked: get().bookmarkedQuestions.has(questionId),
    };

    set({
      answers: { ...answers, [questionId]: answer },
    });

    // Persist answer
    await saveAnswer(answer);
  },

  toggleFlag: (questionId) => {
    const { flaggedQuestions } = get();
    const newFlagged = new Set(flaggedQuestions);
    
    if (newFlagged.has(questionId)) {
      newFlagged.delete(questionId);
    } else {
      newFlagged.add(questionId);
    }
    
    set({ flaggedQuestions: newFlagged });
  },

  toggleBookmark: async (questionId) => {
    const { bookmarkedQuestions } = get();
    const newBookmarked = new Set(bookmarkedQuestions);
    
    // Toggle in DB and get new state
    const isNowBookmarked = await toggleBookmarkInDB(questionId);
    
    if (isNowBookmarked) {
      newBookmarked.add(questionId);
    } else {
      newBookmarked.delete(questionId);
    }
    
    set({ bookmarkedQuestions: newBookmarked });
  },

  goToQuestion: (index) => {
    const { currentSession } = get();
    if (!currentSession) return;
    
    const clampedIndex = Math.max(0, Math.min(index, currentSession.questionIds.length - 1));
    
    set({
      currentSession: {
        ...currentSession,
        currentQuestionIndex: clampedIndex,
      },
      showExplanation: false,
    });
  },

  nextQuestion: () => {
    const { currentSession } = get();
    if (!currentSession) return;
    
    const nextIndex = currentSession.currentQuestionIndex + 1;
    if (nextIndex < currentSession.questionIds.length) {
      get().goToQuestion(nextIndex);
    }
  },

  prevQuestion: () => {
    const { currentSession } = get();
    if (!currentSession) return;
    
    const prevIndex = currentSession.currentQuestionIndex - 1;
    if (prevIndex >= 0) {
      get().goToQuestion(prevIndex);
    }
  },

  nextSection: () => {
    const { currentSession } = get();
    if (!currentSession) return;
    
    const nextSectionIndex = currentSession.currentSectionIndex + 1;
    if (nextSectionIndex < currentSession.sectionIds.length) {
      set({
        currentSession: {
          ...currentSession,
          currentSectionIndex: nextSectionIndex,
        },
      });
    }
  },

  setTimeRemaining: (seconds) => {
    set({ sectionTimeRemaining: Math.max(0, seconds) });
  },

  togglePause: () => {
    set(state => ({ isPaused: !state.isPaused }));
  },

  setShowExplanation: (show) => set({ showExplanation: show }),

  completeSession: async (score) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const completedSession: Session = {
      ...currentSession,
      status: 'completed',
      completedAt: new Date().toISOString(),
      score,
    };

    await saveSession(completedSession);
    
    set({
      currentSession: completedSession,
    });
  },

  abandonSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    const abandonedSession: Session = {
      ...currentSession,
      status: 'abandoned',
      completedAt: new Date().toISOString(),
    };

    await saveSession(abandonedSession);
    get().resetSession();
  },

  resetSession: () => {
    // Keep bookmarked questions when resetting (they're persisted in DB)
    const { bookmarkedQuestions } = get();
    set({
      ...initialState,
      bookmarkedQuestions,
    });
  },

  loadSession: async (session) => {
    // Load persisted bookmarks from DB
    const bookmarks = await getBookmarkedQuestions();
    set({
      currentSession: session,
      answers: {},
      flaggedQuestions: new Set(),
      bookmarkedQuestions: new Set(bookmarks),
      isPaused: false,
      showExplanation: false,
    });
  },

  loadBookmarks: async () => {
    const bookmarks = await getBookmarkedQuestions();
    set({ bookmarkedQuestions: new Set(bookmarks) });
  },
}));
