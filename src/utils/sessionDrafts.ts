import { FORBIDDEN_RECORD_KEYS, isSafeIdentifier } from './sanitize';

const CHAT_DRAFT_SESSION_KEY = 'layali_alward_chat_draft_v1';
const QUESTION_DRAFTS_SESSION_KEY = 'layali_alward_question_drafts_v1';
const MAX_CHAT_DRAFT_CHARS = 1000;
const MAX_QUESTION_DRAFT_ENTRIES = 24;

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function loadChatDraft(): string {
  const ss = getSessionStorage();
  if (!ss) return '';
  try {
    const raw = ss.getItem(CHAT_DRAFT_SESSION_KEY);
    return typeof raw === 'string' ? raw.slice(0, MAX_CHAT_DRAFT_CHARS) : '';
  } catch {
    return '';
  }
}

export function saveChatDraft(draft: string): void {
  const ss = getSessionStorage();
  if (!ss) return;
  try {
    if (!draft) {
      ss.removeItem(CHAT_DRAFT_SESSION_KEY);
    } else {
      ss.setItem(CHAT_DRAFT_SESSION_KEY, draft.slice(0, MAX_CHAT_DRAFT_CHARS));
    }
  } catch {
    // Ignore sessionStorage quota or privacy-mode errors cleanly
  }
}

export function clearChatDraft(): void {
  const ss = getSessionStorage();
  if (!ss) return;
  try {
    ss.removeItem(CHAT_DRAFT_SESSION_KEY);
  } catch {
    // Ignore sessionStorage errors cleanly
  }
}

function readQuestionDraftMap(): Record<string, string[]> {
  const ss = getSessionStorage();
  if (!ss) return {};
  try {
    const raw = ss.getItem(QUESTION_DRAFTS_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean: Record<string, string[]> = {};
    let count = 0;
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (count >= MAX_QUESTION_DRAFT_ENTRIES) break;
      if (!k || k.length > 200 || FORBIDDEN_RECORD_KEYS.has(k) || !Array.isArray(v)) {
        continue;
      }
      const picks = Array.from(
        new Set(v.filter((item): item is string => isSafeIdentifier(item)).slice(0, 32))
      );
      if (picks.length > 0) {
        clean[k] = picks;
        count += 1;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function writeQuestionDraftMap(map: Record<string, string[]>): void {
  const ss = getSessionStorage();
  if (!ss) return;
  try {
    const keys = Object.keys(map);
    if (keys.length === 0) {
      ss.removeItem(QUESTION_DRAFTS_SESSION_KEY);
      return;
    }
    const trimmed =
      keys.length > MAX_QUESTION_DRAFT_ENTRIES
        ? Object.fromEntries(keys.slice(-MAX_QUESTION_DRAFT_ENTRIES).map((k) => [k, map[k]]))
        : map;
    ss.setItem(QUESTION_DRAFTS_SESSION_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore sessionStorage errors cleanly
  }
}

function makeDraftKey(setId: string, questionId: string): string | null {
  if (!isSafeIdentifier(setId) || !isSafeIdentifier(questionId)) return null;
  return `${setId}::${questionId}`;
}

export function loadQuestionDraft(setId: string, questionId: string): string[] | null {
  const key = makeDraftKey(setId, questionId);
  if (!key) return null;
  const map = readQuestionDraftMap();
  return map[key] ?? null;
}

export function saveQuestionDraft(
  setId: string,
  questionId: string,
  selectedIds: string[]
): void {
  const key = makeDraftKey(setId, questionId);
  if (!key) return;
  const cleanPicks = Array.from(
    new Set(selectedIds.filter((id) => isSafeIdentifier(id)).slice(0, 32))
  );
  const map = readQuestionDraftMap();
  if (cleanPicks.length === 0) {
    if (key in map) {
      delete map[key];
      writeQuestionDraftMap(map);
    }
    return;
  }
  map[key] = cleanPicks;
  writeQuestionDraftMap(map);
}

export function clearQuestionDraft(setId: string, questionId: string): void {
  const key = makeDraftKey(setId, questionId);
  if (!key) return;
  const map = readQuestionDraftMap();
  if (key in map) {
    delete map[key];
    writeQuestionDraftMap(map);
  }
}

export function clearQuestionDraftsForSet(setId: string): void {
  if (!isSafeIdentifier(setId)) return;
  const prefix = `${setId}::`;
  const map = readQuestionDraftMap();
  let changed = false;
  for (const key of Object.keys(map)) {
    if (key.startsWith(prefix)) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) {
    writeQuestionDraftMap(map);
  }
}

export function clearAllSessionDrafts(): void {
  clearChatDraft();
  const ss = getSessionStorage();
  if (!ss) return;
  try {
    ss.removeItem(QUESTION_DRAFTS_SESSION_KEY);
  } catch {
    // Ignore sessionStorage errors cleanly
  }
}
