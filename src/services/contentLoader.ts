import type { Exam, Section, Question, QuestionType } from '@/types';

/**
 * New parsed exam format from our PDF extraction
 */
interface ParsedExamData {
  id: string;
  name: string;
  nameEn: string;
  year: number;
  season: string;
  totalQuestions: number;
  sections: ParsedSectionInfo[];
  questions: ParsedQuestion[];
}

interface ParsedSectionInfo {
  type: string;
  section: number;
  nameHe: string;
  nameEn: string;
  questionCount: number;
}

interface ParsedQuestion {
  id: string;
  questionNumber: number;
  sectionType: string;
  sectionNumber: number;
  sectionNameHe?: string;
  sectionNameEn?: string;
  text?: string;       // Old format
  stem?: string;       // New format  
  textEn?: string;
  options: Array<{ id: number; text: string; textEn?: string; label?: string }>;
  correctAnswer: number;  // 1-4 (1-indexed)
  explanation?: string;
  explanationEn?: string;
  difficulty?: string;
  tags?: string[];
  language?: string;
  hasFullText?: boolean;
}

/**
 * Old sample exam format (for backwards compatibility)
 */
interface SampleExamData {
  id: string;
  season: string;
  year: number;
  hebrewName: string;
  sections: SectionData[];
  metadata: {
    source: string;
    processedAt: string;
  };
}

interface SectionData {
  id: string;
  examId: string;
  type: string;
  order: number;
  timeLimitMinutes: number;
  questions: Question[];
}

/**
 * Exam index format
 */
interface ExamIndex {
  exams: ExamIndexEntry[];
  totalExams: number;
  totalQuestions: number;
  generatedAt: string;
}

interface ExamIndexEntry {
  id: string;
  name: string;
  nameEn: string;
  file: string;
  questionCount: number;
}

/**
 * Load exam index from server
 */
export async function loadExamIndex(): Promise<ExamIndex> {
  const response = await fetch('/content/exams/index.json');
  if (!response.ok) {
    throw new Error(`Failed to load exam index: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Convert parsed exam data to app's Exam type
 */
function convertParsedExamToAppFormat(data: ParsedExamData): Exam {
  // Group questions by section
  const sectionMap = new Map<string, Question[]>();
  
  // Hebrew labels for options
  const hebrewLabels = ['א', 'ב', 'ג', 'ד'];
  
  for (const pq of data.questions) {
    const sectionKey = `${pq.sectionType}-${pq.sectionNumber}`;
    if (!sectionMap.has(sectionKey)) {
      sectionMap.set(sectionKey, []);
    }
    
    // Map section type to question type
    // For English section, determine type based on question number:
    // - Questions 1-8: sentence-completion-english
    // - Questions 9-12: restatement
    // - Questions 13+: reading-comprehension-english
    let questionType: string;
    if (pq.sectionType === 'quantitative') {
      questionType = 'algebra';
    } else if (pq.sectionType === 'verbal') {
      questionType = 'sentence-completion';
    } else if (pq.sectionType === 'english') {
      const qNum = pq.questionNumber;
      if (qNum <= 8) {
        questionType = 'sentence-completion-english';
      } else if (qNum <= 12) {
        questionType = 'restatement';
      } else {
        questionType = 'reading-comprehension-english';
      }
    } else {
      questionType = 'restatement';
    }
    
    // Get question stem - support both 'text' and 'stem' formats
    const questionStem = pq.stem || pq.text || '';
    
    // Determine labels based on language
    const isEnglish = pq.language === 'en' || pq.sectionType === 'english';
    const labels = isEnglish ? ['1', '2', '3', '4'] : hebrewLabels;
    
    // Convert to app Question format
    // correctAnswer is 1-indexed (1-4), arrays are 0-indexed
    const correctAnswerIndex = pq.correctAnswer - 1;
    
    const question: Question = {
      id: pq.id,
      sectionId: `${data.id}-${sectionKey}`,
      number: pq.questionNumber,
      type: questionType as QuestionType,
      stem: questionStem,
      options: pq.options.map((o, idx) => ({
        label: o.label || labels[idx] || String(idx + 1),
        text: o.text,
      })),
      correctAnswer: labels[correctAnswerIndex] || String(pq.correctAnswer),
      explanation: pq.explanation || '',
      difficulty: (pq.difficulty || 'medium') as Question['difficulty'],
      tags: pq.tags || [],
    };
    
    sectionMap.get(sectionKey)!.push(question);
  }
  
  // Build sections array
  const sectionTypeOrder = ['quantitative', 'verbal', 'english'];
  const sections: Section[] = [];
  let sectionOrder = 1;
  
  for (const type of sectionTypeOrder) {
    for (const sectionNum of [1, 2]) {
      const sectionKey = `${type}-${sectionNum}`;
      const questions = sectionMap.get(sectionKey);
      
      if (questions && questions.length > 0) {
        sections.push({
          id: `${data.id}-${sectionKey}`,
          examId: data.id,
          type: type as Section['type'],
          order: sectionOrder as Section['order'],
          timeLimitMinutes: type === 'quantitative' ? 20 : type === 'verbal' ? 20 : 30,
          questions,
        });
        
        sectionOrder++;
      }
    }
  }
  
  return {
    id: data.id,
    season: data.season as Exam['season'],
    year: data.year,
    hebrewName: data.name,
    sections,
    metadata: {
      source: 'NITE Official Practice Exam',
      processedAt: new Date().toISOString(),
    },
  };
}

/**
 * Load complete exam data from new parsed format
 */
export async function loadCompleteExamData(path: string): Promise<Exam> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load exam: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Check if it's new parsed format or old sample format
  if ('questions' in data && Array.isArray(data.questions)) {
    // New parsed format
    return convertParsedExamToAppFormat(data as ParsedExamData);
  } else {
    // Old sample format (backwards compatibility)
    const sampleData = data as SampleExamData;
    const sections: Section[] = sampleData.sections.map(s => ({
      id: s.id,
      examId: s.examId,
      type: s.type as Section['type'],
      order: s.order as Section['order'],
      timeLimitMinutes: s.timeLimitMinutes,
      questions: s.questions,
    }));
    
    return {
      id: sampleData.id,
      season: sampleData.season as Exam['season'],
      year: sampleData.year,
      hebrewName: sampleData.hebrewName,
      sections,
      metadata: {
        source: sampleData.metadata.source,
        processedAt: sampleData.metadata.processedAt,
      },
    };
  }
}

/**
 * Load exam data from JSON file
 */
export async function loadExamFromJSON(path: string): Promise<Exam> {
  return loadCompleteExamData(path);
}

/**
 * Load sections from exam JSON
 */
export async function loadSectionsFromJSON(path: string): Promise<Section[]> {
  const exam = await loadCompleteExamData(path);
  return exam.sections;
}

/**
 * Load questions from exam JSON
 */
export async function loadQuestionsFromJSON(path: string): Promise<Question[]> {
  const exam = await loadCompleteExamData(path);
  return exam.sections.flatMap((s: Section) => s.questions);
}

/**
 * Load all available exams
 */
export async function loadAllExams(): Promise<Exam[]> {
  const index = await loadExamIndex();
  const exams: Exam[] = [];
  
  for (const entry of index.exams) {
    const exam = await loadCompleteExamData(`/content/exams/${entry.file}`);
    exams.push(exam);
  }
  
  return exams;
}

/** Available exam paths - now uses index-based loading */
export const AVAILABLE_EXAMS = [
  '/content/exams/spring-2025.json',
  '/content/exams/summer-2025.json', 
  '/content/exams/fall-2025.json',
];
