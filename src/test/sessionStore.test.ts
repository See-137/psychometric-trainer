import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSessionStore } from '../stores/sessionStore';

// Track bookmark state for mock
let mockBookmarks = new Set<string>();

// Mock the database functions
vi.mock('../db', () => ({
  saveAnswer: vi.fn().mockResolvedValue('answer-id'),
  saveSession: vi.fn().mockResolvedValue('session-id'),
  toggleBookmark: vi.fn().mockImplementation(async (questionId: string) => {
    if (mockBookmarks.has(questionId)) {
      mockBookmarks.delete(questionId);
      return false;
    } else {
      mockBookmarks.add(questionId);
      return true;
    }
  }),
  getBookmarkedQuestions: vi.fn().mockImplementation(async () => Array.from(mockBookmarks)),
}));

describe('Session Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { getState } = useSessionStore;
    act(() => {
      getState().resetSession();
    });
    // Reset mocks and bookmark state
    vi.clearAllMocks();
    mockBookmarks = new Set<string>();
  });

  it('initializes with null session', () => {
    const { result } = renderHook(() => useSessionStore());
    
    expect(result.current.currentSession).toBeNull();
    expect(result.current.currentQuestion).toBeNull();
  });

  it('starts a training session', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startTrainingSession(['q1', 'q2'], ['section-1']);
    });

    expect(result.current.currentSession).not.toBeNull();
    expect(result.current.currentSession?.mode).toBe('training');
    expect(result.current.currentSession?.questionIds).toHaveLength(2);
  });

  it('navigates between questions', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startTrainingSession(['q1', 'q2', 'q3'], ['section-1']);
    });

    expect(result.current.currentSession?.currentQuestionIndex).toBe(0);

    act(() => {
      result.current.nextQuestion();
    });

    expect(result.current.currentSession?.currentQuestionIndex).toBe(1);

    act(() => {
      result.current.prevQuestion();
    });

    expect(result.current.currentSession?.currentQuestionIndex).toBe(0);
  });

  it('goes to specific question index', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startTrainingSession(['q1', 'q2', 'q3'], ['section-1']);
    });

    act(() => {
      result.current.goToQuestion(2);
    });

    expect(result.current.currentSession?.currentQuestionIndex).toBe(2);
  });

  it('does not go past last question', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startTrainingSession(['q1', 'q2'], ['section-1']);
    });

    act(() => {
      result.current.goToQuestion(0);
      result.current.nextQuestion();
      result.current.nextQuestion(); // Try to go past end
    });

    expect(result.current.currentSession?.currentQuestionIndex).toBe(1);
  });

  it('does not go before first question', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startTrainingSession(['q1', 'q2'], ['section-1']);
    });

    act(() => {
      result.current.prevQuestion(); // Try to go before start
    });

    expect(result.current.currentSession?.currentQuestionIndex).toBe(0);
  });

  it('toggles flag for questions', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startTrainingSession(['q1', 'q2'], ['section-1']);
    });

    act(() => {
      result.current.toggleFlag('q1');
    });

    expect(result.current.flaggedQuestions.has('q1')).toBe(true);

    act(() => {
      result.current.toggleFlag('q1');
    });

    expect(result.current.flaggedQuestions.has('q1')).toBe(false);
  });

  it('toggles bookmark for questions', async () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startTrainingSession(['q1', 'q2'], ['section-1']);
    });

    await act(async () => {
      await result.current.toggleBookmark('q1');
    });

    expect(result.current.bookmarkedQuestions.has('q1')).toBe(true);

    await act(async () => {
      await result.current.toggleBookmark('q1');
    });

    expect(result.current.bookmarkedQuestions.has('q1')).toBe(false);
  });

  it('toggles pause state', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startTrainingSession(['q1', 'q2'], ['section-1']);
    });

    expect(result.current.isPaused).toBe(false);

    act(() => {
      result.current.togglePause();
    });

    expect(result.current.isPaused).toBe(true);

    act(() => {
      result.current.togglePause();
    });

    expect(result.current.isPaused).toBe(false);
  });

  it('resets session correctly', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startTrainingSession(['q1', 'q2'], ['section-1']);
      result.current.toggleFlag('q1');
    });

    act(() => {
      result.current.resetSession();
    });

    expect(result.current.currentSession).toBeNull();
    expect(result.current.flaggedQuestions.size).toBe(0);
    expect(result.current.isPaused).toBe(false);
  });
});
