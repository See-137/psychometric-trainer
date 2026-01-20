import { create } from 'zustand';
import type { Exam, Section, Question, ExamState, SectionType } from '../types';
import { loadCompleteExamData, AVAILABLE_EXAMS } from '@/services/contentLoader';

interface ExamStore extends ExamState {
  // Additional UI state
  isLoading: boolean;
  
  // Actions
  setLoading: (loading: boolean) => void;
  loadExams: (exams: Exam[]) => void;
  loadFromJSON: () => Promise<void>;  // Load all available exams
  setLoadError: (error: string) => void;
  getExam: (id: string) => Exam | undefined;
  getSection: (id: string) => Section | undefined;
  getQuestion: (id: string) => Question | undefined;
  getQuestionById: (id: string) => Question | undefined; // Alias for getQuestion
  getQuestionsBySection: (sectionId: string) => Question[];
  getQuestionsBySectionType: (sectionType: SectionType) => Question[];
  getQuestionsByType: (type: string) => Question[];
  searchQuestions: (query: string) => Question[];
}

export const useExamStore = create<ExamStore>((set, get) => ({
  // Initial state
  exams: [],
  examIndex: {},
  sectionIndex: {},
  questionIndex: {},
  isLoaded: false,
  isLoading: false,
  loadError: undefined,

  // Actions
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  loadExams: (exams: Exam[]) => {
    const examIndex: Record<string, Exam> = {};
    const sectionIndex: Record<string, Section> = {};
    const questionIndex: Record<string, Question> = {};

    for (const exam of exams) {
      examIndex[exam.id] = exam;
      
      for (const section of exam.sections) {
        sectionIndex[section.id] = section;
        
        for (const question of section.questions) {
          questionIndex[question.id] = question;
        }
      }
    }

    set({
      exams,
      examIndex,
      sectionIndex,
      questionIndex,
      isLoaded: true,
      isLoading: false,
      loadError: undefined,
    });
  },

  loadFromJSON: async () => {
    set({ isLoading: true, loadError: undefined });
    try {
      const allExams: Exam[] = [];
      for (const path of AVAILABLE_EXAMS) {
        const exam = await loadCompleteExamData(path);
        allExams.push(exam);
      }
      get().loadExams(allExams);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load exams';
      set({ loadError: message, isLoaded: false, isLoading: false });
    }
  },

  setLoadError: (error: string) => {
    set({ loadError: error, isLoaded: false, isLoading: false });
  },

  getExam: (id: string) => get().examIndex[id],
  
  getSection: (id: string) => get().sectionIndex[id],
  
  getQuestion: (id: string) => get().questionIndex[id],
  
  // Alias for consistency with page usage
  getQuestionById: (id: string) => get().questionIndex[id],

  getQuestionsBySection: (sectionId: string) => {
    const section = get().sectionIndex[sectionId];
    return section?.questions || [];
  },
  
  // Get questions by section TYPE (verbal, quantitative, english)
  getQuestionsBySectionType: (sectionType: SectionType) => {
    const questions: Question[] = [];
    Object.values(get().sectionIndex).forEach(section => {
      if (section.type === sectionType) {
        questions.push(...section.questions);
      }
    });
    return questions;
  },

  getQuestionsByType: (type: string) => {
    return Object.values(get().questionIndex).filter(q => q.type === type);
  },

  searchQuestions: (query: string) => {
    const lowerQuery = query.toLowerCase();
    return Object.values(get().questionIndex).filter(q => 
      q.stem.toLowerCase().includes(lowerQuery) ||
      q.options.some(o => o.text.toLowerCase().includes(lowerQuery))
    );
  },
}));
