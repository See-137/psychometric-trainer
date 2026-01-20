import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadExamIndex, loadCompleteExamData } from '../services/contentLoader';

// Mock fetch for testing
const mockFetch = vi.fn();

describe('Content Loader', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('loadExamIndex', () => {
    it('loads exam index successfully', async () => {
      const mockIndex = {
        exams: [
          { id: 'spring-2025', name: 'מבחן אביב 2025', file: 'spring-2025.json', questionCount: 130 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const result = await loadExamIndex();
      
      expect(mockFetch).toHaveBeenCalledWith('/content/exams/index.json');
      expect(result.exams).toHaveLength(1);
      expect(result.exams[0].id).toBe('spring-2025');
    });

    it('throws error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(loadExamIndex()).rejects.toThrow('Failed to load exam index');
    });
  });

  describe('loadCompleteExamData', () => {
    it('loads and transforms exam data correctly', async () => {
      const mockExamData = {
        id: 'spring-2025',
        name: 'מבחן אביב 2025',
        nameEn: 'Spring 2025 Exam',
        questions: [
          {
            id: 'spring-2025-verbal-1-1',
            examId: 'spring-2025',
            sectionType: 'verbal',
            sectionNumber: 1,
            questionNumber: 1,
            language: 'he',
            stem: 'Test question',
            options: [
              { id: 1, text: 'Option A', label: 'א' },
              { id: 2, text: 'Option B', label: 'ב' },
              { id: 3, text: 'Option C', label: 'ג' },
              { id: 4, text: 'Option D', label: 'ד' },
            ],
            correctAnswer: 1,
            explanation: 'Test explanation',
            hasFullText: true,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExamData,
      });

      const result = await loadCompleteExamData('/content/exams/spring-2025.json');
      
      expect(result.id).toBe('spring-2025');
      expect(result.sections).toBeDefined();
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('handles English questions with proper type mapping', async () => {
      const mockExamData = {
        id: 'spring-2025',
        name: 'מבחן אביב 2025',
        nameEn: 'Spring 2025 Exam',
        questions: [
          {
            id: 'spring-2025-english-1-1',
            examId: 'spring-2025',
            sectionType: 'english',
            sectionNumber: 1,
            questionNumber: 1, // Should be sentence-completion-english
            language: 'en',
            stem: 'The natural _____ known as...',
            options: [
              { id: 1, text: 'persuasion', label: '1' },
              { id: 2, text: 'coincidence', label: '2' },
              { id: 3, text: 'phenomenon', label: '3' },
              { id: 4, text: 'remedy', label: '4' },
            ],
            correctAnswer: 3,
            explanation: 'Test explanation',
            hasFullText: true,
          },
          {
            id: 'spring-2025-english-1-10',
            examId: 'spring-2025',
            sectionType: 'english',
            sectionNumber: 1,
            questionNumber: 10, // Should be restatement
            language: 'en',
            stem: 'Restatement question...',
            options: [
              { id: 1, text: 'Option 1', label: '1' },
              { id: 2, text: 'Option 2', label: '2' },
              { id: 3, text: 'Option 3', label: '3' },
              { id: 4, text: 'Option 4', label: '4' },
            ],
            correctAnswer: 1,
            explanation: 'Test explanation',
            hasFullText: true,
          },
          {
            id: 'spring-2025-english-1-15',
            examId: 'spring-2025',
            sectionType: 'english',
            sectionNumber: 1,
            questionNumber: 15, // Should be reading-comprehension-english
            language: 'en',
            stem: 'According to the text...',
            options: [
              { id: 1, text: 'Option 1', label: '1' },
              { id: 2, text: 'Option 2', label: '2' },
              { id: 3, text: 'Option 3', label: '3' },
              { id: 4, text: 'Option 4', label: '4' },
            ],
            correctAnswer: 2,
            explanation: 'Test explanation',
            hasFullText: true,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExamData,
      });

      const result = await loadCompleteExamData('/content/exams/spring-2025.json');
      
      // Find the English section
      const englishSection = result.sections.find(s => s.type === 'english');
      expect(englishSection).toBeDefined();
      
      // Check question type mapping
      const q1 = englishSection!.questions.find(q => q.number === 1);
      const q10 = englishSection!.questions.find(q => q.number === 10);
      const q15 = englishSection!.questions.find(q => q.number === 15);
      
      expect(q1?.type).toBe('sentence-completion-english');
      expect(q10?.type).toBe('restatement');
      expect(q15?.type).toBe('reading-comprehension-english');
    });
  });
});
