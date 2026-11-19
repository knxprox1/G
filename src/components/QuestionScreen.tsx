import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Check,
  ChevronLeft,
  LayoutGrid,
  BookOpen,
  Lock,
} from 'lucide-react';
import type { GameQuestion, GameRealm, QuestionSet } from '../data/types';
import {
  canConfirmQuestion,
  getNextUnansweredIndexAfter,
  getNextUnansweredQuestionIndex,
  toArabicDigits,
  toggleOptionSelection,
} from '../game/engine';
import { buildAnswerQissasa, type AnswerQissasa } from '../game/reflection';
import { useBackOverlay } from '../utils/backNavigation';
import {
  clearQuestionDraft,
  loadQuestionDraft,
  saveQuestionDraft,
} from '../utils/sessionDrafts';
import { usePrefersReducedMotion } from '../utils/usePrefersReducedMotion';
import {
  CenterRoseScatterOverlay,
  RoseStarOrnament,
  RoyalRoseSealButton,
} from './RoseFiligree';
import { QissasaNoteCard, QuestionCardFace } from './question/QuestionCardParts';
import {
  QuestionProgressModal,
  UnsavedSelectionModal,
  type PendingNavAction,
} from './question/QuestionModals';

export interface PartnerQuestionView {
  partnerName: string;
  partnerAnswers: Record<string, string[]>;
}

interface QuestionScreenProps {
  realm: GameRealm;
  set: QuestionSet;
  savedAnswers: Record<string, string[]>;
  initialQuestionIndex: number;
  partnerView?: PartnerQuestionView;
  isSelfReview?: boolean;
  externalLeaveRequest?: { nonce: number; onConfirmLeave: () => void } | null;
  onClearExternalLeaveRequest?: () => void;
  onUnsavedSelectionChange?: (hasUnsaved: boolean) => void;
  onTransitioningChange?: (transitioning: boolean) => void;
  onConfirmAnswer: (questionId: string, selectedOptions: string[]) => void;
  onCelebrateLevelComplete?: () => void;
  onGoToLog?: () => void;
  onDiscussInChat?: (prefillText: string) => void;
  onCompleteSet: () => void;
  onExitRound: () => void;
  onSelectSound: (selected: boolean) => void;
  onConfirmSound: () => void;
  motionEnabled: boolean;
  transitionClassName?: string;
}

type TransitionKind = 'confirm' | 'skip' | 'jump';

interface ExitingSnapshot {
  key: string;
  question: GameQuestion;
  questionNumber: number;
  selectedIds: string[];
  kind: TransitionKind;
  scrollTop: number;
}

interface ExitingQissasaSnapshot {
  key: string;
  data: AnswerQissasa;
}

function getBoldnessTier(set: QuestionSet): 0 | 1 | 2 {
  if (set.id.endsWith('-set-3') || set.indexLabel === '٠٣') return 2;
  if (set.id.endsWith('-set-2') || set.indexLabel === '٠٢') return 1;
  return 0;
}

function formatSelectedCountArabic(count: number): string {
  if (count === 1) return 'تم تحديد خيار واحد';
  if (count === 2) return 'تم تحديد خيارين';
  if (count <= 10) return `تم تحديد ${toArabicDigits(count)} خيارات`;
  return `تم تحديد ${toArabicDigits(count)} خياراً`;
}

function formatRemainingArabic(count: number): string {
  if (count <= 1) return 'السؤال الأخير المتبقي';
  if (count === 2) return 'يتبقّى سؤالان';
  if (count <= 10) return `يتبقّى ${toArabicDigits(count)} أسئلة`;
  return `يتبقّى ${toArabicDigits(count)} سؤالاً`;
}



/**
 * شاشة السؤال — تتضمن خطوة «القصاصة الفنية» الفاصلة بعد إجابة كل سؤال:
 * سؤال ← ختم الإجابة وظهور قصاصة وصفية/تشخيصية تحكي الاختيار ← الانتقال للبطاقة التالية
 * مع مسار للأمام فقط وحفظ الأسئلة المجابة في السجل نهائياً.
 */
export function QuestionScreen({
  realm,
  set,
  savedAnswers,
  initialQuestionIndex,
  partnerView,
  isSelfReview = false,
  externalLeaveRequest = null,
  onClearExternalLeaveRequest,
  onUnsavedSelectionChange,
  onTransitioningChange,
  onConfirmAnswer,
  onCelebrateLevelComplete,
  onGoToLog,
  onDiscussInChat,
  onCompleteSet,
  onExitRound,
  onSelectSound,
  onConfirmSound,
  motionEnabled,
  transitionClassName = 'ad-anim-screen-curtain',
}: QuestionScreenProps) {
  const boldnessTier = getBoldnessTier(set);
  const isVelvet = boldnessTier === 2;
  const isDusk = boldnessTier === 1;
  const isPartnerView = Boolean(partnerView);
  const isReadOnly = isPartnerView || isSelfReview;
  const effectiveSavedAnswers = partnerView ? partnerView.partnerAnswers : savedAnswers;

  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveMotion = motionEnabled && !prefersReducedMotion;

  const [questionIndex, setQuestionIndex] = useState(() => {
    const safeInitial = Math.min(
      Math.max(0, initialQuestionIndex),
      Math.max(0, set.questions.length - 1)
    );
    if (isReadOnly) {
      return safeInitial;
    }
    const initialQ = set.questions[safeInitial];
    if (initialQ && (effectiveSavedAnswers[initialQ.id]?.length ?? 0) === 0) {
      return safeInitial;
    }
    return getNextUnansweredQuestionIndex(effectiveSavedAnswers, set);
  });

  const currentQuestion = set.questions[questionIndex];

  const resolveInitialSelection = (q: GameQuestion | undefined): string[] => {
    if (isReadOnly || !q) return [];
    const saved = effectiveSavedAnswers[q.id] ?? [];
    const storedDraft = loadQuestionDraft(set.id, q.id);
    if (storedDraft && storedDraft.length > 0 && (q.allowMultiple || saved.length === 0)) {
      const validIds = new Set(q.options.map((o) => o.id));
      const cleanDraft = storedDraft.filter((id) => validIds.has(id));
      if (cleanDraft.length > 0) return cleanDraft;
    }
    return saved;
  };

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    resolveInitialSelection(currentQuestion)
  );
  const [activeQissasa, setActiveQissasa] = useState<AnswerQissasa | null>(null);
  const [qissasaNextIndex, setQissasaNextIndex] = useState<number>(-1);
  const [exitingQissasa, setExitingQissasa] = useState<ExitingQissasaSnapshot | null>(null);
  const [exitingSnapshot, setExitingSnapshot] = useState<ExitingSnapshot | null>(null);
  const [hasSwitchedOnce, setHasSwitchedOnce] = useState(false);
  const [isCompletingOut, setIsCompletingOut] = useState(false);
  const [isExitingRound, setIsExitingRound] = useState(false);
  const [isTapLocked, setIsTapLocked] = useState(false);
  const [sealBurstId, setSealBurstId] = useState(0);
  const [isSealingNext, setIsSealingNext] = useState(false);
  const [roseScatter, setRoseScatter] = useState<{
    key: number;
    variant: 'qissasa' | 'transition';
  } | null>(null);
  const [numberWhisper, setNumberWhisper] = useState<{
    key: number;
    number: number;
    delayed: boolean;
  } | null>(null);
  const [showProgressOverlay, setShowProgressOverlay] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState<PendingNavAction | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [evictedOptionId, setEvictedOptionId] = useState<string | null>(null);

  const stageScrollRef = useRef<HTMLDivElement | null>(null);
  const exitCleanupTimerRef = useRef<number | null>(null);
  const qissasaCleanupTimerRef = useRef<number | null>(null);
  const tapLockTimerRef = useRef<number | null>(null);
  const sealAdvanceTimerRef = useRef<number | null>(null);
  const roseScatterTimerRef = useRef<number | null>(null);
  const whisperTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const evictedTimerRef = useRef<number | null>(null);
  const prevQuestionIdRef = useRef<string | undefined>(currentQuestion?.id);
  const prevPartnerAnswerRef = useRef<{ qId: string; key: string } | null>(null);
  const uniqueSeqRef = useRef(0);
  const nextUniqueId = () => {
    uniqueSeqRef.current += 1;
    return Date.now() * 1000 + (uniqueSeqRef.current % 1000);
  };

  const triggerCenterRoseScatter = (variant: 'qissasa' | 'transition') => {
    if (!effectiveMotion) return;
    if (roseScatterTimerRef.current !== null) {
      window.clearTimeout(roseScatterTimerRef.current);
      roseScatterTimerRef.current = null;
    }
    const duration = variant === 'qissasa' ? 2400 : 1450;
    setRoseScatter({ key: nextUniqueId(), variant });
    roseScatterTimerRef.current = window.setTimeout(() => {
      roseScatterTimerRef.current = null;
      setRoseScatter(null);
    }, duration);
  };

  const clearMotionTimers = () => {
    if (exitCleanupTimerRef.current !== null) {
      window.clearTimeout(exitCleanupTimerRef.current);
      exitCleanupTimerRef.current = null;
    }
    if (qissasaCleanupTimerRef.current !== null) {
      window.clearTimeout(qissasaCleanupTimerRef.current);
      qissasaCleanupTimerRef.current = null;
    }
    if (tapLockTimerRef.current !== null) {
      window.clearTimeout(tapLockTimerRef.current);
      tapLockTimerRef.current = null;
    }
    if (sealAdvanceTimerRef.current !== null) {
      window.clearTimeout(sealAdvanceTimerRef.current);
      sealAdvanceTimerRef.current = null;
    }
    if (roseScatterTimerRef.current !== null) {
      window.clearTimeout(roseScatterTimerRef.current);
      roseScatterTimerRef.current = null;
    }
    if (whisperTimerRef.current !== null) {
      window.clearTimeout(whisperTimerRef.current);
      whisperTimerRef.current = null;
    }
    if (completeTimerRef.current !== null) {
      window.clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    if (evictedTimerRef.current !== null) {
      window.clearTimeout(evictedTimerRef.current);
      evictedTimerRef.current = null;
    }
    setEvictedOptionId(null);
  };

  const triggerNumberWhisper = (questionNumber: number, delayed: boolean) => {
    if (whisperTimerRef.current !== null) {
      window.clearTimeout(whisperTimerRef.current);
      whisperTimerRef.current = null;
    }
    if (!effectiveMotion) {
      setNumberWhisper(null);
      return;
    }
    setNumberWhisper({ key: nextUniqueId(), number: questionNumber, delayed });
    whisperTimerRef.current = window.setTimeout(() => {
      whisperTimerRef.current = null;
      setNumberWhisper(null);
    }, delayed ? 740 : 660);
  };

  const showTransientNotice = (msg: string) => {
    setStatusMessage(msg);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      noticeTimerRef.current = null;
    }, 3000);
  };



  useEffect(() => {
    if (effectiveMotion && !activeQissasa) {
      triggerNumberWhisper(questionIndex + 1, false);
    }
    return () => {
      clearMotionTimers();
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!effectiveMotion && numberWhisper) {
      if (whisperTimerRef.current !== null) {
        window.clearTimeout(whisperTimerRef.current);
        whisperTimerRef.current = null;
      }
      setNumberWhisper(null);
    }
  }, [effectiveMotion, numberWhisper]);

  const anyOverlayOpen = showProgressOverlay || Boolean(pendingNavAction);

  useBackOverlay(anyOverlayOpen, 'question-modal', () => {
    setShowProgressOverlay(false);
    setPendingNavAction(null);
  });

  useBackOverlay(isReadOnly && Boolean(activeQissasa), 'partner-qissasa-modal', () => {
    if (!isBusy) {
      handleReadOnlyCloseQissasaToQuestion();
    }
  });

  useEffect(() => {
    if (!anyOverlayOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProgressOverlay(false);
        setPendingNavAction(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anyOverlayOpen]);

  useEffect(() => {
    if (!currentQuestion) return;
    if (prevQuestionIdRef.current !== currentQuestion.id) {
      prevQuestionIdRef.current = currentQuestion.id;
      setSelectedIds(resolveInitialSelection(currentQuestion));
      stageScrollRef.current?.scrollTo({ top: 0 });
    }
  }, [currentQuestion?.id, isReadOnly, effectiveSavedAnswers, set.id]);

  // Keep active Qissasa synced when Wife edits/resets answers live on another device
  useEffect(() => {
    if (!isPartnerView || !activeQissasa) return;
    const q = set.questions[activeQissasa.questionNumber - 1];
    if (!q) return;
    const latestIds = partnerView?.partnerAnswers[q.id] ?? [];
    if (latestIds.length === 0) {
      clearMotionTimers();
      setActiveQissasa(null);
      setExitingQissasa(null);
      showTransientNotice('تم تحديث أو مسح الإجابة من جهاز الشريكة');
      return;
    }
    const prevIdsKey = activeQissasa.selectedOptions.map((o) => o.id).join('|');
    const nextIdsKey = latestIds.join('|');
    if (prevIdsKey !== nextIdsKey) {
      setActiveQissasa(
        buildAnswerQissasa({
          realm,
          set,
          question: q,
          questionNumber: activeQissasa.questionNumber,
          selectedIds: latestIds,
          isPartnerView: true,
          partnerName: partnerView?.partnerName,
        })
      );
    }
  }, [isPartnerView, partnerView?.partnerAnswers, partnerView?.partnerName, activeQissasa, realm, set]);

  // Notify Husband live when Wife updates or clears the currently viewed question while outside Qissasa
  useEffect(() => {
    if (!isPartnerView || !currentQuestion) return;
    const latestIds = partnerView?.partnerAnswers[currentQuestion.id] ?? [];
    const nextKey = latestIds.join('|');
    const prev = prevPartnerAnswerRef.current;
    if (!prev || prev.qId !== currentQuestion.id) {
      prevPartnerAnswerRef.current = { qId: currentQuestion.id, key: nextKey };
      return;
    }
    if (prev.key !== nextKey) {
      prevPartnerAnswerRef.current = { qId: currentQuestion.id, key: nextKey };
      if (!activeQissasa) {
        showTransientNotice(
          latestIds.length === 0
            ? `تم مسح إجابة هذا السؤال من جهاز ${partnerView?.partnerName ?? 'الشريكة'}`
            : `تم تحديث اختيار ${partnerView?.partnerName ?? 'الشريكة'} في هذا السؤال`
        );
      }
    }
  }, [isPartnerView, currentQuestion, partnerView?.partnerAnswers, partnerView?.partnerName, activeQissasa]);

  if (!currentQuestion) {
    return null;
  }

  const totalQuestions = set.questions.length;
  const answeredCount = set.questions.filter(
    (q) => (effectiveSavedAnswers[q.id]?.length ?? 0) > 0
  ).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const readOnlyPickedIds = isReadOnly
    ? (effectiveSavedAnswers[currentQuestion.id] ?? [])
    : [];
  const hasReadOnlyAnswer = readOnlyPickedIds.length > 0;
  const previouslySavedIds = effectiveSavedAnswers[currentQuestion.id] ?? [];
  const isEditingSavedAnswer = !isReadOnly && previouslySavedIds.length > 0;
  const isSelectionEqualToSaved =
    selectedIds.length === previouslySavedIds.length &&
    selectedIds.every((id) => previouslySavedIds.includes(id));
  const displayedSelectedIds = isReadOnly ? readOnlyPickedIds : selectedIds;
  const canConfirm = canConfirmQuestion(selectedIds, currentQuestion.minSelect);
  const hasUnsavedSelection =
    !isReadOnly && !activeQissasa && selectedIds.length > 0 && !isSelectionEqualToSaved;
  const isBusy = isTapLocked || isSealingNext || isCompletingOut || isExitingRound;
  const isTransitioningOut = isExitingRound || isCompletingOut || isSealingNext;

  useBackOverlay(
    hasUnsavedSelection && !pendingNavAction && !isBusy,
    'question-unsaved-guard',
    () => {
      setShowProgressOverlay(false);
      setPendingNavAction({ type: 'exit' });
    }
  );

  useEffect(() => {
    onUnsavedSelectionChange?.(hasUnsavedSelection);
    return () => {
      onUnsavedSelectionChange?.(false);
    };
  }, [hasUnsavedSelection, onUnsavedSelectionChange]);

  useEffect(() => {
    onTransitioningChange?.(isTransitioningOut);
    return () => {
      onTransitioningChange?.(false);
    };
  }, [isTransitioningOut, onTransitioningChange]);

  useEffect(() => {
    if (!externalLeaveRequest) return;
    setShowProgressOverlay(false);
    setPendingNavAction({
      type: 'external',
      onConfirmLeave: externalLeaveRequest.onConfirmLeave,
    });
    onClearExternalLeaveRequest?.();
  }, [externalLeaveRequest, onClearExternalLeaveRequest]);

  const getInitialSelectionForIndex = (idx: number): string[] => {
    return resolveInitialSelection(set.questions[idx]);
  };

  const transitionToQuestion = (nextIndex: number, kind: TransitionKind) => {
    clearMotionTimers();
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setStatusMessage(null);
    setIsSealingNext(false);
    setSealBurstId(0);

    if (!effectiveMotion) {
      setExitingSnapshot(null);
      setExitingQissasa(null);
      setActiveQissasa(null);
      setNumberWhisper(null);
      setHasSwitchedOnce(true);
      setQuestionIndex(nextIndex);
      setSelectedIds(getInitialSelectionForIndex(nextIndex));
      stageScrollRef.current?.scrollTo({ top: 0 });
      return;
    }

    const snapshot: ExitingSnapshot = {
      key: `${currentQuestion.id}-${Date.now()}`,
      question: currentQuestion,
      questionNumber: questionIndex + 1,
      selectedIds: [...displayedSelectedIds],
      kind,
      scrollTop: stageScrollRef.current?.scrollTop ?? 0,
    };
    setExitingSnapshot(snapshot);

    setHasSwitchedOnce(true);
    setQuestionIndex(nextIndex);
    setSelectedIds(getInitialSelectionForIndex(nextIndex));
    setIsTapLocked(true);
    stageScrollRef.current?.scrollTo({ top: 0 });
    triggerCenterRoseScatter('transition');
    triggerNumberWhisper(nextIndex + 1, true);

    tapLockTimerRef.current = window.setTimeout(() => {
      tapLockTimerRef.current = null;
      setIsTapLocked(false);
    }, 460);

    exitCleanupTimerRef.current = window.setTimeout(() => {
      exitCleanupTimerRef.current = null;
      setExitingSnapshot(null);
    }, 520);
  };

  const handleToggleOption = (optionId: string) => {
    if (isReadOnly) {
      if (!isBusy && !activeQissasa) {
        showTransientNotice(
          isPartnerView
            ? 'وضع استعراض اختيارات الشريكة للقراءة فقط'
            : 'وضع مراجعة الإجابات المحفوظة للقراءة فقط'
        );
      }
      return;
    }
    if (isBusy || activeQissasa) return;
    const reachedCap =
      currentQuestion.allowMultiple &&
      typeof currentQuestion.maxSelect === 'number' &&
      currentQuestion.maxSelect > 0 &&
      !selectedIds.includes(optionId) &&
      selectedIds.length >= currentQuestion.maxSelect;
    const evictedId = reachedCap ? selectedIds[0] ?? null : null;

    const next = toggleOptionSelection(
      selectedIds,
      optionId,
      currentQuestion.allowMultiple,
      currentQuestion.maxSelect
    );
    const added = next.includes(optionId);
    onSelectSound(added);
    setSelectedIds(next);
    const savedForCurrent = effectiveSavedAnswers[currentQuestion.id] ?? [];
    const isSameAsSaved =
      next.length === savedForCurrent.length &&
      next.every((id) => savedForCurrent.includes(id));
    if (isSameAsSaved) {
      clearQuestionDraft(set.id, currentQuestion.id);
    } else {
      saveQuestionDraft(set.id, currentQuestion.id, next);
    }

    if (reachedCap && currentQuestion.maxSelect) {
      if (evictedId) {
        if (evictedTimerRef.current !== null) {
          window.clearTimeout(evictedTimerRef.current);
        }
        setEvictedOptionId(evictedId);
        evictedTimerRef.current = window.setTimeout(() => {
          setEvictedOptionId(null);
          evictedTimerRef.current = null;
        }, 900);
      }
      showTransientNotice(
        `تم استبدال أقدم اختيار للالتزام بالحد الأقصى (${toArabicDigits(currentQuestion.maxSelect)})`
      );
    }
  };

  const openQissasaForCurrentAnswer = (
    chosenIds: string[],
    targetNextIndex: number
  ) => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setStatusMessage(null);

    const qissasa = buildAnswerQissasa({
      realm,
      set,
      question: currentQuestion,
      questionNumber: questionIndex + 1,
      selectedIds: chosenIds,
      isPartnerView,
      partnerName: partnerView?.partnerName,
    });

    if (effectiveMotion) {
      setExitingSnapshot({
        key: `${currentQuestion.id}-${Date.now()}`,
        question: currentQuestion,
        questionNumber: questionIndex + 1,
        selectedIds: [...chosenIds],
        kind: 'confirm',
        scrollTop: stageScrollRef.current?.scrollTop ?? 0,
      });
      setIsTapLocked(true);
      triggerCenterRoseScatter('qissasa');
      tapLockTimerRef.current = window.setTimeout(() => {
        tapLockTimerRef.current = null;
        setIsTapLocked(false);
      }, 540);
      exitCleanupTimerRef.current = window.setTimeout(() => {
        exitCleanupTimerRef.current = null;
        setExitingSnapshot(null);
      }, 520);
    } else {
      setExitingSnapshot(null);
    }

    setNumberWhisper(null);
    setSealBurstId(0);
    setIsSealingNext(false);
    setQissasaNextIndex(targetNextIndex);
    setActiveQissasa(qissasa);
    setSelectedIds([]);
    stageScrollRef.current?.scrollTo({ top: 0 });
  };

  const handleConfirm = () => {
    if (isBusy || activeQissasa) return;
    if (!canConfirm) {
      onSelectSound(false);
      const remaining = Math.max(1, currentQuestion.minSelect - selectedIds.length);
      if (selectedIds.length === 0) {
        showTransientNotice(
          currentQuestion.allowMultiple && currentQuestion.minSelect > 1
            ? `اختاري ${toArabicDigits(currentQuestion.minSelect)} خيارات للمتابعة`
            : 'اختاري خياراً واحداً على الأقل للمتابعة'
        );
      } else {
        showTransientNotice(
          remaining === 1
            ? 'تبقّى اختيار خيار واحد إضافي للمتابعة'
            : `تبقّى اختيار ${toArabicDigits(remaining)} خيارات إضافية للمتابعة`
        );
      }
      return;
    }
    onConfirmSound();
    clearMotionTimers();

    const mergedAnswers: Record<string, string[]> = {
      ...savedAnswers,
      [currentQuestion.id]: selectedIds,
    };
    const nextIdx = getNextUnansweredIndexAfter(mergedAnswers, set, questionIndex);

    clearQuestionDraft(set.id, currentQuestion.id);
    onConfirmAnswer(currentQuestion.id, selectedIds);
    openQissasaForCurrentAnswer(selectedIds, nextIdx);
  };

  const triggerSmoothCompletion = () => {
    clearMotionTimers();
    if (!effectiveMotion) {
      onCompleteSet();
      return;
    }
    setIsCompletingOut(true);
    completeTimerRef.current = window.setTimeout(() => {
      completeTimerRef.current = null;
      onCompleteSet();
    }, 340);
  };

  const advanceAfterSealBurst = () => {
    if (!activeQissasa) return;

    if (qissasaNextIndex === -1) {
      onCelebrateLevelComplete?.();
      triggerSmoothCompletion();
      return;
    }

    if (!effectiveMotion) {
      setExitingQissasa(null);
      setActiveQissasa(null);
      setNumberWhisper(null);
      setHasSwitchedOnce(true);
      setQuestionIndex(qissasaNextIndex);
      setSelectedIds(getInitialSelectionForIndex(qissasaNextIndex));
      stageScrollRef.current?.scrollTo({ top: 0 });
      return;
    }

    setExitingQissasa({
      key: `qissasa-${activeQissasa.questionNumber}-${Date.now()}`,
      data: activeQissasa,
    });
    setActiveQissasa(null);
    setHasSwitchedOnce(true);
    setQuestionIndex(qissasaNextIndex);
    setSelectedIds(getInitialSelectionForIndex(qissasaNextIndex));
    setIsTapLocked(true);
    stageScrollRef.current?.scrollTo({ top: 0 });
    triggerCenterRoseScatter('transition');
    triggerNumberWhisper(qissasaNextIndex + 1, true);

    tapLockTimerRef.current = window.setTimeout(() => {
      tapLockTimerRef.current = null;
      setIsTapLocked(false);
    }, 460);

    qissasaCleanupTimerRef.current = window.setTimeout(() => {
      qissasaCleanupTimerRef.current = null;
      setExitingQissasa(null);
    }, 520);
  };

  const handleReadOnlyOpenQissasa = () => {
    if (!isReadOnly || !hasReadOnlyAnswer || isBusy || activeQissasa) return;
    onConfirmSound();
    clearMotionTimers();
    const targetNext = questionIndex < totalQuestions - 1 ? questionIndex + 1 : -1;
    openQissasaForCurrentAnswer(readOnlyPickedIds, targetNext);
  };

  const handleReadOnlyCloseQissasaToQuestion = () => {
    if (!isReadOnly || !activeQissasa || isBusy) return;
    clearMotionTimers();
    setActiveQissasa(null);
    setExitingQissasa(null);
    stageScrollRef.current?.scrollTo({ top: 0 });
  };

  const handleReadOnlyPrev = () => {
    if (!isReadOnly || isBusy || questionIndex <= 0) return;
    onSelectSound(true);
    setActiveQissasa(null);
    setExitingQissasa(null);
    transitionToQuestion(questionIndex - 1, 'jump');
  };

  const handleReadOnlyNext = () => {
    if (!isReadOnly || isBusy) return;
    if (questionIndex >= totalQuestions - 1) {
      onConfirmSound();
      triggerSmoothCompletion();
      return;
    }
    onSelectSound(true);
    setActiveQissasa(null);
    setExitingQissasa(null);
    transitionToQuestion(questionIndex + 1, 'skip');
  };

  const handleContinueFromQissasa = () => {
    if (!activeQissasa || isBusy) return;
    onConfirmSound();
    clearMotionTimers();

    if (isReadOnly && qissasaNextIndex === -1) {
      triggerSmoothCompletion();
      return;
    }

    if (!effectiveMotion) {
      advanceAfterSealBurst();
      return;
    }

    setIsSealingNext(true);
    setSealBurstId(nextUniqueId());
    sealAdvanceTimerRef.current = window.setTimeout(() => {
      sealAdvanceTimerRef.current = null;
      setIsSealingNext(false);
      advanceAfterSealBurst();
    }, 440);
  };

  const triggerSmoothExit = () => {
    clearMotionTimers();
    if (!effectiveMotion) {
      onExitRound();
      return;
    }
    setIsExitingRound(true);
    completeTimerRef.current = window.setTimeout(() => {
      completeTimerRef.current = null;
      onExitRound();
    }, 380);
  };

  const executeNavAction = (action: PendingNavAction) => {
    if (action.type === 'external') {
      action.onConfirmLeave();
      return;
    }
    if (action.type === 'exit') {
      triggerSmoothExit();
      return;
    }
    if (action.type === 'skip') {
      transitionToQuestion(action.targetIndex, 'skip');
      return;
    }
    setShowProgressOverlay(false);
    setActiveQissasa(null);
    setExitingQissasa(null);
    transitionToQuestion(action.index, 'jump');
  };

  const requestNavAction = (action: PendingNavAction) => {
    if (isTransitioningOut || (isBusy && action.type !== 'exit')) {
      return;
    }
    if (action.type === 'jump' && !activeQissasa && action.index === questionIndex) {
      setShowProgressOverlay(false);
      return;
    }
    if (hasUnsavedSelection && !isBusy) {
      setShowProgressOverlay(false);
      setPendingNavAction(action);
      return;
    }
    executeNavAction(action);
  };

  const handleRequestExit = () => {
    requestNavAction({ type: 'exit' });
  };

  const handleSkip = () => {
    if (isReadOnly || unansweredCount <= 1 || isBusy || activeQissasa) return;
    const nextIdx = getNextUnansweredIndexAfter(effectiveSavedAnswers, set, questionIndex);
    if (nextIdx === -1 || nextIdx === questionIndex) return;
    requestNavAction({ type: 'skip', targetIndex: nextIdx });
  };

  const handleJumpToQuestion = (idx: number) => {
    const targetQuestion = set.questions[idx];
    if (!targetQuestion) return;
    requestNavAction({ type: 'jump', index: idx });
  };

  const optionCount = currentQuestion.options.length;
  const hasLongOptions = currentQuestion.options.some((o) => o.label.length > 26);
  const useTwoColGrid =
    (optionCount === 4 || (optionCount >= 6 && optionCount % 2 === 0)) && !hasLongOptions;
  const isCompactStack = optionCount >= 5;

  const questionCardDelayMs = hasSwitchedOnce ? 90 : 80;

  const outgoingStageAnimClass = !exitingSnapshot
    ? ''
    : exitingSnapshot.kind === 'skip'
      ? 'ad-anim-silk-skip-exit'
      : 'ad-anim-silk-exit';

  const headerQuestionNumber = activeQissasa
    ? activeQissasa.questionNumber
    : questionIndex + 1;

  const roundProgressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const stageBgClass = isVelvet
    ? 'ad-tier-velvet-bg ad-velvet-stage'
    : isDusk
      ? 'ad-tier-dusk-bg'
      : '';
  const highlightHex = isVelvet ? '#FF8CB8' : realm.accentHex;
  const buttonAccentHex = isVelvet ? '#E2387D' : realm.accentHex;

  return (
    <section
      className={`relative flex-1 min-h-0 flex flex-col justify-between pb-[max(0.65rem,env(safe-area-inset-bottom))] overflow-hidden transition-colors duration-500 ${stageBgClass} ${
        effectiveMotion
          ? isExitingRound || isCompletingOut
            ? 'ad-anim-screen-exit'
            : transitionClassName
          : ''
      }`}
      aria-label="تجربة الأسئلة"
    >
      {isVelvet && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 ad-petal-lattice-velvet opacity-70"
        />
      )}

      {/* Top 2px Luminous Round Progress Hairline */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 inset-x-0 z-40 h-[2px] ${
          isVelvet ? 'bg-white/10' : 'bg-[#F5C6D8]/45'
        }`}
      >
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{
            width: `${roundProgressPercent}%`,
            backgroundColor: highlightHex,
          }}
        />
      </div>

      {/* Floating Close & Round-Map Buttons + Centered Realm/Set Context (Anchored Static) */}
      <button
        type="button"
        disabled={isTransitioningOut}
        onClick={handleRequestExit}
        aria-label="الخروج من المستوى"
        className={`absolute top-[max(0.85rem,env(safe-area-inset-top))] right-3 sm:right-4 z-30 min-w-[44px] min-h-[44px] flex items-center justify-center group ${
          isTransitioningOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${effectiveMotion ? 'ad-anim-chrome-top' : ''}`}
      >
        <span
          className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center group-active:scale-95 transition-[transform,color,border-color] duration-150 ${
            isVelvet
              ? 'bg-[#3D0D23]/92 border-[#DF5B8E]/50 text-[#FFE8F1] shadow-[0_6px_16px_rgba(0,0,0,0.38)] group-hover:text-white group-hover:border-[#FF9BC4]'
              : 'bg-white/92 border-[#EFCBD7] text-[#5E364A] shadow-[0_6px_16px_rgba(214,40,108,0.14)] group-hover:text-[#D6286C] group-hover:border-[#D6286C]/50'
          }`}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </span>
      </button>

      {/* Protective Top Scrim ensuring floating header remains crisp over scrolled cards */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 inset-x-0 z-15 h-[max(3.85rem,calc(env(safe-area-inset-top)+3.2rem))] ${
          isVelvet
            ? 'bg-gradient-to-b from-[#240614]/94 via-[#240614]/65 to-transparent'
            : 'bg-gradient-to-b from-[#FFE9F1]/94 via-[#FFE9F1]/68 to-transparent'
        }`}
      />

      {/* Centered Realm/Set Context & Clickable Round-Map Trigger (top-left corner reserved for PartnerConnectionBadge) */}
      <div
        className={`absolute top-[max(0.85rem,env(safe-area-inset-top))] inset-x-[7.5rem] sm:inset-x-[7.75rem] z-20 flex items-center justify-center ${
          effectiveMotion ? 'ad-anim-chrome-top' : ''
        }`}
      >
        <button
          type="button"
          disabled={isTransitioningOut}
          onClick={() => {
            if (!isTransitioningOut) {
              setShowProgressOverlay(true);
            }
          }}
          aria-label="عرض تقدم المستوى"
          className={`min-h-[44px] max-w-full px-2.5 sm:px-3 ad-cut-chip backdrop-blur-md border flex flex-col items-center justify-center gap-0 text-[11px] sm:text-xs leading-tight transition-[transform,filter,border-color] duration-150 shadow-xs ${
            isTransitioningOut
              ? 'opacity-60 cursor-not-allowed'
              : 'cursor-pointer hover:brightness-98 active:scale-[0.98]'
          } ${
            isVelvet
              ? 'bg-[#3D0D23]/78 border-[#DF5B8E]/38 text-[#FFE0EC]'
              : 'bg-white/78 border-[#EFCBD7]/80 text-[#5E364A]'
          }`}
        >
          <span className="inline-flex items-center gap-1 max-w-full min-w-0">
            <LayoutGrid
              className="w-3.5 h-3.5 shrink-0 opacity-85"
              style={{ color: highlightHex }}
              aria-hidden="true"
            />
            <span className="font-semibold truncate">
              {realm.title} · {set.title}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <RoseStarOrnament color={highlightHex} className="w-2.5 h-2.5" />
            <span
              className="font-bold tabular-nums-ar shrink-0"
              style={{ color: highlightHex }}
            >
              {`${toArabicDigits(headerQuestionNumber)} من ${toArabicDigits(totalQuestions)}`}
            </span>
          </span>
        </button>
      </div>

      {/* Dual-Layer Stage: Question Stage <-> Artistic Qissasa Interlude */}
      <div className="relative flex-1 min-h-0">
        {/* نثر الورد في وسط الشاشة خلف القصاصة حتى تظل النصوص واضحة تماماً */}
        {effectiveMotion && roseScatter && (
          <CenterRoseScatterOverlay
            scatterKey={roseScatter.key}
            variant={roseScatter.variant}
            accentHex={highlightHex}
            zIndexClass={roseScatter.variant === 'qissasa' ? 'z-[5]' : 'z-20'}
          />
        )}

        {/* رقم السؤال ينبثق بنعومة من وسط الشاشة ثم يتلاشى سريعاً قبيل اكتمال البطاقة */}
        {effectiveMotion && numberWhisper && !activeQissasa && (
          <div
            key={numberWhisper.key}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6 text-center select-none"
          >
            <span
              className={`absolute w-52 h-52 rounded-full ${
                numberWhisper.delayed ? 'ad-anim-number-glow-delayed' : 'ad-anim-number-glow'
              }`}
              style={{
                background: isVelvet
                  ? 'radial-gradient(circle, rgba(255,140,184,0.32) 0%, rgba(226,56,125,0.16) 46%, transparent 72%)'
                  : `radial-gradient(circle, rgba(255,244,248,0.92) 0%, ${realm.accentHex}24 44%, transparent 72%)`,
              }}
            />
            <span
              className={`relative font-display-ar text-[4.75rem] sm:text-[5.5rem] font-bold leading-none tabular-nums-ar drop-shadow-[0_10px_28px_rgba(214,40,108,0.22)] ${
                numberWhisper.delayed ? 'ad-anim-number-whisper-delayed' : 'ad-anim-number-whisper'
              }`}
              style={{ color: highlightHex }}
            >
              {toArabicDigits(numberWhisper.number)}
            </span>
          </div>
        )}

        {/* Outgoing Answered / Skipped Question Stage — Velvet Mist Dissolve */}
        {exitingSnapshot && (() => {
          const exitCount = exitingSnapshot.question.options.length;
          const exitTwoCol =
            (exitCount === 4 || (exitCount >= 6 && exitCount % 2 === 0)) &&
            !exitingSnapshot.question.options.some((o) => o.label.length > 26);
          const exitCompact = exitCount >= 5;

          return (
            <div
              key={exitingSnapshot.key}
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 z-20 px-4 sm:px-5 pt-[max(4rem,calc(env(safe-area-inset-top)+3.45rem))] ${outgoingStageAnimClass}`}
            >
              <div
                className="pt-1 flex flex-col gap-3.5 sm:gap-4"
                style={
                  exitingSnapshot.scrollTop > 0
                    ? { transform: `translateY(-${exitingSnapshot.scrollTop}px)` }
                    : undefined
                }
              >
                <QuestionCardFace
                  question={exitingSnapshot.question}
                  questionNumber={exitingSnapshot.questionNumber}
                  accentHex={realm.accentHex}
                  tier={boldnessTier}
                  isCompactStack={exitCompact}
                  showDeckShadow
                  partnerMeta={
                    partnerView
                      ? {
                          partnerName: partnerView.partnerName,
                          hasAnswered: exitingSnapshot.selectedIds.length > 0,
                        }
                      : undefined
                  }
                />

                <div
                  className={
                    exitTwoCol
                      ? 'grid grid-cols-2 gap-2.5'
                      : `flex flex-col ${exitCompact ? 'gap-2' : 'gap-2.5'}`
                  }
                >
                  {exitingSnapshot.question.options.map((opt) => {
                    const wasSelected = exitingSnapshot.selectedIds.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        style={
                          wasSelected
                            ? { borderColor: isVelvet ? '#FF9BC4' : realm.accentHex }
                            : undefined
                        }
                        className={`ad-cut-tile border flex text-right ${
                          exitTwoCol
                            ? exitCompact
                              ? 'min-h-[76px] p-3 flex-col items-start justify-start gap-2.5'
                              : 'min-h-[86px] p-3.5 flex-col items-start justify-start gap-3'
                            : exitCompact
                              ? 'min-h-[45px] px-4 py-1.5 items-center justify-between gap-2.5'
                              : 'min-h-[52px] px-4 py-2.5 items-center justify-between gap-2.5'
                        } ${
                          isVelvet
                            ? wasSelected
                              ? 'bg-gradient-to-br from-[#9F1A52] to-[#720F39] shadow-[0_10px_24px_rgba(255,111,168,0.28)] -translate-y-0.5'
                              : 'bg-[#390B20]/92 border-[#DF5B8E]/40'
                            : wasSelected
                              ? 'bg-gradient-to-br from-[#FFD6E6] to-[#FFC2D9] shadow-[0_10px_22px_rgba(214,40,108,0.2)] -translate-y-0.5'
                              : 'bg-white/95 border-[#F1AFC8]'
                        }`}
                      >
                        <div className={`flex items-center gap-2.5 w-full ${exitTwoCol ? 'justify-between' : ''}`}>
                          <span
                            style={
                              wasSelected && !isVelvet
                                ? { backgroundColor: realm.accentHex }
                                : undefined
                            }
                            className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                              isVelvet
                                ? wasSelected
                                  ? 'bg-white text-[#7B113F] shadow-sm'
                                  : 'bg-[#531331] text-[#FFDCE9]'
                                : wasSelected
                                  ? 'text-white shadow-sm'
                                  : 'bg-[#FCEEF3] text-[#5E364A]'
                            }`}
                          >
                            {opt.marker}
                          </span>
                          {!exitTwoCol && (
                            <span
                              className={`flex-1 text-sm leading-snug ${
                                isVelvet
                                  ? wasSelected
                                    ? 'text-white font-bold'
                                    : 'text-[#FFF4F8] font-medium'
                                  : wasSelected
                                    ? 'text-[#360D21] font-bold'
                                    : 'text-[#5E364A] font-medium'
                              }`}
                            >
                              {opt.label}
                            </span>
                          )}
                          <span
                            style={
                              wasSelected && !isVelvet
                                ? { backgroundColor: realm.accentHex, borderColor: realm.accentHex }
                                : undefined
                            }
                            className={`w-5 h-5 shrink-0 flex items-center justify-center border ${
                              exitingSnapshot.question.allowMultiple ? 'rounded-md' : 'rounded-full'
                            } ${
                              isVelvet
                                ? wasSelected
                                  ? 'bg-white text-[#7B113F] border-white'
                                  : 'border-[#DF5B8E]/65 bg-[#2B0717]'
                                : wasSelected
                                  ? 'text-white'
                                  : 'border-[#D9AFC0] bg-white'
                            }`}
                          >
                            {wasSelected && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                          </span>
                        </div>
                        {exitTwoCol && (
                          <span
                            className={`text-sm leading-snug text-right w-full ${
                              isVelvet
                                ? wasSelected
                                  ? 'text-white font-bold'
                                  : 'text-[#FFF4F8] font-medium'
                                : wasSelected
                                  ? 'text-[#360D21] font-bold'
                                  : 'text-[#5E364A] font-medium'
                            }`}
                          >
                            {opt.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Outgoing Qissasa Overlay — Velvet Mist Dissolve */}
        {exitingQissasa && (
          <div
            key={exitingQissasa.key}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 px-4 sm:px-5 pt-[max(4rem,calc(env(safe-area-inset-top)+3.45rem))] pb-2 flex flex-col justify-center"
          >
            <div className="ad-anim-qissasa-dissolve">
              <QissasaNoteCard
                data={exitingQissasa.data}
                realm={realm}
                tier={boldnessTier}
                motionEnabled={false}
                partnerName={partnerView?.partnerName}
              />
            </div>
          </div>
        )}

        {/* Active Center Stage (Artistic Qissasa OR Current Question) */}
        <div
          ref={stageScrollRef}
          className="relative z-10 h-full overflow-y-auto overflow-x-hidden ad-no-scrollbar px-4 sm:px-5 pt-[max(4rem,calc(env(safe-area-inset-top)+3.45rem))] pb-2"
        >
          {activeQissasa ? (
            <div
              key={`qissasa-${activeQissasa.questionNumber}`}
              role="region"
              aria-label="القصاصة الفنية التفسيرية"
              className={`min-h-full flex flex-col justify-center py-1 ${
                effectiveMotion ? 'ad-anim-qissasa-emerge' : ''
              }`}
            >
              <QissasaNoteCard
                data={activeQissasa}
                realm={realm}
                tier={boldnessTier}
                motionEnabled={effectiveMotion}
                isEntering
                partnerName={partnerView?.partnerName}
                onDiscussInChat={
                  onDiscussInChat
                    ? () =>
                        onDiscussInChat(
                          `عن السؤال ${toArabicDigits(activeQissasa.questionNumber)} في «${realm.title} — ${set.title}»: ${activeQissasa.choiceEcho}`
                        )
                    : undefined
                }
              />
            </div>
          ) : (
            <div key={currentQuestion.id} className="relative min-h-full">
              <div className="pt-1 flex flex-col gap-3.5 sm:gap-4 w-full">
                <div
                  className={effectiveMotion ? 'ad-anim-question-open' : ''}
                  style={effectiveMotion ? { animationDelay: `${questionCardDelayMs}ms` } : undefined}
                >
                  <QuestionCardFace
                    question={currentQuestion}
                    questionNumber={questionIndex + 1}
                    accentHex={realm.accentHex}
                    tier={boldnessTier}
                    isCompactStack={isCompactStack}
                    showDeckShadow
                    partnerMeta={
                      partnerView
                        ? {
                            partnerName: partnerView.partnerName,
                            hasAnswered: hasReadOnlyAnswer,
                          }
                        : undefined
                    }
                  />
                </div>

                {isReadOnly && (
                  <div
                    className={`ad-cut-chip border px-3 py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold ${
                      isVelvet
                        ? 'bg-[#3B0D22]/85 border-[#DF5B8E]/40 text-[#FFDCE9]'
                        : 'bg-white/90 border-[#F1AFC8] text-[#5E364A]'
                    }`}
                  >
                    <Lock className="w-3 h-3 shrink-0 text-[#D6286C]" aria-hidden="true" />
                    <span>
                      {isPartnerView
                        ? `وضع استعراض اختيارات ${partnerView?.partnerName ?? 'الشريكة'} · للقراءة فقط`
                        : 'مراجعة إجاباتكِ المحفوظة · للقراءة فقط'}
                    </span>
                  </div>
                )}

                {isPartnerView && !hasReadOnlyAnswer && (
                  <div
                    role="status"
                    className={`ad-cut-tile border border-dashed px-3.5 py-2 text-center text-xs font-semibold ${
                      effectiveMotion ? 'ad-anim-toast-in' : ''
                    } ${
                      isVelvet
                        ? 'bg-[#3B0D22]/90 border-[#DF5B8E]/50 text-[#FFDCE9]'
                        : 'bg-white/90 border-[#E8AFC3] text-[#5E364A]'
                    }`}
                  >
                    لم تختر {partnerView?.partnerName ?? 'الشريكة'} إجابة لهذا السؤال بعد
                  </div>
                )}

                {/* Cohesive Rose-Silk / Velvet Choice Matrix */}
                <div
                  role="group"
                  aria-label="خيارات الإجابة"
                  className={
                    useTwoColGrid
                      ? 'grid grid-cols-2 gap-2.5'
                      : `flex flex-col ${isCompactStack ? 'gap-2' : 'gap-2.5'}`
                  }
                >
                  {currentQuestion.options.map((option, optionIdx) => {
                    const isSelected = displayedSelectedIds.includes(option.id);
                    const wasEvicted = evictedOptionId === option.id && !isSelected;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleToggleOption(option.id)}
                        aria-pressed={isSelected}
                        aria-disabled={isReadOnly}
                        style={{
                          ...(isSelected
                            ? { borderColor: isVelvet ? '#FF9BC4' : realm.accentHex }
                            : undefined),
                          ...(effectiveMotion
                            ? { animationDelay: `${questionCardDelayMs + 35 + optionIdx * 24}ms` }
                            : undefined),
                        }}
                        className={`group relative text-right ad-cut-tile border ad-option-pill flex ${
                          isReadOnly
                            ? 'cursor-default'
                            : 'active:scale-[0.975] cursor-pointer'
                        } ${
                          effectiveMotion ? 'ad-anim-choice-item' : ''
                        } ${
                            useTwoColGrid
                              ? isCompactStack
                                ? 'min-h-[76px] p-3 flex-col items-start justify-start gap-2.5'
                                : 'min-h-[86px] p-3.5 flex-col items-start justify-start gap-3'
                              : isCompactStack
                                ? 'min-h-[45px] px-4 py-1.5 items-center justify-between gap-2.5'
                                : 'min-h-[52px] px-4 py-2.5 items-center justify-between gap-2.5'
                          } ${
                            wasEvicted
                              ? isVelvet
                                ? 'bg-[#390B20]/94 border-dashed border-[#FF9BC4] ring-1 ring-[#FF9BC4]/50'
                                : 'bg-[#FFF5F9] border-dashed border-[#D6286C] ring-1 ring-[#D6286C]/35'
                              : isVelvet
                                ? isSelected
                                  ? 'bg-gradient-to-br from-[#9F1A52] to-[#720F39] shadow-[0_10px_24px_rgba(255,111,168,0.28)] -translate-y-0.5'
                                  : isReadOnly
                                    ? 'bg-[#390B20]/85 border-[#DF5B8E]/40'
                                    : 'bg-[#390B20]/94 border-[#DF5B8E]/40 hover:border-[#FF9BC4]'
                                : isSelected
                                  ? 'bg-gradient-to-br from-[#FFD6E6] to-[#FFC2D9] shadow-[0_10px_22px_rgba(214,40,108,0.2)] -translate-y-0.5'
                                  : isReadOnly
                                    ? 'bg-white/90 border-[#F1AFC8]'
                                    : 'bg-white/96 border-[#F1AFC8] hover:border-[#D6286C]/70'
                          }`}
                        >
                          <div
                            className={`flex items-center gap-2.5 w-full ${
                              useTwoColGrid ? 'justify-between' : ''
                            }`}
                          >
                            <span
                              style={
                                isSelected && !isVelvet
                                  ? { backgroundColor: realm.accentHex }
                                  : undefined
                              }
                              className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${
                                isVelvet
                                  ? isSelected
                                    ? 'bg-white text-[#7B113F] shadow-sm'
                                    : 'bg-[#531331] text-[#FFDCE9] group-hover:text-white'
                                  : isSelected
                                    ? 'text-white shadow-sm'
                                    : isReadOnly
                                      ? 'bg-[#FCEEF3] text-[#5E364A]'
                                      : 'bg-[#FCEEF3] text-[#5E364A] group-hover:text-[#D6286C]'
                              }`}
                            >
                              {option.marker}
                            </span>

                            {!useTwoColGrid && (
                              <span
                                className={`flex-1 text-sm leading-snug ${
                                  isVelvet
                                    ? isSelected
                                      ? 'text-white font-bold'
                                      : 'text-[#FFF4F8] font-medium'
                                    : isSelected
                                      ? 'text-[#360D21] font-bold'
                                      : 'text-[#5E364A] font-medium'
                                }`}
                              >
                                {option.label}
                              </span>
                            )}

                            <span
                              style={
                                isSelected && !isVelvet
                                  ? { backgroundColor: realm.accentHex, borderColor: realm.accentHex }
                                  : undefined
                              }
                              className={`w-5 h-5 shrink-0 flex items-center justify-center transition-[transform,background-color,border-color] duration-150 border ${
                                currentQuestion.allowMultiple ? 'rounded-md' : 'rounded-full'
                              } ${
                                isVelvet
                                  ? isSelected
                                    ? 'bg-white text-[#7B113F] border-white'
                                    : 'border-[#DF5B8E]/65 bg-[#2B0717]'
                                  : isSelected
                                    ? 'text-white'
                                    : 'border-[#D9AFC0] bg-white'
                              }`}
                              aria-hidden="true"
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                            </span>
                          </div>

                          {useTwoColGrid && (
                            <span
                              className={`text-sm leading-snug text-right w-full ${
                                isVelvet
                                  ? isSelected
                                    ? 'text-white font-bold'
                                    : 'text-[#FFF4F8] font-medium'
                                  : isSelected
                                    ? 'text-[#360D21] font-bold'
                                    : 'text-[#5E364A] font-medium'
                              }`}
                            >
                              {option.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar — Question Controls OR Interactive Royal Seal Pedestal */}
      <footer
        className={`relative z-20 shrink-0 flex flex-col gap-1.5 px-4 sm:px-5 ${
          activeQissasa
            ? 'pt-1.5 pb-1.5 overflow-visible'
            : isVelvet
              ? 'pt-2 border-t border-white/12'
              : 'pt-2 border-t border-[#D6286C]/10'
        } ${effectiveMotion ? 'ad-anim-chrome-bottom' : ''}`}
      >
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className={`ad-cut-chip border px-3 py-1.5 text-[11px] font-semibold text-center shadow-xs ${
              effectiveMotion ? 'ad-anim-toast-in' : ''
            } ${
              isVelvet
                ? 'bg-[#3D0D23]/95 border-[#DF5B8E]/50 text-[#FFF4F8]'
                : 'bg-white/95 border-[#F1AFC8] text-[#360D21]'
            }`}
          >
            {statusMessage}
          </div>
        )}

        {activeQissasa ? (
          <div
            key={`pedestal-${activeQissasa.questionNumber}`}
            className={`flex flex-col gap-2 ${effectiveMotion ? 'ad-anim-qissasa-pedestal' : ''}`}
          >
            <RoyalRoseSealButton
              label={
                isPartnerView
                  ? qissasaNextIndex === -1
                    ? 'عرض خلاصة المستوى'
                    : 'السؤال التالي'
                  : isSelfReview
                    ? qissasaNextIndex === -1
                      ? 'عرض خلاصة المستوى'
                      : 'السؤال التالي'
                    : qissasaNextIndex === -1
                      ? 'إنهاء المستوى والنتيجة'
                      : 'السؤال التالي'
              }
              accentHex={buttonAccentHex}
              darkMode={isVelvet}
              disabled={isBusy}
              isBursting={isSealingNext}
              burstId={sealBurstId}
              motionEnabled={effectiveMotion}
              onPress={handleContinueFromQissasa}
            />
            {isReadOnly && (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleReadOnlyCloseQissasaToQuestion}
                className={`w-full min-h-[44px] ad-cut-tile border text-xs font-bold cursor-pointer active:scale-[0.98] transition-[color,border-color,transform] duration-150 ${
                  isVelvet
                    ? 'bg-[#3B0D22]/92 border-[#DF5B8E]/45 text-[#FFDCE9] hover:text-white hover:border-[#FF9BC4]'
                    : 'bg-white/95 border-[#EECCDA] text-[#5E364A] hover:text-[#360D21]'
                }`}
              >
                العودة لنص السؤال
              </button>
            )}
          </div>
        ) : isReadOnly ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className={isVelvet ? 'text-[#F6C4D7]' : 'text-[#5E364A]'}>
                {isPartnerView
                  ? hasReadOnlyAnswer
                    ? `عرض اختيار ${partnerView?.partnerName ?? 'الشريكة'}`
                    : `بانتظار إجابة ${partnerView?.partnerName ?? 'الشريكة'}`
                  : 'مراجعة إجاباتكِ المحفوظة'}
              </span>
              <span
                className={`text-[11px] font-semibold tabular-nums-ar shrink-0 ${
                  isVelvet ? 'text-[#FF9AC2]' : 'text-[#5E364A]'
                }`}
              >
                {toArabicDigits(answeredCount)} من {toArabicDigits(totalQuestions)} مُجاب
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBusy || questionIndex <= 0}
                onClick={handleReadOnlyPrev}
                className={`min-h-[50px] px-3.5 ad-cut-tile border text-xs font-bold flex items-center justify-center active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer shrink-0 disabled:opacity-45 disabled:cursor-not-allowed ${
                  isVelvet
                    ? 'bg-[#3B0D22]/92 border-[#DF5B8E]/45 text-[#FFF4F8] hover:border-[#FF9BC4]'
                    : 'bg-white/95 border-[#EECCDA] text-[#360D21] hover:border-[#D6286C]'
                }`}
              >
                السابق
              </button>

              {hasReadOnlyAnswer && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleReadOnlyOpenQissasa}
                  style={{ backgroundColor: buttonAccentHex }}
                  className="ad-shimmer-btn flex-1 min-h-[50px] px-3 ad-cut-tile text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_10px_24px_rgba(214,40,108,0.26)] hover:brightness-95 active:scale-[0.98] transition-[transform,filter,box-shadow] duration-150 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{isPartnerView ? 'عرض قصاصة اختيارها' : 'عرض قصاصة إجابتكِ'}</span>
                </button>
              )}

              <button
                type="button"
                disabled={isBusy}
                onClick={handleReadOnlyNext}
                style={!hasReadOnlyAnswer ? { backgroundColor: buttonAccentHex } : undefined}
                className={`${
                  hasReadOnlyAnswer
                    ? isVelvet
                      ? 'min-h-[50px] px-3.5 bg-[#3B0D22]/92 border border-[#DF5B8E]/45 text-[#FFF4F8] hover:border-[#FF9BC4]'
                      : 'min-h-[50px] px-3.5 bg-white/95 border border-[#EECCDA] text-[#360D21] hover:border-[#D6286C]'
                    : 'flex-1 min-h-[50px] px-3 text-white shadow-[0_10px_24px_rgba(214,40,108,0.26)] hover:brightness-95'
                } ad-cut-tile text-xs sm:text-sm font-bold flex items-center justify-center gap-1 active:scale-[0.98] transition-[transform,filter,border-color,box-shadow] duration-150 cursor-pointer shrink-0 disabled:opacity-60`}
              >
                <span>
                  {questionIndex >= totalQuestions - 1
                    ? isPartnerView
                      ? 'إنهاء العرض'
                      : 'عرض الخلاصة'
                    : 'التالي'}
                </span>
                <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className={isVelvet ? 'text-[#F6C4D7]' : 'text-[#5E364A]'}>
                {selectedIds.length > 0
                  ? formatSelectedCountArabic(selectedIds.length)
                  : currentQuestion.allowMultiple
                    ? currentQuestion.minSelect > 1
                      ? typeof currentQuestion.maxSelect === 'number' &&
                        currentQuestion.maxSelect > currentQuestion.minSelect
                        ? `اختاري من ${toArabicDigits(currentQuestion.minSelect)} إلى ${toArabicDigits(currentQuestion.maxSelect)} خيارات للمتابعة`
                        : `اختاري ${toArabicDigits(currentQuestion.minSelect)} خيارات على الأقل للمتابعة`
                      : typeof currentQuestion.maxSelect === 'number' &&
                          currentQuestion.maxSelect > 0
                        ? `اختاري حتى ${toArabicDigits(currentQuestion.maxSelect)} خيارات للمتابعة`
                        : 'اختاري خياراً واحداً أو أكثر للمتابعة'
                    : 'اختاري إجابة واحدة للمتابعة'}
              </span>

              <span
                className={`text-[11px] font-semibold tabular-nums-ar shrink-0 ${
                  isVelvet ? 'text-[#FF9AC2]' : 'text-[#5E364A]'
                }`}
              >
                {formatRemainingArabic(unansweredCount)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBusy}
                aria-disabled={!canConfirm || isBusy}
                onClick={handleConfirm}
                style={canConfirm ? { backgroundColor: buttonAccentHex } : undefined}
                className={`flex-1 min-h-[52px] px-3 ad-cut-tile font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 transition-[transform,filter,background-color,border-color,color,box-shadow] duration-150 ${
                  canConfirm
                    ? `${
                        !isBusy ? 'ad-shimmer-btn' : ''
                      } text-white active:scale-[0.98] cursor-pointer shadow-[0_12px_26px_rgba(214,40,108,0.3)] hover:brightness-95`
                    : isVelvet
                      ? 'bg-[#461028] text-[#DDA8BE] border border-[#7D244B] cursor-not-allowed'
                      : 'bg-[#F9DCE7] text-[#6E3E56] border border-[#EBB8CC] cursor-not-allowed'
                }`}
              >
                <span>
                  {isEditingSavedAnswer ? 'تحديث الإجابة' : 'اعتماد الإجابة'}
                </span>
                <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>

              {unansweredCount > 1 && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleSkip}
                  aria-label="تخطي السؤال مؤقتاً"
                  className={`min-h-[52px] px-3.5 ad-cut-tile border text-xs font-bold flex items-center justify-center active:scale-[0.98] transition-[color,border-color,transform] duration-150 cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${
                    isVelvet
                      ? 'bg-[#3B0C21]/92 border-[#DF5B8E]/45 text-[#FFDCE9] hover:text-white hover:border-[#FF9BC4]'
                      : 'bg-white/95 border-[#EECCDA] text-[#5E364A] hover:text-[#D6286C] hover:border-[#D6286C]'
                  }`}
                >
                  تخطي
                </button>
              )}
            </div>
          </div>
        )}
      </footer>

      <QuestionProgressModal
        isOpen={showProgressOverlay}
        onClose={() => setShowProgressOverlay(false)}
        set={set}
        effectiveSavedAnswers={effectiveSavedAnswers}
        questionIndex={questionIndex}
        hasActiveQissasa={Boolean(activeQissasa)}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        isPartnerView={isPartnerView}
        isSelfReview={isSelfReview}
        isReadOnly={isReadOnly}
        partnerName={partnerView?.partnerName}
        isVelvet={isVelvet}
        highlightHex={highlightHex}
        buttonAccentHex={buttonAccentHex}
        motionEnabled={effectiveMotion}
        onJumpToQuestion={handleJumpToQuestion}
      />

      <UnsavedSelectionModal
        pendingNavAction={pendingNavAction}
        selectedCount={selectedIds.length}
        canConfirm={canConfirm}
        isVelvet={isVelvet}
        highlightHex={highlightHex}
        buttonAccentHex={buttonAccentHex}
        motionEnabled={effectiveMotion}
        onConfirmAndProceed={(action) => {
          onConfirmSound();
          clearMotionTimers();
          clearQuestionDraft(set.id, currentQuestion.id);
          onConfirmAnswer(currentQuestion.id, selectedIds);
          setPendingNavAction(null);
          if (action.type === 'external') {
            action.onConfirmLeave();
            return;
          }
          if (action.type === 'exit') {
            triggerSmoothExit();
            return;
          }
          const mergedAnswers: Record<string, string[]> = {
            ...savedAnswers,
            [currentQuestion.id]: selectedIds,
          };
          const nextIdx = getNextUnansweredIndexAfter(mergedAnswers, set, questionIndex);
          const safeTarget = action.type === 'jump' ? action.index : nextIdx;
          openQissasaForCurrentAnswer(selectedIds, safeTarget);
        }}
        onProceedWithoutSaving={(action) => {
          clearQuestionDraft(set.id, currentQuestion.id);
          setPendingNavAction(null);
          executeNavAction(action);
        }}
        onCancel={() => setPendingNavAction(null)}
      />
    </section>
  );
}
