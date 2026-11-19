import type {
  DeviceRole,
  GameMode,
  GameProgress,
  GameRealm,
  ModeProgressRegistry,
  PartnerSnapshot,
  QuestionSet,
} from '../data/types';
import { FORBIDDEN_RECORD_KEYS, MAX_IDENTIFIER_LENGTH } from '../utils/sanitize';
import {
  isLocalVaultWriteProtected,
  isStorageQuotaError,
  recordBootStorageIssue,
  reportStorageWriteIssue,
  sealLocalStoragePayload,
  shouldBlockEncryptedStorageOverwrite,
  unsealLocalStoragePayload,
} from '../utils/security';

export const STORAGE_KEY = 'layali_alward_progress_v1';
const LEGACY_STORAGE_KEY = 'after_dark_progress_v1';

export const DEFAULT_WIFE_NAME = 'ضيفـة الليل';
export const DEFAULT_HUSBAND_NAME = 'رفيـق الليل';

export function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `lw-${crypto.randomUUID()}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `lw-${Date.now().toString(36)}-${hex}`;
  }
  return `lw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createInitialModeProgress(): ModeProgressRegistry {
  return {
    questions: {
      updatedAt: null,
    },
    cards: {
      sessionsCompleted: 0,
      drawnCount: 0,
      favoriteCardIds: [],
      updatedAt: null,
    },
    dialogue: {
      sessionsCompleted: 0,
      discussedTopicIds: [],
      favoriteTopicIds: [],
      updatedAt: null,
    },
    challenges: {
      sessionsCompleted: 0,
      completedChallengeIds: [],
      updatedAt: null,
    },
  };
}

export function getDefaultPartnerName(role: DeviceRole): string {
  return role === 'husband' ? 'الشريكة' : 'الشريك';
}

export function createInitialPartnerSnapshot(role: DeviceRole = 'wife'): PartnerSnapshot {
  return {
    partnerName: getDefaultPartnerName(role),
    answersBySet: {},
    completedSetIds: [],
    lastSyncedAt: null,
    pairedDeviceId: null,
    pairedDeviceLabel: null,
  };
}

export function createInitialProgress(
  role: DeviceRole = 'wife',
  roleConfigured = false
): GameProgress {
  return {
    deviceId: generateDeviceId(),
    role,
    roleConfigured,
    playerName: role === 'husband' ? DEFAULT_HUSBAND_NAME : DEFAULT_WIFE_NAME,
    answersBySet: {},
    completedSetIds: [],
    modeProgress: createInitialModeProgress(),
    partnerSnapshot: createInitialPartnerSnapshot(role),
    settings: {
      soundEnabled: true,
      motionEnabled: true,
      hapticsEnabled: true,
      privacyCurtainEnabled: true,
      cloudAutoSyncEnabled: true,
    },
  };
}

/**
 * Locks the device edition (Wife or Husband) once upon initial install / onboarding.
 */
export function lockInitialDeviceRole(
  progress: GameProgress,
  chosenRole: DeviceRole,
  customName?: string
): GameProgress {
  const trimmed = customName?.trim().slice(0, 24) ?? '';
  const defaultForRole = chosenRole === 'husband' ? DEFAULT_HUSBAND_NAME : DEFAULT_WIFE_NAME;
  const shouldUseDefault =
    !trimmed ||
    trimmed === DEFAULT_WIFE_NAME ||
    trimmed === DEFAULT_HUSBAND_NAME;

  const currentPartnerName = progress.partnerSnapshot.partnerName;
  const isDefaultPartnerLabel =
    !currentPartnerName ||
    currentPartnerName === 'الشريك' ||
    currentPartnerName === 'الشريكة';

  return {
    ...progress,
    role: chosenRole,
    roleConfigured: true,
    playerName: shouldUseDefault ? defaultForRole : trimmed,
    partnerSnapshot: {
      ...progress.partnerSnapshot,
      partnerName: isDefaultPartnerLabel
        ? getDefaultPartnerName(chosenRole)
        : currentPartnerName,
    },
  };
}

/**
 * Safely switches the device edition (Wife <-> Husband) from Settings.
 * Resets pairing/partner snapshot state so the wrong-role vault or peer pin does not leak,
 * while preserving the device ID, settings, and Wife's own local answers if she switches back.
 */
export function switchDeviceRole(
  progress: GameProgress,
  nextRole: DeviceRole
): GameProgress {
  const usingDefaultName =
    progress.playerName === DEFAULT_WIFE_NAME ||
    progress.playerName === DEFAULT_HUSBAND_NAME ||
    !progress.playerName.trim();

  return {
    ...progress,
    role: nextRole,
    roleConfigured: true,
    playerName: usingDefaultName
      ? nextRole === 'husband'
        ? DEFAULT_HUSBAND_NAME
        : DEFAULT_WIFE_NAME
      : progress.playerName,
    partnerSnapshot: createInitialPartnerSnapshot(nextRole),
  };
}

export type PartnerConnectionStatus = 'connected' | 'waiting' | 'pending' | 'error' | 'offline';

export function computePartnerConnectionStatus(params: {
  nearbyStatus: string;
  isCloudLinked: boolean;
  isOnline: boolean;
  cloudAutoSyncEnabled: boolean;
  cloudStatus: string;
  cloudPartnerJoined: boolean;
}): PartnerConnectionStatus {
  if (params.nearbyStatus === 'connected') {
    return 'connected';
  }
  const hasActiveCloudLink =
    params.isCloudLinked &&
    params.isOnline &&
    params.cloudAutoSyncEnabled &&
    (params.cloudStatus === 'synced' || params.cloudStatus === 'syncing');

  if (hasActiveCloudLink && params.cloudPartnerJoined) {
    return 'connected';
  }
  if (
    params.nearbyStatus === 'error' ||
    (params.isCloudLinked && params.cloudStatus === 'error')
  ) {
    return 'error';
  }
  if (params.isCloudLinked && params.cloudStatus === 'offline-pending') {
    return 'pending';
  }
  if (
    params.nearbyStatus === 'waiting-peer' ||
    params.nearbyStatus === 'connecting' ||
    (params.isCloudLinked && !params.cloudPartnerJoined)
  ) {
    return 'waiting';
  }
  return 'offline';
}

/**
 * Returns a GameProgress-shaped view reflecting the Questions source appropriate
 * for the active device role:
 * - Wife role: her own local answers (`progress.answersBySet`)
 * - Husband role: the synced partner answers (`progress.partnerSnapshot.answersBySet`)
 */
export function getQuestionsViewProgress(progress: GameProgress): GameProgress {
  if (progress.role !== 'husband') {
    return progress;
  }
  return {
    ...progress,
    answersBySet: progress.partnerSnapshot.answersBySet,
    completedSetIds: progress.partnerSnapshot.completedSetIds,
  };
}

/**
 * يضمن قبول اللقطات الأحدث فقط عبر مقارنة ساعة جهاز الزوجة (monotonic revision)
 * لمنع تراجع الإجابات أو تضارب المزامنة بين القريب والسحابي.
 */
export function shouldApplyIncomingSnapshotRevision(
  currentLastSyncedAt: number | null | undefined,
  incomingUpdatedAt: number | null | undefined
): boolean {
  const cur = typeof currentLastSyncedAt === 'number' && Number.isFinite(currentLastSyncedAt)
    ? currentLastSyncedAt
    : 0;
  const incoming = typeof incomingUpdatedAt === 'number' && Number.isFinite(incomingUpdatedAt)
    ? incomingUpdatedAt
    : 0;
  if (cur <= 0) return true;
  return incoming > cur;
}

function areAnswersSnapshotsEqual(
  a: Record<string, Record<string, string[]>>,
  b: Record<string, Record<string, string[]>>
): boolean {
  const setsA = Object.keys(a);
  const setsB = Object.keys(b);
  if (setsA.length !== setsB.length) return false;
  for (const setId of setsA) {
    const qMapA = a[setId];
    const qMapB = b[setId];
    if (!qMapB) return false;
    const qKeysA = Object.keys(qMapA);
    const qKeysB = Object.keys(qMapB);
    if (qKeysA.length !== qKeysB.length) return false;
    for (const qId of qKeysA) {
      const picksA = qMapA[qId];
      const picksB = qMapB[qId];
      if (!picksB || picksA.length !== picksB.length) return false;
      for (let i = 0; i < picksA.length; i += 1) {
        if (picksA[i] !== picksB[i]) return false;
      }
    }
  }
  return true;
}

/**
 * Accepts strictly newer revisions, AND reconciles equal-timestamp full snapshots
 * when answers or completed sets differ (recovering missed live packets without allowing rollback).
 */
export function shouldAcceptPartnerSnapshotUpdate(
  currentSnapshot: PartnerSnapshot,
  incomingUpdatedAt: number | null | undefined,
  incomingAnswersBySet: Record<string, Record<string, string[]>>,
  incomingCompletedSetIds: string[] = []
): boolean {
  if (shouldApplyIncomingSnapshotRevision(currentSnapshot.lastSyncedAt, incomingUpdatedAt)) {
    return true;
  }
  const cur =
    typeof currentSnapshot.lastSyncedAt === 'number' &&
    Number.isFinite(currentSnapshot.lastSyncedAt)
      ? currentSnapshot.lastSyncedAt
      : 0;
  const incoming =
    typeof incomingUpdatedAt === 'number' && Number.isFinite(incomingUpdatedAt)
      ? incomingUpdatedAt
      : 0;
  if (cur > 0 && incoming === cur) {
    const cleanIncomingAnswers = sanitizeAnswersBySet(incomingAnswersBySet);
    if (!areAnswersSnapshotsEqual(currentSnapshot.answersBySet, cleanIncomingAnswers)) {
      return true;
    }
    const cleanCurCompleted = Array.from(new Set(currentSnapshot.completedSetIds)).sort();
    const cleanNextCompleted = Array.from(new Set(incomingCompletedSetIds)).sort();
    if (cleanCurCompleted.length !== cleanNextCompleted.length) return true;
    return cleanCurCompleted.some((id, idx) => id !== cleanNextCompleted[idx]);
  }
  return false;
}

export function applyIncomingPartnerSnapshot(
  progress: GameProgress,
  incoming: {
    partnerName?: string;
    answersBySet: Record<string, Record<string, string[]>>;
    completedSetIds: string[];
    pairedDeviceId?: string | null;
    pairedDeviceLabel?: string | null;
    syncedAt?: number;
  }
): GameProgress {
  const cleanAnswers = sanitizeAnswersBySet(incoming.answersBySet);
  const cleanCompleted = Array.isArray(incoming.completedSetIds)
    ? incoming.completedSetIds.filter((id): id is string => typeof id === 'string')
    : [];

  const resolvedSyncedAt =
    typeof incoming.syncedAt === 'number' && Number.isFinite(incoming.syncedAt)
      ? incoming.syncedAt
      : (progress.partnerSnapshot.lastSyncedAt ?? 1);

  return {
    ...progress,
    partnerSnapshot: {
      partnerName:
        typeof incoming.partnerName === 'string' && incoming.partnerName.trim()
          ? incoming.partnerName.trim().slice(0, 24)
          : progress.partnerSnapshot.partnerName || getDefaultPartnerName(progress.role),
      answersBySet: cleanAnswers,
      completedSetIds: cleanCompleted,
      lastSyncedAt: resolvedSyncedAt,
      pairedDeviceId:
        incoming.pairedDeviceId !== undefined
          ? incoming.pairedDeviceId
          : progress.partnerSnapshot.pairedDeviceId,
      pairedDeviceLabel:
        incoming.pairedDeviceLabel !== undefined
          ? incoming.pairedDeviceLabel
          : progress.partnerSnapshot.pairedDeviceLabel,
    },
  };
}

/**
 * Clears the pinned partner device ID while preserving already-synced partner answers,
 * allowing explicit re-pairing if a spouse switches to a new phone.
 */
export function unpinPartnerDevice(progress: GameProgress): GameProgress {
  return {
    ...progress,
    partnerSnapshot: {
      ...progress.partnerSnapshot,
      pairedDeviceId: null,
      pairedDeviceLabel: null,
    },
  };
}

/**
 * Pure toggle for multi-select or single-select question options.
 */
export function toggleOptionSelection(
  currentSelected: string[],
  optionId: string,
  allowMultiple: boolean,
  maxSelect?: number
): string[] {
  const exists = currentSelected.includes(optionId);

  if (!allowMultiple) {
    return exists ? [] : [optionId];
  }

  if (exists) {
    return currentSelected.filter((id) => id !== optionId);
  }

  if (typeof maxSelect === 'number' && maxSelect > 0 && currentSelected.length >= maxSelect) {
    // Replace oldest selection when cap is reached
    return [...currentSelected.slice(1), optionId];
  }

  return [...currentSelected, optionId];
}

export function canConfirmQuestion(selectedOptions: string[], minSelect: number): boolean {
  return selectedOptions.length >= Math.max(1, minSelect);
}

export function getNextMonotonicQuestionTimestamp(
  prevUpdatedAt: number | null | undefined,
  now = Date.now()
): number {
  const prev =
    typeof prevUpdatedAt === 'number' && Number.isFinite(prevUpdatedAt) ? prevUpdatedAt : 0;
  return Math.max(now, prev + 1);
}

export function confirmQuestionAnswer(
  progress: GameProgress,
  setId: string,
  questionId: string,
  selectedOptions: string[],
  totalQuestionsInSet: number,
  updatedAt?: number
): GameProgress {
  const uniqueSelected = Array.from(new Set(selectedOptions));
  const prevSetAnswers = progress.answersBySet[setId] ?? {};
  const nextSetAnswers: Record<string, string[]> = {
    ...prevSetAnswers,
    [questionId]: uniqueSelected,
  };

  const answeredCount = Object.keys(nextSetAnswers).filter(
    (qId) => (nextSetAnswers[qId]?.length ?? 0) > 0
  ).length;

  const isNowCompleted = totalQuestionsInSet > 0 && answeredCount >= totalQuestionsInSet;
  const nextCompletedSetIds = isNowCompleted
    ? progress.completedSetIds.includes(setId)
      ? progress.completedSetIds
      : [...progress.completedSetIds, setId]
    : progress.completedSetIds.filter((id) => id !== setId);

  const nextAnswersBySet = {
    ...progress.answersBySet,
    [setId]: nextSetAnswers,
  };

  const nextUpdatedAt =
    typeof updatedAt === 'number' && Number.isFinite(updatedAt)
      ? Math.max(updatedAt, (progress.modeProgress.questions.updatedAt ?? 0) + 1)
      : getNextMonotonicQuestionTimestamp(progress.modeProgress.questions.updatedAt);

  return {
    ...progress,
    answersBySet: nextAnswersBySet,
    completedSetIds: nextCompletedSetIds,
    modeProgress: {
      ...progress.modeProgress,
      questions: {
        updatedAt: nextUpdatedAt,
      },
    },
  };
}

export interface SetProgressSummary {
  totalQuestions: number;
  answeredQuestions: number;
  totalSelectionsCount: number;
  isCompleted: boolean;
  percent: number;
  status: 'new' | 'in-progress' | 'completed';
}

export function getSetProgress(progress: GameProgress, set: QuestionSet): SetProgressSummary {
  const setAnswers = progress.answersBySet[set.id] ?? {};
  let answeredQuestions = 0;
  let totalSelectionsCount = 0;

  for (const question of set.questions) {
    const picks = setAnswers[question.id] ?? [];
    if (picks.length > 0) {
      answeredQuestions += 1;
      totalSelectionsCount += picks.length;
    }
  }

  const totalQuestions = set.questions.length;
  const isCompleted = totalQuestions > 0 && answeredQuestions >= totalQuestions;
  const percent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  let status: SetProgressSummary['status'] = 'new';
  if (isCompleted) {
    status = 'completed';
  } else if (answeredQuestions > 0) {
    status = 'in-progress';
  }

  return {
    totalQuestions,
    answeredQuestions,
    totalSelectionsCount,
    isCompleted,
    percent,
    status,
  };
}

export interface RealmProgressSummary {
  totalSets: number;
  completedSets: number;
  totalQuestions: number;
  answeredQuestions: number;
  percent: number;
  isRealmCompleted: boolean;
}

export function getRealmProgress(progress: GameProgress, realm: GameRealm): RealmProgressSummary {
  let completedSets = 0;
  let totalQuestions = 0;
  let answeredQuestions = 0;

  for (const set of realm.sets) {
    const summary = getSetProgress(progress, set);
    if (summary.isCompleted) {
      completedSets += 1;
    }
    totalQuestions += summary.totalQuestions;
    answeredQuestions += summary.answeredQuestions;
  }

  const totalSets = realm.sets.length;
  const percent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const isRealmCompleted = totalSets > 0 && completedSets >= totalSets;

  return {
    totalSets,
    completedSets,
    totalQuestions,
    answeredQuestions,
    percent,
    isRealmCompleted,
  };
}

export interface OverallProgressSummary {
  totalRealms: number;
  completedRealms: number;
  totalSets: number;
  completedSets: number;
  totalQuestions: number;
  answeredQuestions: number;
  totalSelectionsCount: number;
  percent: number;
}

export function getOverallProgress(progress: GameProgress, realms: GameRealm[]): OverallProgressSummary {
  let completedRealms = 0;
  let totalSets = 0;
  let completedSets = 0;
  let totalQuestions = 0;
  let answeredQuestions = 0;
  let totalSelectionsCount = 0;

  for (const realm of realms) {
    let realmCompletedSets = 0;
    for (const set of realm.sets) {
      const sp = getSetProgress(progress, set);
      if (sp.isCompleted) {
        realmCompletedSets += 1;
      }
      totalSets += 1;
      totalQuestions += sp.totalQuestions;
      answeredQuestions += sp.answeredQuestions;
      totalSelectionsCount += sp.totalSelectionsCount;
    }
    completedSets += realmCompletedSets;
    if (realm.sets.length > 0 && realmCompletedSets >= realm.sets.length) {
      completedRealms += 1;
    }
  }

  const percent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  return {
    totalRealms: realms.length,
    completedRealms,
    totalSets,
    completedSets,
    totalQuestions,
    answeredQuestions,
    totalSelectionsCount,
    percent,
  };
}

export interface PlatformProgressSummary {
  totalModes: number;
  availableModes: number;
  activeModesCount: number;
  totalRoundsCompleted: number;
  localRoundsCompleted: number;
  totalSavedEntries: number;
  overallPercent: number;
  questionsSummary: OverallProgressSummary;
  partnerSynced: boolean;
}

/**
 * Mode-agnostic progress summary across the entire multi-mode platform,
 * combining Questions mode (wife local or husband synced partner view) plus
 * upcoming live modes (Cards, Dialogue, Challenges).
 */
export function getPlatformProgress(
  progress: GameProgress,
  modes: GameMode[],
  realms: GameRealm[]
): PlatformProgressSummary {
  const viewProgress = getQuestionsViewProgress(progress);
  const questionsSummary = getOverallProgress(viewProgress, realms);
  const partnerSynced =
    progress.role !== 'husband' || progress.partnerSnapshot.lastSyncedAt !== null;

  const mp = progress.modeProgress;
  const availableModesList = modes.filter((m) => m.isAvailable);
  const availableModes = availableModesList.length || 1;

  let activeModesCount = 0;
  if (questionsSummary.answeredQuestions > 0) activeModesCount += 1;
  if (mp.cards.drawnCount > 0 || mp.cards.sessionsCompleted > 0) activeModesCount += 1;
  if (mp.dialogue.discussedTopicIds.length > 0 || mp.dialogue.sessionsCompleted > 0) activeModesCount += 1;
  if (mp.challenges.completedChallengeIds.length > 0 || mp.challenges.sessionsCompleted > 0) {
    activeModesCount += 1;
  }

  const localRoundsCompleted =
    (progress.role === 'wife' ? questionsSummary.completedSets : 0) +
    mp.cards.sessionsCompleted +
    mp.dialogue.sessionsCompleted +
    mp.challenges.sessionsCompleted;

  const totalRoundsCompleted =
    questionsSummary.completedSets +
    mp.cards.sessionsCompleted +
    mp.dialogue.sessionsCompleted +
    mp.challenges.sessionsCompleted;

  const totalSavedEntries =
    questionsSummary.totalSelectionsCount +
    mp.cards.favoriteCardIds.length +
    mp.dialogue.favoriteTopicIds.length +
    mp.challenges.completedChallengeIds.length;

  // Weight currently available modes evenly; future live modes will contribute their own % when enabled
  const availableIds = new Set(availableModesList.map((m) => m.id));
  const modePercents: number[] = [];
  if (availableIds.has('mode-questions')) {
    modePercents.push(questionsSummary.percent);
  }
  if (availableIds.has('mode-cards')) {
    modePercents.push(mp.cards.sessionsCompleted > 0 ? 100 : Math.min(100, mp.cards.drawnCount * 10));
  }
  if (availableIds.has('mode-dialogue')) {
    modePercents.push(
      mp.dialogue.sessionsCompleted > 0 ? 100 : Math.min(100, mp.dialogue.discussedTopicIds.length * 10)
    );
  }
  if (availableIds.has('mode-challenges')) {
    modePercents.push(
      mp.challenges.sessionsCompleted > 0 ? 100 : Math.min(100, mp.challenges.completedChallengeIds.length * 10)
    );
  }
  const overallPercent =
    modePercents.length > 0
      ? Math.round(modePercents.reduce((sum, pct) => sum + pct, 0) / modePercents.length)
      : questionsSummary.percent;

  return {
    totalModes: modes.length,
    availableModes,
    activeModesCount,
    totalRoundsCompleted,
    localRoundsCompleted,
    totalSavedEntries,
    overallPercent,
    questionsSummary,
    partnerSynced,
  };
}

export function getNextUnansweredQuestionIndex(
  setAnswers: Record<string, string[]> | undefined,
  set: QuestionSet
): number {
  const answers = setAnswers ?? {};
  const idx = set.questions.findIndex((q) => (answers[q.id]?.length ?? 0) === 0);
  return idx >= 0 ? idx : 0;
}

export function getNextUnansweredIndexAfter(
  setAnswers: Record<string, string[]> | undefined,
  set: QuestionSet,
  currentIndex: number
): number {
  const total = set.questions.length;
  if (total === 0) return -1;
  const answers = setAnswers ?? {};
  const safeStart = Math.max(0, Math.min(currentIndex, total - 1));

  for (let offset = 1; offset <= total; offset += 1) {
    const idx = (safeStart + offset) % total;
    if ((answers[set.questions[idx].id]?.length ?? 0) === 0) {
      return idx;
    }
  }
  return -1;
}

export interface ResumeTarget {
  realm: GameRealm;
  set: QuestionSet;
  questionIndex: number;
}

export function getResumeTarget(
  progress: GameProgress,
  realms: GameRealm[]
): ResumeTarget | null {
  const overall = getOverallProgress(progress, realms);
  if (overall.answeredQuestions === 0) return null;

  const isHusband = progress.role === 'husband';

  // 1. Prefer an active in-progress level (has at least 1 answer and < 100%)
  for (const realm of realms) {
    for (const set of realm.sets) {
      const summary = getSetProgress(progress, set);
      if (summary.status === 'in-progress') {
        return {
          realm,
          set,
          questionIndex: isHusband
            ? 0
            : getNextUnansweredQuestionIndex(progress.answersBySet[set.id], set),
        };
      }
    }
  }

  // Husband cannot play unanswered (0-answer) levels; only resume partially synced sets
  if (isHusband) {
    return null;
  }

  // 2. Otherwise pick the next unstarted level inside a realm already started
  for (const realm of realms) {
    const realmSummary = getRealmProgress(progress, realm);
    if (realmSummary.answeredQuestions > 0 && !realmSummary.isRealmCompleted) {
      const nextSet = realm.sets.find((s) => !getSetProgress(progress, s).isCompleted);
      if (nextSet) {
        return { realm, set: nextSet, questionIndex: 0 };
      }
    }
  }

  // 3. Otherwise pick the first incomplete realm
  for (const realm of realms) {
    const nextSet = realm.sets.find((s) => !getSetProgress(progress, s).isCompleted);
    if (nextSet) {
      return { realm, set: nextSet, questionIndex: 0 };
    }
  }

  return null;
}

export function getNextIncompleteSetInRealm(
  progress: GameProgress,
  realm: GameRealm,
  currentSetId?: string
): QuestionSet | null {
  if (realm.sets.length === 0) return null;
  const currentIdx = currentSetId
    ? realm.sets.findIndex((s) => s.id === currentSetId)
    : -1;
  const startIdx = currentIdx >= 0 ? currentIdx + 1 : 0;

  if (progress.role === 'husband') {
    for (let idx = startIdx; idx < realm.sets.length; idx += 1) {
      const candidate = realm.sets[idx];
      if (getSetProgress(progress, candidate).answeredQuestions > 0) {
        return candidate;
      }
    }
    return null;
  }

  for (let offset = 0; offset < realm.sets.length; offset += 1) {
    const candidate = realm.sets[(startIdx + offset) % realm.sets.length];
    if (candidate.id !== currentSetId && !getSetProgress(progress, candidate).isCompleted) {
      return candidate;
    }
  }
  return null;
}

export function getNextIncompleteRealm(
  progress: GameProgress,
  realms: GameRealm[],
  currentRealmId: string
): GameRealm | null {
  if (realms.length === 0) return null;
  const startIdx = Math.max(0, realms.findIndex((r) => r.id === currentRealmId));

  if (progress.role === 'husband') {
    for (let offset = 1; offset < realms.length; offset += 1) {
      const candidate = realms[(startIdx + offset) % realms.length];
      if (
        candidate.id !== currentRealmId &&
        getRealmProgress(progress, candidate).answeredQuestions > 0
      ) {
        return candidate;
      }
    }
    return null;
  }

  for (let offset = 1; offset <= realms.length; offset += 1) {
    const candidate = realms[(startIdx + offset) % realms.length];
    if (candidate.id !== currentRealmId && !getRealmProgress(progress, candidate).isRealmCompleted) {
      return candidate;
    }
  }
  return null;
}

export function resetSetProgress(
  progress: GameProgress,
  setId: string,
  updatedAt?: number
): GameProgress {
  const nextAnswers = { ...progress.answersBySet };
  delete nextAnswers[setId];
  const nextCompletedSetIds = progress.completedSetIds.filter((id) => id !== setId);
  const nextUpdatedAt =
    typeof updatedAt === 'number' && Number.isFinite(updatedAt)
      ? Math.max(updatedAt, (progress.modeProgress.questions.updatedAt ?? 0) + 1)
      : getNextMonotonicQuestionTimestamp(progress.modeProgress.questions.updatedAt);
  return {
    ...progress,
    answersBySet: nextAnswers,
    completedSetIds: nextCompletedSetIds,
    modeProgress: {
      ...progress.modeProgress,
      questions: {
        updatedAt: nextUpdatedAt,
      },
    },
  };
}

export function toArabicDigits(num: number): string {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(Math.round(num)).replace(/\d/g, (d) => map[Number(d)] ?? d);
}

export function formatSetsCount(count: number): string {
  if (count === 1) return 'مستوى واحد';
  if (count === 2) return 'مستويان';
  if (count >= 3 && count <= 10) return `${toArabicDigits(count)} مستويات`;
  return `${toArabicDigits(count)} مستوى`;
}

export function formatQuestionsCountArabic(count: number): string {
  if (count === 0) return `${toArabicDigits(0)} سؤال`;
  if (count === 1) return 'سؤال واحد';
  if (count === 2) return 'سؤالان';
  if (count >= 3 && count <= 10) return `${toArabicDigits(count)} أسئلة`;
  return `${toArabicDigits(count)} سؤالاً`;
}

const MAX_SETS_COUNT = 500;
const MAX_QUESTIONS_PER_SET = 200;
const MAX_OPTIONS_PER_QUESTION = 32;
const MAX_ID_LENGTH = MAX_IDENTIFIER_LENGTH;

export function sanitizeAnswersBySet(raw: unknown): Record<string, Record<string, string[]>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clean: Record<string, Record<string, string[]>> = {};

  let setCount = 0;
  for (const [setId, rawSetAnswers] of Object.entries(raw as Record<string, unknown>)) {
    if (setCount >= MAX_SETS_COUNT) break;
    if (
      !setId ||
      setId.length > MAX_ID_LENGTH ||
      FORBIDDEN_RECORD_KEYS.has(setId) ||
      !rawSetAnswers ||
      typeof rawSetAnswers !== 'object' ||
      Array.isArray(rawSetAnswers)
    ) {
      continue;
    }
    const cleanSet: Record<string, string[]> = {};
    let qCount = 0;
    for (const [qId, rawPicks] of Object.entries(rawSetAnswers as Record<string, unknown>)) {
      if (qCount >= MAX_QUESTIONS_PER_SET) break;
      if (!qId || qId.length > MAX_ID_LENGTH || FORBIDDEN_RECORD_KEYS.has(qId)) {
        continue;
      }
      if (Array.isArray(rawPicks)) {
        const stringPicks = Array.from(
          new Set(
            rawPicks
              .filter(
                (item): item is string =>
                  typeof item === 'string' &&
                  item.length > 0 &&
                  item.length <= MAX_ID_LENGTH &&
                  !FORBIDDEN_RECORD_KEYS.has(item)
              )
              .slice(0, MAX_OPTIONS_PER_QUESTION)
          )
        );
        if (stringPicks.length > 0) {
          cleanSet[qId] = stringPicks;
          qCount += 1;
        }
      }
    }
    if (Object.keys(cleanSet).length > 0) {
      clean[setId] = cleanSet;
      setCount += 1;
    }
  }
  return clean;
}

function sanitizeStringArray(raw: unknown, maxItems = MAX_SETS_COUNT): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .filter(
          (id): id is string =>
            typeof id === 'string' &&
            id.length > 0 &&
            id.length <= MAX_ID_LENGTH &&
            !FORBIDDEN_RECORD_KEYS.has(id)
        )
        .slice(0, maxItems)
    )
  );
}

export function parseStoredProgress(rawJson: string | null): GameProgress {
  const fallback = createInitialProgress();
  if (!rawJson) return fallback;

  try {
    const parsed = JSON.parse(rawJson) as Partial<GameProgress>;
    if (!parsed || typeof parsed !== 'object') return fallback;

    const cleanRole: DeviceRole = parsed.role === 'husband' ? 'husband' : 'wife';
    const legacyQuestions = parsed.modeProgress?.questions as
      | { answersBySet?: unknown; completedSetIds?: unknown; updatedAt?: unknown }
      | undefined;
    const cleanAnswers = sanitizeAnswersBySet(
      parsed.answersBySet ?? legacyQuestions?.answersBySet
    );
    const cleanCompleted = sanitizeStringArray(
      parsed.completedSetIds ?? legacyQuestions?.completedSetIds
    ).filter((setId) => Boolean(cleanAnswers[setId] && Object.keys(cleanAnswers[setId]).length > 0));

    const rawMp = parsed.modeProgress;
    const baseMp = createInitialModeProgress();
    const cleanModeProgress: ModeProgressRegistry = {
      questions: {
        updatedAt:
          typeof rawMp?.questions?.updatedAt === 'number' ? rawMp.questions.updatedAt : null,
      },
      cards: {
        sessionsCompleted:
          typeof rawMp?.cards?.sessionsCompleted === 'number' && rawMp.cards.sessionsCompleted >= 0
            ? Math.floor(rawMp.cards.sessionsCompleted)
            : baseMp.cards.sessionsCompleted,
        drawnCount:
          typeof rawMp?.cards?.drawnCount === 'number' && rawMp.cards.drawnCount >= 0
            ? Math.floor(rawMp.cards.drawnCount)
            : baseMp.cards.drawnCount,
        favoriteCardIds: sanitizeStringArray(rawMp?.cards?.favoriteCardIds),
        updatedAt: typeof rawMp?.cards?.updatedAt === 'number' ? rawMp.cards.updatedAt : null,
      },
      dialogue: {
        sessionsCompleted:
          typeof rawMp?.dialogue?.sessionsCompleted === 'number' &&
          rawMp.dialogue.sessionsCompleted >= 0
            ? Math.floor(rawMp.dialogue.sessionsCompleted)
            : baseMp.dialogue.sessionsCompleted,
        discussedTopicIds: sanitizeStringArray(rawMp?.dialogue?.discussedTopicIds),
        favoriteTopicIds: sanitizeStringArray(rawMp?.dialogue?.favoriteTopicIds),
        updatedAt:
          typeof rawMp?.dialogue?.updatedAt === 'number' ? rawMp.dialogue.updatedAt : null,
      },
      challenges: {
        sessionsCompleted:
          typeof rawMp?.challenges?.sessionsCompleted === 'number' &&
          rawMp.challenges.sessionsCompleted >= 0
            ? Math.floor(rawMp.challenges.sessionsCompleted)
            : baseMp.challenges.sessionsCompleted,
        completedChallengeIds: sanitizeStringArray(rawMp?.challenges?.completedChallengeIds),
        updatedAt:
          typeof rawMp?.challenges?.updatedAt === 'number' ? rawMp.challenges.updatedAt : null,
      },
    };

    const rawPartner = parsed.partnerSnapshot;
    const basePartner = createInitialPartnerSnapshot(cleanRole);
    const rawPartnerName =
      typeof rawPartner?.partnerName === 'string' && rawPartner.partnerName.trim()
        ? rawPartner.partnerName.trim().slice(0, 24)
        : basePartner.partnerName;
    const isStaleWifeDefaultLabel =
      cleanRole === 'wife' &&
      rawPartnerName === 'الشريكة' &&
      typeof rawPartner?.pairedDeviceId !== 'string' &&
      typeof rawPartner?.lastSyncedAt !== 'number';
    const cleanPartnerSnapshot: PartnerSnapshot = {
      partnerName: isStaleWifeDefaultLabel ? basePartner.partnerName : rawPartnerName,
      answersBySet: sanitizeAnswersBySet(rawPartner?.answersBySet),
      completedSetIds: sanitizeStringArray(rawPartner?.completedSetIds),
      lastSyncedAt:
        typeof rawPartner?.lastSyncedAt === 'number' ? rawPartner.lastSyncedAt : null,
      pairedDeviceId:
        typeof rawPartner?.pairedDeviceId === 'string' ? rawPartner.pairedDeviceId : null,
      pairedDeviceLabel:
        typeof rawPartner?.pairedDeviceLabel === 'string' ? rawPartner.pairedDeviceLabel : null,
    };

    const hasExistingLegacyProgress =
      cleanRole === 'husband' ||
      Object.keys(cleanAnswers).length > 0 ||
      cleanCompleted.length > 0 ||
      Object.keys(cleanPartnerSnapshot.answersBySet).length > 0 ||
      cleanPartnerSnapshot.lastSyncedAt !== null ||
      (typeof parsed.playerName === 'string' &&
        parsed.playerName.trim().length > 0 &&
        parsed.playerName.trim() !== DEFAULT_WIFE_NAME);

    const cleanRoleConfigured =
      typeof parsed.roleConfigured === 'boolean'
        ? parsed.roleConfigured
        : hasExistingLegacyProgress;

    return {
      deviceId:
        typeof parsed.deviceId === 'string' && parsed.deviceId.trim()
          ? parsed.deviceId.trim().slice(0, 64)
          : fallback.deviceId,
      role: cleanRole,
      roleConfigured: cleanRoleConfigured,
      playerName:
        typeof parsed.playerName === 'string' && parsed.playerName.trim()
          ? parsed.playerName.trim().slice(0, 24)
          : cleanRole === 'husband'
            ? DEFAULT_HUSBAND_NAME
            : fallback.playerName,
      answersBySet: cleanAnswers,
      completedSetIds: cleanCompleted,
      modeProgress: cleanModeProgress,
      partnerSnapshot: cleanPartnerSnapshot,
      settings: {
        soundEnabled:
          typeof parsed.settings?.soundEnabled === 'boolean'
            ? parsed.settings.soundEnabled
            : fallback.settings.soundEnabled,
        motionEnabled:
          typeof parsed.settings?.motionEnabled === 'boolean'
            ? parsed.settings.motionEnabled
            : fallback.settings.motionEnabled,
        hapticsEnabled:
          typeof parsed.settings?.hapticsEnabled === 'boolean'
            ? parsed.settings.hapticsEnabled
            : fallback.settings.hapticsEnabled,
        privacyCurtainEnabled:
          typeof parsed.settings?.privacyCurtainEnabled === 'boolean'
            ? parsed.settings.privacyCurtainEnabled
            : fallback.settings.privacyCurtainEnabled,
        cloudAutoSyncEnabled:
          typeof parsed.settings?.cloudAutoSyncEnabled === 'boolean'
            ? parsed.settings.cloudAutoSyncEnabled
            : fallback.settings.cloudAutoSyncEnabled,
      },
    };
  } catch {
    const recoveredRoleMatch = rawJson.match(/"role"\s*:\s*"(wife|husband)"/);
    const recoveredRole: DeviceRole | null =
      recoveredRoleMatch?.[1] === 'husband'
        ? 'husband'
        : recoveredRoleMatch?.[1] === 'wife'
          ? 'wife'
          : null;
    const recoveredDeviceMatch = rawJson.match(/"deviceId"\s*:\s*"(lw-[a-zA-Z0-9_-]{4,58})"/);
    if (recoveredRole || recoveredDeviceMatch?.[1]) {
      const recovered = createInitialProgress(recoveredRole ?? 'wife', false);
      return {
        ...recovered,
        deviceId: recoveredDeviceMatch?.[1] ?? recovered.deviceId,
      };
    }
    return fallback;
  }
}

export function loadProgressFromStorage(): GameProgress {
  const fallback = createInitialProgress();
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const unsealed = unsealLocalStoragePayload(raw);
      const parsed = parseStoredProgress(unsealed);
      if (!raw.startsWith('LWV1:')) {
        saveProgressToStorage(parsed);
      }
      return parsed;
    }
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const migrated = parseStoredProgress(unsealLocalStoragePayload(legacyRaw));
      saveProgressToStorage(migrated);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    }
    return fallback;
  } catch {
    recordBootStorageIssue(
      isLocalVaultWriteProtected() ? 'write-protected' : 'error',
      STORAGE_KEY
    );
    return fallback;
  }
}

export function saveProgressToStorage(progress: GameProgress): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (shouldBlockEncryptedStorageOverwrite(STORAGE_KEY)) {
    reportStorageWriteIssue('write-protected', STORAGE_KEY);
    return;
  }
  try {
    const sealed = sealLocalStoragePayload(JSON.stringify(progress));
    window.localStorage.setItem(STORAGE_KEY, sealed);
  } catch (err) {
    reportStorageWriteIssue(
      isStorageQuotaError(err) ? 'quota' : 'error',
      STORAGE_KEY
    );
  }
}
