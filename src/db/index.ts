import Dexie, { type Table } from 'dexie';
import type { UserAnswer, Session, UserProgress } from '../types';

export class PsychometricDB extends Dexie {
  answers!: Table<UserAnswer>;
  sessions!: Table<Session>;
  progress!: Table<UserProgress>;

  constructor() {
    super('psychometric-trainer');
    
    this.version(1).stores({
      // Indexes for efficient querying
      answers: 'id, questionId, sessionId, mode, answeredAt, isCorrect, [mode+isCorrect], [questionId+mode]',
      sessions: 'id, mode, startedAt, status, examId, [mode+status]',
      progress: 'id', // Single record, id = 'user'
    });
  }
}

export const db = new PsychometricDB();

// ============ Database Operations ============

// Answers
export async function saveAnswer(answer: UserAnswer): Promise<string> {
  return db.answers.put(answer);
}

export async function getAnswersBySession(sessionId: string): Promise<UserAnswer[]> {
  return db.answers.where('sessionId').equals(sessionId).toArray();
}

export async function getAnswersByQuestion(questionId: string): Promise<UserAnswer[]> {
  return db.answers.where('questionId').equals(questionId).toArray();
}

export async function getMistakes(mode?: 'training' | 'simulation'): Promise<UserAnswer[]> {
  if (mode) {
    return db.answers.where('[mode+isCorrect]').equals([mode, 0]).toArray();
  }
  return db.answers.where('isCorrect').equals(0).toArray();
}

export async function getRecentAnswers(limit: number = 100): Promise<UserAnswer[]> {
  return db.answers.orderBy('answeredAt').reverse().limit(limit).toArray();
}

// Alias for progressStore
export async function getAnswerHistory(): Promise<UserAnswer[]> {
  return db.answers.toArray();
}

export async function getSessionHistory(): Promise<Session[]> {
  return db.sessions.toArray();
}

// Sessions
export async function saveSession(session: Session): Promise<string> {
  return db.sessions.put(session);
}

export async function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id);
}

export async function getActiveSessions(): Promise<Session[]> {
  return db.sessions.where('status').equals('in-progress').toArray();
}

export async function getCompletedSessions(mode?: 'training' | 'simulation'): Promise<Session[]> {
  if (mode) {
    return db.sessions.where('[mode+status]').equals([mode, 'completed']).toArray();
  }
  return db.sessions.where('status').equals('completed').toArray();
}

export async function getRecentSessions(limit: number = 10): Promise<Session[]> {
  return db.sessions.orderBy('startedAt').reverse().limit(limit).toArray();
}

export async function abandonSession(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, { 
    status: 'abandoned',
    completedAt: new Date().toISOString()
  });
}

// Progress
export async function getProgress(): Promise<UserProgress | undefined> {
  return db.progress.get('user');
}

export async function saveProgress(progress: UserProgress): Promise<string> {
  progress.id = 'user';
  return db.progress.put(progress);
}

export async function initializeProgress(): Promise<UserProgress> {
  const existing = await getProgress();
  if (existing) return existing;

  const initial: UserProgress = {
    id: 'user',
    questionsAttempted: 0,
    questionsCorrect: 0,
    totalStudyTimeMinutes: 0,
    streakDays: 0,
    lastPracticeDate: new Date().toISOString(),
    examsCompleted: [],
  };
  
  await saveProgress(initial);
  return initial;
}

// Export for backup
export async function exportAllData(): Promise<{
  answers: UserAnswer[];
  sessions: Session[];
  progress: UserProgress | undefined;
  exportedAt: string;
}> {
  const [answers, sessions, progress] = await Promise.all([
    db.answers.toArray(),
    db.sessions.toArray(),
    getProgress()
  ]);
  
  return {
    answers,
    sessions,
    progress,
    exportedAt: new Date().toISOString()
  };
}

// Clear all data (for reset)
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.answers.clear(),
    db.sessions.clear(),
    db.progress.clear()
  ]);
}
