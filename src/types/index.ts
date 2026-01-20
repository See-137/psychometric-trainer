// ============ CONTENT TYPES (Immutable, from PDFs) ============

export interface Exam {
  id: string;                          // "spring-2025", "summer-2024"
  season: "spring" | "summer" | "fall" | "winter";
  year: number;
  hebrewName: string;                  // "אביב 2025"
  sections: Section[];
  metadata?: {
    source: string;                    // PDF filename
    processedAt: string;               // ISO date
  };
}

export interface Section {
  id: string;                          // "spring-2025-quantitative-1"
  examId: string;
  type: SectionType;
  order: 1 | 2;                        // First or second of this type
  timeLimitMinutes: number;
  questions: Question[];
}

export type SectionType = "quantitative" | "verbal" | "english";

export interface Question {
  id: string;                          // "spring-2025-quantitative-1-q7"
  sectionId: string;
  number: number;                      // 1-based question number
  type: QuestionType;
  stem: string;                        // Question text (Hebrew or English)
  stemHtml?: string;                   // If formatting needed
  options: Option[];
  correctAnswer: string;               // "א" | "ב" | "ג" | "ד" or "A"|"B"|"C"|"D"
  explanation?: string;                // From solution PDF
  explanationHtml?: string;
  images?: ImageRef[];
  passage?: string;                    // For reading comprehension
  passageId?: string;                  // Groups questions sharing same passage
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];                     // For filtering: ["algebra", "equations"]
}

export interface Option {
  label: string;                       // "א", "ב", "ג", "ד" or "A", "B", "C", "D"
  text: string;
  textHtml?: string;
}

export interface ImageRef {
  id: string;
  filename: string;                    // "spring-2025-q7-diagram.png"
  alt: string;
}

export type QuestionType =
  // Quantitative (חשיבה כמותית)
  | "algebra"
  | "geometry"
  | "data-interpretation"
  | "word-problem"
  | "sequences"
  | "probability"
  | "arithmetic"
  // Verbal (חשיבה מילולית)
  | "analogy"
  | "sentence-completion"
  | "reading-comprehension-hebrew"
  | "logic"
  // English (אנגלית)
  | "sentence-completion-english"
  | "restatement"
  | "reading-comprehension-english";

// ============ USER DATA (Mutable, persisted in IndexedDB) ============

export interface UserAnswer {
  id: string;                          // UUID
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  answeredAt: string;                  // ISO date
  mode: "training" | "simulation";
  sessionId: string;
  flagged: boolean;
  bookmarked?: boolean;                // Save for later study
  markedAsUnderstood?: boolean;        // For review mode
  notes?: string;                      // User notes on this question
}

export interface Session {
  id: string;                          // UUID
  mode: "training" | "simulation";
  startedAt: string;                   // ISO date
  completedAt?: string;
  examId?: string;                     // For simulation
  sectionIds: string[];
  questionIds: string[];
  currentQuestionIndex: number;
  currentSectionIndex: number;
  status: "in-progress" | "completed" | "abandoned";
  score?: ScoreResult;
  sectionTimeRemaining?: Record<string, number>;  // By section ID
}

export interface ScoreResult {
  raw: {
    correct: number;
    total: number;
    bySection: Record<string, { correct: number; total: number }>;
  };
  scaled: {
    total: number;                     // 200-800 (approximate)
    quantitative: number;              // 50-150
    verbal: number;                    // 50-150
    english: number;                   // 50-150
  };
  timeStats: {
    totalSeconds: number;
    averagePerQuestion: number;
    bySection: Record<string, number>;
  };
  // Disclaimer for approximate scoring
  isApproximate: true;
}

export interface UserProgress {
  id: string;                          // Always "user" (single user)
  questionsAttempted: number;
  questionsCorrect: number;
  totalStudyTimeMinutes: number;
  streakDays: number;                  // Consecutive days practiced
  lastPracticeDate?: string;           // For streak calculation
  sectionProgress?: Record<SectionType, {
    attempted: number;
    correct: number;
    averageTime: number;
  }>;
  examsCompleted?: string[];           // Exam IDs
  bookmarkedQuestions?: string[];      // Question IDs to practice later
}

export interface TypeStats {
  correct: number;
  total: number;
  avgTimeSeconds: number;
  lastAttempted?: string;
}

export interface SimulationScore {
  sessionId: string;
  date: string;
  score: number;
  breakdown: {
    quantitative: number;
    verbal: number;
    english: number;
  };
}

// ============ APP STATE TYPES ============

export interface ExamState {
  exams: Exam[];
  examIndex: Record<string, Exam>;            // By exam ID
  sectionIndex: Record<string, Section>;      // By section ID
  questionIndex: Record<string, Question>;    // By question ID
  isLoaded: boolean;
  loadError?: string;
}

export interface SessionState {
  currentSession: Session | null;
  currentQuestion: Question | null;
  currentSection: Section | null;
  sectionTimeRemaining: number;               // Seconds
  answers: Record<string, UserAnswer>;        // By question ID (current session)
  flaggedQuestions: Set<string>;
  bookmarkedQuestions: Set<string>;
  isPaused: boolean;
  showExplanation: boolean;
}

export interface ProgressState {
  progress: UserProgress | null;
  recentSessions: Session[];
  isLoading: boolean;
}

// ============ UI STATE TYPES ============

export interface UIState {
  theme: "light" | "dark" | "system";
  sidebarOpen: boolean;
  keyboardShortcutsEnabled: boolean;
  showKeyboardHints: boolean;
}

export interface FilterState {
  sectionTypes: SectionType[];
  questionTypes: QuestionType[];
  examIds: string[];
  difficulty: ("easy" | "medium" | "hard")[];
  showOnlyMistakes: boolean;
  showOnlyFlagged: boolean;
  showOnlyBookmarked: boolean;
  showOnlyNotUnderstood: boolean;
}

// ============ CONSTANTS ============

export const SECTION_CONFIG: Record<SectionType, {
  timeLimitMinutes: number;
  questionCount: number;
  hebrewName: string;
  englishName: string;
  questionTypes: QuestionType[];
}> = {
  quantitative: {
    timeLimitMinutes: 20,
    questionCount: 22,
    hebrewName: 'חשיבה כמותית',
    englishName: 'Quantitative',
    questionTypes: ['algebra', 'geometry', 'data-interpretation', 'word-problem', 'sequences', 'probability', 'arithmetic'],
  },
  verbal: {
    timeLimitMinutes: 20,
    questionCount: 22,
    hebrewName: 'חשיבה מילולית',
    englishName: 'Verbal',
    questionTypes: ['analogy', 'sentence-completion', 'reading-comprehension-hebrew', 'logic'],
  },
  english: {
    timeLimitMinutes: 30,
    questionCount: 27,
    hebrewName: 'אנגלית',
    englishName: 'English',
    questionTypes: ['sentence-completion-english', 'restatement', 'reading-comprehension-english'],
  },
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, { hebrew: string; english: string }> = {
  algebra: { hebrew: 'אלגברה', english: 'Algebra' },
  geometry: { hebrew: 'גיאומטריה', english: 'Geometry' },
  'data-interpretation': { hebrew: 'פרשנות נתונים', english: 'Data Interpretation' },
  'word-problem': { hebrew: 'בעיות מילוליות', english: 'Word Problems' },
  sequences: { hebrew: 'סדרות', english: 'Sequences' },
  probability: { hebrew: 'הסתברות', english: 'Probability' },
  arithmetic: { hebrew: 'חשבון', english: 'Arithmetic' },
  analogy: { hebrew: 'אנלוגיות', english: 'Analogies' },
  'sentence-completion': { hebrew: 'השלמת משפטים', english: 'Sentence Completion' },
  'reading-comprehension-hebrew': { hebrew: 'הבנת הנקרא', english: 'Reading Comprehension' },
  logic: { hebrew: 'היגיון', english: 'Logic' },
  'sentence-completion-english': { hebrew: 'השלמת משפטים (אנגלית)', english: 'Sentence Completion' },
  restatement: { hebrew: 'ניסוח מחדש', english: 'Restatement' },
  'reading-comprehension-english': { hebrew: 'הבנת הנקרא (אנגלית)', english: 'Reading Comprehension' },
};

export const SCORE_RANGE = {
  min: 200,
  max: 800,
  median: 500,
  domainMin: 50,
  domainMax: 150,
};

export const HEBREW_OPTIONS = ['א', 'ב', 'ג', 'ד'] as const;
export const ENGLISH_OPTIONS = ['A', 'B', 'C', 'D'] as const;

export const KEYBOARD_SHORTCUTS = {
  selectOption1: '1',
  selectOption2: '2',
  selectOption3: '3',
  selectOption4: '4',
  nextQuestion: 'ArrowLeft',      // RTL: Left = forward
  prevQuestion: 'ArrowRight',     // RTL: Right = backward
  toggleFlag: 'f',
  toggleBookmark: 'b',
  showExplanation: 'e',
  submit: 'Enter',
} as const;
