import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GAME_MODES, GAME_REALMS } from './data/gameData';
import type { DeviceRole, GameProgress, GameSettings, ScreenId } from './data/types';
import {
  computePartnerConnectionStatus,
  confirmQuestionAnswer,
  createInitialModeProgress,
  createInitialPartnerSnapshot,
  createInitialProgress,
  getNextIncompleteRealm,
  getNextIncompleteSetInRealm,
  getNextMonotonicQuestionTimestamp,
  getNextUnansweredQuestionIndex,
  getQuestionsViewProgress,
  getRealmProgress,
  getResumeTarget,
  getSetProgress,
  loadProgressFromStorage,
  lockInitialDeviceRole,
  resetSetProgress,
  saveProgressToStorage,
  STORAGE_KEY,
  switchDeviceRole,
} from './game/engine';
import { clearCloudChatMessages } from './sync/cloudSync';
import { nocturnalAudio } from './utils/sound';
import { BackNavigationProvider } from './utils/backNavigation';
import {
  CHAT_STORAGE_KEY,
  clearChatStoreCompletely,
  clearLocalChatHistory,
  createInitialChatStore,
  createLocalChatMessage,
  loadChatStore,
  mergeIncomingChatMessage,
  saveChatStore,
  type LocalChatStore,
} from './utils/chatStorage';
import {
  clearChatDraft,
  clearAllSessionDrafts,
  clearQuestionDraftsForSet,
  loadChatDraft,
  saveChatDraft,
} from './utils/sessionDrafts';
import {
  clearUpdatedSyncSetIds,
  loadUpdatedSyncSetIds,
  NEW_SYNC_SETS_STORAGE_KEY,
  saveUpdatedSyncSetIds,
} from './utils/syncMarkers';
import { useBackStack } from './hooks/useBackStack';
import { usePrivacyLock } from './hooks/usePrivacyLock';
import { useNearbySyncController } from './hooks/useNearbySyncController';
import { useCloudSyncController } from './hooks/useCloudSyncController';
import { usePrefersReducedMotion } from './utils/usePrefersReducedMotion';
import { PhoneStage } from './components/PhoneStage';
import { HomeScreen } from './components/HomeScreen';
import { BottomNavDock } from './components/BottomNavDock';
import { PartnerConnectionBadge } from './components/PartnerConnectionBadge';
import {
  FeedbackToastHost,
  type FeedbackToastItem,
  type FeedbackToastTone,
} from './components/FeedbackToastHost';
import {
  PinSetupModal,
  PrivacyCurtainOverlay,
  PrivacyLockScreen,
} from './components/PrivacyLockOverlay';
import {
  consumePendingStorageWriteIssues,
  subscribeStorageWriteIssues,
  type StorageWriteIssue,
} from './utils/security';

const SCREEN_HIERARCHY_DEPTH: Record<ScreenId, number> = {
  home: 0,
  modes: 1,
  chat: 1,
  log: 1,
  profile: 1,
  realms: 2,
  question: 3,
  completion: 4,
};

const ROOT_TAB_SCREENS = new Set<ScreenId>(['modes', 'chat', 'log', 'profile']);

function StageRouteFallback({ motionEnabled }: { motionEnabled: boolean }) {
  return (
    <div
      role="status"
      aria-label="جاري تحميل الشاشة"
      className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2.5 px-6 text-center"
    >
      <span className="w-10 h-10 rounded-full border border-[#F1AFC8] bg-white/85 flex items-center justify-center shadow-xs">
        <span
          className={`w-4 h-4 rounded-full border-2 border-[#F1AFC8] border-t-[#D6286C] ${
            motionEnabled ? 'animate-spin' : ''
          }`}
        />
      </span>
      <span className="text-xs font-semibold text-[#5E364A]">لحظة واحدة...</span>
    </div>
  );
}

function SyncModalLoadingFallback({ motionEnabled }: { motionEnabled: boolean }) {
  return (
    <div
      role="status"
      aria-label="جاري فتح نافذة المزامنة"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E0A14]/45 backdrop-blur-xs p-5"
    >
      <div className="ad-cut-card bg-[#FFFDFD] border border-[#F1AFC8] px-6 py-5 shadow-2xl flex flex-col items-center gap-3 text-center">
        <span className="w-10 h-10 rounded-full border border-[#F1AFC8] bg-[#FFF4F8] flex items-center justify-center">
          <span
            className={`w-4 h-4 rounded-full border-2 border-[#F1AFC8] border-t-[#D6286C] ${
              motionEnabled ? 'animate-spin' : ''
            }`}
          />
        </span>
        <span className="text-xs font-bold text-[#3A1627]">جارٍ تحضير نافذة المزامنة...</span>
      </div>
    </div>
  );
}

const RoleOnboardingScreen = lazy(() =>
  import('./components/RoleOnboardingScreen').then((m) => ({ default: m.RoleOnboardingScreen }))
);
const ModesScreen = lazy(() =>
  import('./components/ModesScreen').then((m) => ({ default: m.ModesScreen }))
);
const RealmsScreen = lazy(() =>
  import('./components/RealmsScreen').then((m) => ({ default: m.RealmsScreen }))
);
const QuestionScreen = lazy(() =>
  import('./components/QuestionScreen').then((m) => ({ default: m.QuestionScreen }))
);
const CompletionScreen = lazy(() =>
  import('./components/CompletionScreen').then((m) => ({ default: m.CompletionScreen }))
);
const LogScreen = lazy(() =>
  import('./components/LogScreen').then((m) => ({ default: m.LogScreen }))
);
const ProfileScreen = lazy(() =>
  import('./components/ProfileScreen').then((m) => ({ default: m.ProfileScreen }))
);
const ChatRoomScreen = lazy(() =>
  import('./components/ChatRoomScreen').then((m) => ({ default: m.ChatRoomScreen }))
);
const PartnerSyncModal = lazy(() =>
  import('./components/PartnerSyncModal').then((m) => ({ default: m.PartnerSyncModal }))
);

const REALM_BY_ID = new Map(GAME_REALMS.map((r) => [r.id, r]));
const SET_LOOKUP = new Map<
  string,
  { realm: (typeof GAME_REALMS)[number]; set: (typeof GAME_REALMS)[number]['sets'][number] }
>();
for (const realm of GAME_REALMS) {
  for (const set of realm.sets) {
    SET_LOOKUP.set(set.id, { realm, set });
  }
}

function areQuestionMapsEqual(
  a: Record<string, string[]>,
  b: Record<string, string[]>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const qId of keysA) {
    const arrA = a[qId];
    const arrB = b[qId];
    if (!arrB || arrA.length !== arrB.length) return false;
    for (let i = 0; i < arrA.length; i += 1) {
      if (arrA[i] !== arrB[i]) return false;
    }
  }
  return true;
}

export default function App() {
  const [progress, setProgress] = useState<GameProgress>(() => loadProgressFromStorage());
  const [screen, setScreen] = useState<ScreenId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'modes';
      }
    }
    return 'home';
  });

  const [activeRealmId, setActiveRealmId] = useState<string>(GAME_REALMS[0].id);
  const [activeSetId, setActiveSetId] = useState<string>(GAME_REALMS[0].sets[0].id);
  const [roundStartQuestionIndex, setRoundStartQuestionIndex] = useState<number>(0);
  const [openRealmSheetOnArrival, setOpenRealmSheetOnArrival] = useState<boolean>(false);
  const [logInitialSetId, setLogInitialSetId] = useState<string | null>(null);
  const [questionReturnScreen, setQuestionReturnScreen] = useState<ScreenId>('realms');
  const [isQuestionSessionActive, setIsQuestionSessionActive] = useState<boolean>(false);
  const [isQuestionTransitioning, setIsQuestionTransitioning] = useState<boolean>(false);
  const [isSelfReviewSession, setIsSelfReviewSession] = useState<boolean>(false);
  const [appModal, setAppModal] = useState<'none' | 'settings' | 'sync'>('none');
  const [hasOpenedSyncModal, setHasOpenedSyncModal] = useState<boolean>(false);

  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveMotion = progress.settings.motionEnabled && !prefersReducedMotion;
  const prevScreenRef = useRef<ScreenId>(screen);

  useEffect(() => {
    if (appModal === 'sync') {
      setHasOpenedSyncModal(true);
    }
  }, [appModal]);

  useEffect(() => {
    prevScreenRef.current = screen;
  }, [screen]);

  const [updatedSyncSetIds, setUpdatedSyncSetIds] = useState<string[]>(() =>
    loadUpdatedSyncSetIds()
  );
  const [chatDraft, setChatDraft] = useState<string>(() => loadChatDraft());
  const [chatDraftPrefill, setChatDraftPrefill] = useState<string | null>(null);
  const [chatStore, setChatStore] = useState<LocalChatStore>(() => loadChatStore());
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  const [questionLeaveRequest, setQuestionLeaveRequest] = useState<{
    nonce: number;
    onConfirmLeave: () => void;
  } | null>(null);

  const progressRef = useRef<GameProgress>(progress);
  progressRef.current = progress;
  const roleConfiguredRef = useRef<boolean>(progress.roleConfigured);
  roleConfiguredRef.current = progress.roleConfigured;
  const screenRef = useRef<ScreenId>(screen);
  screenRef.current = screen;
  const chatStoreRef = useRef<LocalChatStore>(chatStore);
  chatStoreRef.current = chatStore;
  const hasUnsavedQuestionRef = useRef<boolean>(false);

  const activeRealm = REALM_BY_ID.get(activeRealmId) ?? GAME_REALMS[0];
  const activeSetEntry = SET_LOOKUP.get(activeSetId);
  const activeSet =
    activeSetEntry && activeSetEntry.realm.id === activeRealm.id
      ? activeSetEntry.set
      : activeRealm.sets[0];

  const triggerHaptic = useCallback(() => {
    if (
      progressRef.current.settings.hapticsEnabled &&
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator
    ) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore if unsupported
      }
    }
  }, []);

  const playTapFeedback = useCallback(() => {
    nocturnalAudio.playSelect(progressRef.current.settings.soundEnabled);
    triggerHaptic();
  }, [triggerHaptic]);

  const [toasts, setToasts] = useState<FeedbackToastItem[]>([]);
  const toastTimersRef = useRef<Map<string, number>>(new Map());
  const toastCounterRef = useRef<number>(0);
  const appModalRef = useRef(appModal);
  appModalRef.current = appModal;
  const lastLiveAnswerToastAtRef = useRef<number>(0);
  const lastStorageToastAtRef = useRef<Record<string, number>>({});

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (options: {
      message: string;
      tone: FeedbackToastTone;
      durationMs?: number | null;
      dedupeKey?: string;
      actionLabel?: string;
      onAction?: () => void;
    }) => {
      const id = options.dedupeKey ?? `toast-${++toastCounterRef.current}`;
      const existingTimer = toastTimersRef.current.get(id);
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
        toastTimersRef.current.delete(id);
      }

      const nextItem: FeedbackToastItem = {
        id,
        tone: options.tone,
        message: options.message,
        durationMs: options.durationMs,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      };

      setToasts((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        const combined = [...filtered, nextItem];
        if (combined.length > 2) {
          const evicted = combined.slice(0, combined.length - 2);
          for (const item of evicted) {
            const evictedTimer = toastTimersRef.current.get(item.id);
            if (evictedTimer !== undefined) {
              window.clearTimeout(evictedTimer);
              toastTimersRef.current.delete(item.id);
            }
          }
          return combined.slice(combined.length - 2);
        }
        return combined;
      });

      const resolvedDuration =
        options.durationMs === undefined
          ? options.tone === 'error' || options.tone === 'warning'
            ? 5500
            : 3000
          : options.durationMs;

      if (resolvedDuration !== null && resolvedDuration > 0 && typeof window !== 'undefined') {
        const timer = window.setTimeout(() => {
          toastTimersRef.current.delete(id);
          setToasts((prev) => prev.filter((item) => item.id !== id));
        }, resolvedDuration);
        toastTimersRef.current.set(id, timer);
      }
    },
    []
  );

  useEffect(() => {
    const timersMap = toastTimersRef.current;
    return () => {
      for (const timer of timersMap.values()) {
        window.clearTimeout(timer);
      }
      timersMap.clear();
    };
  }, []);

  useEffect(() => {
    saveChatDraft(chatDraft);
  }, [chatDraft]);

  useEffect(() => {
    const handleStorageIssue = (issue: StorageWriteIssue) => {
      const now = Date.now();
      const lastShown = lastStorageToastAtRef.current[issue.reason] ?? 0;
      if (now - lastShown < 8000) return;
      lastStorageToastAtRef.current[issue.reason] = now;

      if (issue.reason === 'write-protected') {
        pushToast({
          message:
            'وضع حماية البيانات المحلية مفعّل — تعذّر الوصول إلى مخزن المفاتيح؛ أعد فتح التطبيق لحماية بياناتك.',
          tone: 'warning',
          durationMs: null,
          dedupeKey: 'storage-write-protected',
        });
      } else if (issue.reason === 'quota') {
        pushToast({
          message: 'مساحة التخزين على الجهاز ممتلئة؛ يرجى تفريغ مساحة لضمان حفظ التقدم.',
          tone: 'error',
          durationMs: null,
          dedupeKey: 'storage-quota',
        });
      } else {
        pushToast({
          message: 'تعذّر حفظ التغييرات محلياً الآن؛ تأكّد من سماح المتصفح بالتخزين المحلي.',
          tone: 'warning',
          durationMs: null,
          dedupeKey: 'storage-error',
        });
      }
    };

    const bootIssues = consumePendingStorageWriteIssues();
    for (const issue of bootIssues) {
      handleStorageIssue(issue);
    }

    return subscribeStorageWriteIssues(handleStorageIssue);
  }, [pushToast]);

  const markUpdatedSetsFromDiff = useCallback(
    (
      prevAnswers: Record<string, Record<string, string[]>>,
      nextAnswers: Record<string, Record<string, string[]>>
    ) => {
      const changed: string[] = [];
      for (const [setId, nextQMap] of Object.entries(nextAnswers)) {
        const prevQMap = prevAnswers[setId] ?? {};
        if (!areQuestionMapsEqual(prevQMap, nextQMap)) {
          changed.push(setId);
        }
      }
      if (changed.length > 0) {
        setUpdatedSyncSetIds((prev) => Array.from(new Set([...prev, ...changed])));
        if (
          progressRef.current.role === 'husband' &&
          progressRef.current.partnerSnapshot.lastSyncedAt !== null &&
          screenRef.current !== 'question' &&
          appModalRef.current === 'none'
        ) {
          const now = Date.now();
          if (now - lastLiveAnswerToastAtRef.current >= 4500) {
            lastLiveAnswerToastAtRef.current = now;
            pushToast({
              message: `وصلت اختيارات محدّثة من ${progressRef.current.partnerSnapshot.partnerName}`,
              tone: 'info',
              durationMs: 3200,
              dedupeKey: 'wife-live-update',
              actionLabel: 'استعراض',
              onAction: () => {
                setLogInitialSetId(changed[0] ?? null);
                setScreen('log');
              },
            });
          }
        }
      }
    },
    [pushToast]
  );

  const clearUpdatedSyncSetId = useCallback((setId: string) => {
    setUpdatedSyncSetIds((prev) => (prev.includes(setId) ? prev.filter((id) => id !== setId) : prev));
  }, []);

  // Bridge refs for non-circular lifecycle coordination between PrivacyLock, BackStack, and CloudSync
  const collapseOverlaysRef = useRef<() => void>(() => {});
  const syncOnlineStateRef = useRef<(online: boolean) => void>(() => {});

  const privacy = usePrivacyLock({
    progressRef,
    privacyCurtainEnabled: progress.settings.privacyCurtainEnabled,
    onCollapseOverlays: () => collapseOverlaysRef.current(),
    onSyncOnlineState: (online) => syncOnlineStateRef.current(online),
    setAppModal,
    triggerHaptic,
    onPinFeedback: (action) => {
      if (action === 'created') {
        pushToast({
          message: 'تم تفعيل قفل التطبيق بالرمز الشخصي',
          tone: 'success',
          durationMs: 3000,
          dedupeKey: 'pin-feedback',
        });
      } else if (action === 'changed') {
        pushToast({
          message: 'تم تغيير الرمز الشخصي بنجاح',
          tone: 'success',
          durationMs: 3000,
          dedupeKey: 'pin-feedback',
        });
      } else {
        pushToast({
          message: 'تم إلغاء قفل الرمز الشخصي',
          tone: 'info',
          durationMs: 3000,
          dedupeKey: 'pin-feedback',
        });
      }
    },
  });

  const backStack = useBackStack({
    screen,
    setScreen,
    screenRef,
    activeRealmId,
    activeSetId,
    logInitialSetId,
    questionReturnScreen,
    setActiveRealmId,
    setActiveSetId,
    setLogInitialSetId,
    setQuestionReturnScreen,
    setIsQuestionSessionActive,
    setIsQuestionTransitioning,
    setIsSelfReviewSession,
    appModal,
    setAppModal,
    isLockedRef: privacy.isLockedRef,
    roleConfiguredRef,
    realmById: REALM_BY_ID,
  });
  collapseOverlaysRef.current = backStack.collapseOverlaysOnLock;

  const nearby = useNearbySyncController({
    progress,
    setProgress,
    progressRef,
    screenRef,
    chatStore,
    setChatStore,
    chatStoreRef,
    setUnreadChatCount,
    setUpdatedSyncSetIds,
    markUpdatedSetsFromDiff,
    setAppModal,
    isSyncModalOpen: appModal === 'sync',
    triggerHaptic,
    setLookup: SET_LOOKUP,
    onUnexpectedDisconnect: () => {
      pushToast({
        message: 'انقطع الاتصال القريب مع الجهاز الآخر',
        tone: 'warning',
        durationMs: 5500,
        dedupeKey: 'nearby-disconnect',
        actionLabel: 'إعادة الربط',
        onAction: () => setAppModal('sync'),
      });
    },
    onRemoteChatCleared: () => {
      pushToast({
        message: 'تم مسح سجل المحادثة من الجهاز الآخر',
        tone: 'info',
        durationMs: 3200,
        dedupeKey: 'remote-chat-clear',
      });
    },
  });

  const cloud = useCloudSyncController({
    progress,
    setProgress,
    progressRef,
    screenRef,
    isLocked: privacy.isLocked,
    chatStore,
    setChatStore,
    chatStoreRef,
    setUnreadChatCount,
    markUpdatedSetsFromDiff,
    setAppModal,
    onIncomingChatNotification: () => {
      nocturnalAudio.playSelect(progressRef.current.settings.soundEnabled);
      triggerHaptic();
    },
    onPartnerJoined: () => {
      pushToast({
        message:
          progressRef.current.role === 'husband'
            ? 'انضمت الشريكة إلى الخزنة السحابية المشتركة بنجاح'
            : 'انضم الشريك إلى الخزنة السحابية المشتركة بنجاح',
        tone: 'success',
        durationMs: 3200,
        dedupeKey: 'partner-joined',
      });
    },
    onActionFeedback: (message, tone) => {
      pushToast({
        message,
        tone,
        durationMs: tone === 'error' || tone === 'warning' ? 5000 : 3000,
      });
    },
  });
  syncOnlineStateRef.current = cloud.setIsOnline;

  // Debounced local persistence with synchronous flush & wipe-race guard
  const didMountProgressRef = useRef(false);
  const progressDirtyRef = useRef(false);
  const progressTimerRef = useRef<number | null>(null);
  const skipNextProgressPersistRef = useRef(false);

  const didMountChatRef = useRef(false);
  const chatDirtyRef = useRef(false);
  const chatTimerRef = useRef<number | null>(null);
  const skipNextChatPersistRef = useRef(false);

  const didMountSyncMarkersRef = useRef(false);
  const skipNextSyncMarkersPersistRef = useRef(false);

  useEffect(() => {
    if (!didMountProgressRef.current) {
      didMountProgressRef.current = true;
      return;
    }
    if (skipNextProgressPersistRef.current) {
      skipNextProgressPersistRef.current = false;
      progressDirtyRef.current = false;
      return;
    }
    progressDirtyRef.current = true;
    const timer = window.setTimeout(() => {
      progressTimerRef.current = null;
      progressDirtyRef.current = false;
      saveProgressToStorage(progressRef.current);
    }, 250);
    progressTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (progressTimerRef.current === timer) {
        progressTimerRef.current = null;
      }
    };
  }, [progress]);

  useEffect(() => {
    if (!didMountChatRef.current) {
      didMountChatRef.current = true;
      return;
    }
    if (skipNextChatPersistRef.current) {
      skipNextChatPersistRef.current = false;
      chatDirtyRef.current = false;
      return;
    }
    chatDirtyRef.current = true;
    const timer = window.setTimeout(() => {
      chatTimerRef.current = null;
      chatDirtyRef.current = false;
      saveChatStore(chatStoreRef.current);
    }, 200);
    chatTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (chatTimerRef.current === timer) {
        chatTimerRef.current = null;
      }
    };
  }, [chatStore]);

  useEffect(() => {
    if (!didMountSyncMarkersRef.current) {
      didMountSyncMarkersRef.current = true;
      return;
    }
    if (skipNextSyncMarkersPersistRef.current) {
      skipNextSyncMarkersPersistRef.current = false;
      return;
    }
    saveUpdatedSyncSetIds(updatedSyncSetIds);
  }, [updatedSyncSetIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flushPendingStores = () => {
      if (progressTimerRef.current !== null) {
        window.clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (progressDirtyRef.current) {
        progressDirtyRef.current = false;
        saveProgressToStorage(progressRef.current);
      }
      if (chatTimerRef.current !== null) {
        window.clearTimeout(chatTimerRef.current);
        chatTimerRef.current = null;
      }
      if (chatDirtyRef.current) {
        chatDirtyRef.current = false;
        saveChatStore(chatStoreRef.current);
      }
    };
    const onVisibilityFlush = () => {
      if (document.hidden) flushPendingStores();
    };
    const onExternalStorageChange = (e: StorageEvent) => {
      if (!e.storageArea || e.storageArea !== window.localStorage || !e.key) return;
      if (e.key === STORAGE_KEY) {
        if (progressTimerRef.current !== null) {
          window.clearTimeout(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        progressDirtyRef.current = false;
        skipNextProgressPersistRef.current = true;
        setProgress(e.newValue === null ? createInitialProgress() : loadProgressFromStorage());
      } else if (e.key === CHAT_STORAGE_KEY) {
        if (chatTimerRef.current !== null) {
          window.clearTimeout(chatTimerRef.current);
          chatTimerRef.current = null;
        }
        chatDirtyRef.current = false;
        skipNextChatPersistRef.current = true;
        setChatStore(e.newValue === null ? createInitialChatStore() : loadChatStore());
      } else if (e.key === NEW_SYNC_SETS_STORAGE_KEY) {
        skipNextSyncMarkersPersistRef.current = true;
        setUpdatedSyncSetIds(e.newValue === null ? [] : loadUpdatedSyncSetIds());
      }
    };
    window.addEventListener('pagehide', flushPendingStores);
    window.addEventListener('beforeunload', flushPendingStores);
    window.addEventListener('storage', onExternalStorageChange);
    document.addEventListener('visibilitychange', onVisibilityFlush);
    return () => {
      window.removeEventListener('pagehide', flushPendingStores);
      window.removeEventListener('beforeunload', flushPendingStores);
      window.removeEventListener('storage', onExternalStorageChange);
      document.removeEventListener('visibilitychange', onVisibilityFlush);
      flushPendingStores();
    };
  }, []);

  useEffect(() => {
    if (screen === 'chat') {
      setUnreadChatCount(0);
    }
  }, [screen]);

  const handleStartFromHome = useCallback(() => {
    nocturnalAudio.playConfirm(progressRef.current.settings.soundEnabled);
    triggerHaptic();
    backStack.navigateTo('modes');
  }, [triggerHaptic, backStack]);

  const resumeTargetRef = useRef<ReturnType<typeof getResumeTarget>>(null);
  const handleStartLevelDirectlyRef = useRef<
    (
      realmId: string,
      setId: string,
      returnTo?: ScreenId,
      navOptions?: { replace?: boolean }
    ) => void
  >(() => {});

  // Keyboard support on Home screen (Enter / Space) without double-firing focused controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        !progress.roleConfigured ||
        privacy.isLocked ||
        privacy.pinModalMode !== null ||
        screen !== 'home' ||
        appModal !== 'none'
      ) {
        return;
      }
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('button, a, input, textarea, select')
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const target = resumeTargetRef.current;
        if (target) {
          handleStartLevelDirectlyRef.current(target.realm.id, target.set.id, 'home');
        } else {
          handleStartFromHome();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    progress.roleConfigured,
    privacy.isLocked,
    privacy.pinModalMode,
    screen,
    appModal,
    handleStartFromHome,
  ]);

  const handleViewSetInLog = useCallback(
    (realmId: string, setId?: string) => {
      playTapFeedback();
      setIsQuestionSessionActive(false);
      setIsSelfReviewSession(false);
      setActiveRealmId(realmId);
      setLogInitialSetId(setId ?? null);
      backStack.navigateTo('log', {
        collapseToRoot: true,
        realmId,
        logSetId: setId ?? null,
      });
    },
    [playTapFeedback, backStack]
  );

  const handleReviewCompletedSet = useCallback(
    (
      realmId: string,
      setId: string,
      returnTo: ScreenId = 'realms',
      navOptions?: { replace?: boolean }
    ) => {
      const realm = REALM_BY_ID.get(realmId) ?? GAME_REALMS[0];
      const setEntry = SET_LOOKUP.get(setId);
      const targetSet =
        setEntry && setEntry.realm.id === realm.id ? setEntry.set : realm.sets[0];
      nocturnalAudio.playConfirm(progressRef.current.settings.soundEnabled);
      triggerHaptic();
      setActiveRealmId(realm.id);
      setActiveSetId(targetSet.id);
      setRoundStartQuestionIndex(0);
      setQuestionReturnScreen(returnTo);
      setIsSelfReviewSession(true);
      setIsQuestionSessionActive(true);
      backStack.navigateTo('question', {
        replace: navOptions?.replace,
        realmId: realm.id,
        setId: targetSet.id,
        questionReturnScreen: returnTo,
      });
    },
    [triggerHaptic, backStack]
  );

  const handleStartLevelDirectly = useCallback(
    (
      realmId: string,
      setId: string,
      returnTo: ScreenId = 'realms',
      navOptions?: { replace?: boolean }
    ) => {
      const realm = REALM_BY_ID.get(realmId) ?? GAME_REALMS[0];
      const setEntry = SET_LOOKUP.get(setId);
      const targetSet =
        setEntry && setEntry.realm.id === realm.id ? setEntry.set : realm.sets[0];
      setIsSelfReviewSession(false);

      if (progress.role === 'husband') {
        clearUpdatedSyncSetId(targetSet.id);
        nocturnalAudio.playConfirm(progress.settings.soundEnabled);
        triggerHaptic();
        setActiveRealmId(realm.id);
        setActiveSetId(targetSet.id);
        setRoundStartQuestionIndex(0);
        setQuestionReturnScreen(returnTo);
        setIsQuestionSessionActive(true);
        backStack.navigateTo('question', {
          replace: navOptions?.replace,
          realmId: realm.id,
          setId: targetSet.id,
          questionReturnScreen: returnTo,
        });
        return;
      }

      if (getSetProgress(progress, targetSet).isCompleted) {
        handleReviewCompletedSet(realm.id, targetSet.id, returnTo, navOptions);
        return;
      }
      const nextIdx = getNextUnansweredQuestionIndex(
        progress.answersBySet[targetSet.id],
        targetSet
      );
      nocturnalAudio.playConfirm(progress.settings.soundEnabled);
      triggerHaptic();
      setActiveRealmId(realm.id);
      setActiveSetId(targetSet.id);
      setRoundStartQuestionIndex(nextIdx);
      setQuestionReturnScreen(returnTo);
      setIsQuestionSessionActive(true);
      backStack.navigateTo('question', {
        replace: navOptions?.replace,
        realmId: realm.id,
        setId: targetSet.id,
        questionReturnScreen: returnTo,
      });
    },
    [progress, triggerHaptic, backStack, handleReviewCompletedSet, clearUpdatedSyncSetId]
  );
  handleStartLevelDirectlyRef.current = handleStartLevelDirectly;

  const handleConfirmQuestion = (questionId: string, selectedOptions: string[]) => {
    triggerHaptic();
    const nextUpdatedAt = getNextMonotonicQuestionTimestamp(
      progressRef.current.modeProgress.questions.updatedAt
    );
    setProgress((prev) =>
      confirmQuestionAnswer(
        prev,
        activeSet.id,
        questionId,
        selectedOptions,
        activeSet.questions.length,
        nextUpdatedAt
      )
    );
    cloud.markCloudUploadPending();
    if (
      progressRef.current.role === 'wife' &&
      nearby.busRef.current?.getState().status === 'connected'
    ) {
      void nearby.busRef.current.emitLiveEvent({
        type: 'QUESTION_ANSWERED_LIVE',
        realmId: activeRealm.id,
        setId: activeSet.id,
        questionId,
        selectedIds: selectedOptions,
        updatedAt: nextUpdatedAt,
      });
    }
  };

  const handleCompleteSet = () => {
    playTapFeedback();
    setIsQuestionSessionActive(false);
    backStack.navigateTo('completion', { replace: true });
  };

  const handleReplaySet = () => {
    nocturnalAudio.playConfirm(progress.settings.soundEnabled);
    triggerHaptic();
    const nextUpdatedAt = getNextMonotonicQuestionTimestamp(
      progressRef.current.modeProgress.questions.updatedAt
    );
    clearQuestionDraftsForSet(activeSet.id);
    setProgress((prev) => resetSetProgress(prev, activeSet.id, nextUpdatedAt));
    cloud.markCloudUploadPending();
    if (
      progressRef.current.role === 'wife' &&
      nearby.busRef.current?.getState().status === 'connected'
    ) {
      void nearby.busRef.current.emitLiveEvent({
        type: 'SET_RESET_LIVE',
        setId: activeSet.id,
        updatedAt: nextUpdatedAt,
      });
    }
    setRoundStartQuestionIndex(0);
    setIsSelfReviewSession(false);
    setIsQuestionSessionActive(true);
    backStack.navigateTo('question', {
      replace: screenRef.current === 'completion',
      realmId: activeRealm.id,
      setId: activeSet.id,
    });
  };

  const handleReplaySpecificSet = useCallback(
    (realmId: string, setId: string) => {
      const realm = REALM_BY_ID.get(realmId) ?? GAME_REALMS[0];
      const setEntry = SET_LOOKUP.get(setId);
      const targetSet =
        setEntry && setEntry.realm.id === realm.id ? setEntry.set : realm.sets[0];
      nocturnalAudio.playConfirm(progress.settings.soundEnabled);
      triggerHaptic();
      const nextUpdatedAt = getNextMonotonicQuestionTimestamp(
        progressRef.current.modeProgress.questions.updatedAt
      );
      clearQuestionDraftsForSet(targetSet.id);
      setProgress((prev) => resetSetProgress(prev, targetSet.id, nextUpdatedAt));
      cloud.markCloudUploadPending();
      if (
        progressRef.current.role === 'wife' &&
        nearby.busRef.current?.getState().status === 'connected'
      ) {
        void nearby.busRef.current.emitLiveEvent({
          type: 'SET_RESET_LIVE',
          setId: targetSet.id,
          updatedAt: nextUpdatedAt,
        });
      }
      setActiveRealmId(realm.id);
      setActiveSetId(targetSet.id);
      setRoundStartQuestionIndex(0);
      setQuestionReturnScreen('realms');
      setIsSelfReviewSession(false);
      setIsQuestionSessionActive(true);
      backStack.navigateTo('question', {
        realmId: realm.id,
        setId: targetSet.id,
        questionReturnScreen: 'realms',
      });
    },
    [progress.settings.soundEnabled, triggerHaptic, backStack, cloud, nearby.busRef]
  );

  const handleStartNextSet = (nextSetId: string) => {
    handleStartLevelDirectly(activeRealm.id, nextSetId, questionReturnScreen, {
      replace: screenRef.current === 'completion',
    });
  };

  const handleStartNextRealm = (nextRealmId: string) => {
    const nextRealm = REALM_BY_ID.get(nextRealmId) ?? GAME_REALMS[0];
    nocturnalAudio.playConfirm(progress.settings.soundEnabled);
    triggerHaptic();
    setActiveRealmId(nextRealm.id);
    setOpenRealmSheetOnArrival(true);
    backStack.navigateTo('realms', {
      replace: screenRef.current === 'completion',
      realmId: nextRealm.id,
    });
  };

  const handleToggleSetting = (key: keyof GameSettings) => {
    const nextValue = !progress.settings[key];
    if (key === 'soundEnabled') {
      if (nextValue) {
        nocturnalAudio.playConfirm(true);
      }
    } else {
      nocturnalAudio.playSelect(progress.settings.soundEnabled);
    }
    if (
      key === 'hapticsEnabled' &&
      nextValue &&
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator
    ) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore if unsupported
      }
    } else if (key !== 'hapticsEnabled') {
      triggerHaptic();
    }
    setProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: nextValue,
      },
    }));
  };

  const handleResetAll = () => {
    nocturnalAudio.playDeselect(progress.settings.soundEnabled);
    triggerHaptic();
    setUpdatedSyncSetIds([]);
    setLogInitialSetId(null);
    setIsSelfReviewSession(false);
    setIsQuestionSessionActive(false);
    setActiveRealmId(GAME_REALMS[0].id);
    setActiveSetId(GAME_REALMS[0].sets[0].id);

    if (progressRef.current.role === 'husband') {
      setProgress((prev) => ({
        ...prev,
        modeProgress: createInitialModeProgress(),
        partnerSnapshot: createInitialPartnerSnapshot('husband'),
      }));
      return;
    }

    const nextUpdatedAt = getNextMonotonicQuestionTimestamp(
      progressRef.current.modeProgress.questions.updatedAt
    );
    clearAllSessionDrafts();
    setChatDraft('');
    setProgress((prev) => ({
      ...createInitialProgress(prev.role, prev.roleConfigured),
      deviceId: prev.deviceId,
      playerName: prev.playerName,
      settings: prev.settings,
      partnerSnapshot: prev.partnerSnapshot,
      modeProgress: {
        ...createInitialModeProgress(),
        questions: {
          updatedAt: nextUpdatedAt,
        },
      },
    }));
    cloud.markCloudUploadPending();
    if (nearby.busRef.current?.getState().status === 'connected') {
      void nearby.busRef.current.emitLiveEvent({
        type: 'ALL_RESET_LIVE',
        updatedAt: nextUpdatedAt,
      });
    }
  };

  const handleLockInitialRole = useCallback(
    (chosenRole: DeviceRole, customName: string) => {
      nocturnalAudio.playConfirm(progressRef.current.settings.soundEnabled);
      triggerHaptic();
      setProgress((prev) => lockInitialDeviceRole(prev, chosenRole, customName));
    },
    [triggerHaptic]
  );

  const handleSwitchDeviceRole = useCallback(
    async (targetRole: DeviceRole) => {
      nocturnalAudio.playConfirm(progressRef.current.settings.soundEnabled);
      triggerHaptic();
      await nearby.handleDisconnectNearby();
      await cloud.resetCloudOnRoleSwitch(progressRef.current.role);
      if (chatTimerRef.current !== null) {
        window.clearTimeout(chatTimerRef.current);
        chatTimerRef.current = null;
      }
      chatDirtyRef.current = false;
      clearChatStoreCompletely();
      clearAllSessionDrafts();
      setChatStore(createInitialChatStore());
      setUnreadChatCount(0);
      setChatDraft('');
      setUpdatedSyncSetIds([]);
      setLogInitialSetId(null);
      setChatDraftPrefill(null);
      setActiveRealmId(GAME_REALMS[0].id);
      setActiveSetId(GAME_REALMS[0].sets[0].id);
      setQuestionReturnScreen('realms');
      setOpenRealmSheetOnArrival(false);
      setIsSelfReviewSession(false);
      setIsQuestionSessionActive(false);
      setProgress((prev) => switchDeviceRole(prev, targetRole));
      pushToast({
        message:
          targetRole === 'husband'
            ? 'تم التحويل إلى نسخة الزوج بنجاح'
            : 'تم التحويل إلى نسخة الزوجة بنجاح',
        tone: 'success',
        durationMs: 3200,
        dedupeKey: 'role-switched',
      });
    },
    [nearby, cloud, triggerHaptic, pushToast]
  );

  const handleDiscussInChat = useCallback(
    (prefillText: string) => {
      playTapFeedback();
      setIsQuestionSessionActive(false);
      setIsSelfReviewSession(false);
      setChatDraftPrefill(prefillText);
      backStack.navigateTo('chat', {
        collapseToRoot: true,
      });
    },
    [playTapFeedback, backStack]
  );

  const handleSendChatMessage = useCallback(
    (text: string) => {
      const cleanText = text.trim();
      if (!cleanText) return;
      const current = progressRef.current;
      const isCloudReady = Boolean(
        cloud.cloudUserRef.current &&
          cloud.cloudStateRef.current.vaultId &&
          cloud.cloudStateRef.current.vaultKey &&
          !cloud.hasVaultAccountMismatchRef.current &&
          current.settings.cloudAutoSyncEnabled
      );
      const msg = createLocalChatMessage({
        senderRole: current.role,
        senderName: current.playerName,
        senderDeviceId: current.deviceId,
        text: cleanText,
        needsCloudUpload: isCloudReady,
        needsNearbyAck: nearby.busRef.current?.getState().status === 'connected',
      });
      setChatStore((prev) => mergeIncomingChatMessage(prev, msg));
      nocturnalAudio.playConfirm(current.settings.soundEnabled);
      triggerHaptic();

      if (nearby.busRef.current?.getState().status === 'connected') {
        nearby.nearbySentChatIdsRef.current.add(msg.id);
        void nearby.busRef.current.emitLiveEvent({
          type: 'CHAT_MESSAGE',
          messageId: msg.id,
          senderName: msg.senderName,
          text: msg.text,
          createdAt: msg.createdAt,
        });
      }
    },
    [cloud.cloudUserRef, cloud.cloudStateRef, cloud.hasVaultAccountMismatchRef, nearby.busRef, nearby.nearbySentChatIdsRef, triggerHaptic]
  );

  const handleClearChat = useCallback(async (): Promise<
    'cleared-all' | 'cleared-local-queued' | 'cleared-local'
  > => {
    nocturnalAudio.playDeselect(progressRef.current.settings.soundEnabled);
    triggerHaptic();
    const clearedAt = Date.now();
    const user = cloud.cloudUserRef.current;
    const currentCloud = cloud.cloudStateRef.current;
    const isCloudLinkedNow = Boolean(
      user && currentCloud.vaultId && !cloud.hasVaultAccountMismatchRef.current
    );
    const shouldQueueCloudClear = isCloudLinkedNow && !cloud.isOnlineRef.current;
    const wasNearbyConnected = nearby.busRef.current?.getState().status === 'connected';

    cloud.setFailedCloudChatIds([]);
    setChatStore((prev) =>
      clearLocalChatHistory(prev, clearedAt, {
        pendingCloudClearAt: shouldQueueCloudClear ? clearedAt : null,
        pendingCloudClearVaultId: shouldQueueCloudClear ? currentCloud.vaultId : null,
      })
    );
    clearChatDraft();
    setChatDraft('');
    setUnreadChatCount(0);
    if (wasNearbyConnected) {
      void nearby.busRef.current?.emitLiveEvent({
        type: 'CHAT_CLEAR',
        clearedAt,
      });
    }
    if (isCloudLinkedNow && currentCloud.vaultId && cloud.isOnlineRef.current) {
      try {
        await clearCloudChatMessages(currentCloud.vaultId, clearedAt);
        return 'cleared-all';
      } catch {
        // Persist pending clear watermark scoped to active vault so cloud deletion retries on reconnect
        const vaultIdSnapshot = currentCloud.vaultId;
        setChatStore((prev) => ({
          ...prev,
          pendingCloudClearAt: prev.pendingCloudClearAt
            ? Math.max(prev.pendingCloudClearAt, clearedAt)
            : clearedAt,
          pendingCloudClearVaultId: vaultIdSnapshot,
        }));
        return 'cleared-local-queued';
      }
    }
    if (shouldQueueCloudClear) {
      return 'cleared-local-queued';
    }
    if (wasNearbyConnected) {
      return 'cleared-all';
    }
    return 'cleared-local';
  }, [cloud, nearby.busRef, triggerHaptic]);

  const handleForgotPinWipeAll = useCallback(() => {
    nocturnalAudio.playDeselect(progressRef.current.settings.soundEnabled);
    const prevRole = progressRef.current.role;

    // Cancel any queued debounced persistence & guard against immediate post-wipe rewrites
    if (progressTimerRef.current !== null) {
      window.clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (chatTimerRef.current !== null) {
      window.clearTimeout(chatTimerRef.current);
      chatTimerRef.current = null;
    }
    progressDirtyRef.current = false;
    chatDirtyRef.current = false;
    skipNextProgressPersistRef.current = true;
    skipNextChatPersistRef.current = true;
    skipNextSyncMarkersPersistRef.current = true;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage removal errors
      }
    }
    clearUpdatedSyncSetIds();
    clearChatStoreCompletely();
    clearAllSessionDrafts();
    void nearby.handleDisconnectNearby();
    privacy.wipeSecurityState();
    cloud.wipeCloudOnForgotPin(prevRole);
    backStack.resetStackToHome();

    hasUnsavedQuestionRef.current = false;
    setQuestionLeaveRequest(null);
    setProgress(createInitialProgress());
    setChatStore(createInitialChatStore());
    setUnreadChatCount(0);
    setUpdatedSyncSetIds([]);
    setChatDraft('');
    setChatDraftPrefill(null);
    setActiveRealmId(GAME_REALMS[0].id);
    setActiveSetId(GAME_REALMS[0].sets[0].id);
    setRoundStartQuestionIndex(0);
    setOpenRealmSheetOnArrival(false);
    setLogInitialSetId(null);
    setQuestionReturnScreen('realms');
    setIsQuestionSessionActive(false);
    setIsQuestionTransitioning(false);
    setIsSelfReviewSession(false);
    screenRef.current = 'home';
    setScreen('home');
    setAppModal('none');
  }, [backStack, cloud, nearby, privacy]);

  const viewProgress = useMemo(() => getQuestionsViewProgress(progress), [progress]);
  const currentSetSummary = useMemo(
    () => getSetProgress(viewProgress, activeSet),
    [viewProgress, activeSet]
  );
  const currentRealmSummary = useMemo(
    () => getRealmProgress(viewProgress, activeRealm),
    [viewProgress, activeRealm]
  );
  const nextSetInRealm = useMemo(
    () => getNextIncompleteSetInRealm(viewProgress, activeRealm, activeSet.id),
    [viewProgress, activeRealm, activeSet.id]
  );
  const nextIncompleteRealm = useMemo(
    () => getNextIncompleteRealm(viewProgress, GAME_REALMS, activeRealm.id),
    [viewProgress, activeRealm.id]
  );

  const accentHex =
    !progress.roleConfigured ||
    screen === 'home' ||
    screen === 'chat' ||
    screen === 'log' ||
    screen === 'profile'
      ? '#D6286C'
      : activeRealm.accentHex;

  const resumeTarget = useMemo(() => getResumeTarget(viewProgress, GAME_REALMS), [viewProgress]);
  resumeTargetRef.current = resumeTarget;

  const connectionStatus = useMemo(
    () =>
      computePartnerConnectionStatus({
        nearbyStatus: nearby.busState.status,
        isCloudLinked: cloud.isCloudVaultLinked,
        isOnline: cloud.isOnline,
        cloudAutoSyncEnabled: progress.settings.cloudAutoSyncEnabled,
        cloudStatus: cloud.cloudStatus,
        cloudPartnerJoined: cloud.cloudPartnerJoined,
      }),
    [
      nearby.busState.status,
      cloud.isCloudVaultLinked,
      cloud.isOnline,
      progress.settings.cloudAutoSyncEnabled,
      cloud.cloudStatus,
      cloud.cloudPartnerJoined,
    ]
  );

  const isQuestionScreenVisible =
    screen === 'question' &&
    (progress.role === 'husband' ||
      !currentSetSummary.isCompleted ||
      isQuestionSessionActive ||
      isSelfReviewSession);

  const isVelvetQuestionStage =
    progress.roleConfigured &&
    isQuestionScreenVisible &&
    (activeSet.id.endsWith('-set-3') || activeSet.indexLabel === '٠٣');

  if (!progress.roleConfigured) {
    return (
      <BackNavigationProvider value={backStack.backNavApi}>
        <PhoneStage
          accentHex={accentHex}
          motionEnabled={effectiveMotion}
          animationsPaused={privacy.isAppInBackground}
        >
          <PartnerConnectionBadge status={connectionStatus} motionEnabled={effectiveMotion} />
          <FeedbackToastHost toasts={toasts} onDismiss={dismissToast} />
          <Suspense fallback={<StageRouteFallback motionEnabled={effectiveMotion} />}>
            <RoleOnboardingScreen
              onConfirmRole={handleLockInitialRole}
              onTapFeedback={playTapFeedback}
              motionEnabled={effectiveMotion}
            />
          </Suspense>
        </PhoneStage>
      </BackNavigationProvider>
    );
  }

  const isRootTabScreen =
    screen === 'modes' || screen === 'chat' || screen === 'log' || screen === 'profile';

  const prevScreen = prevScreenRef.current;
  const screenTransitionClass = (() => {
    if (!effectiveMotion || prevScreen === screen) return 'ad-anim-screen-curtain';
    if (ROOT_TAB_SCREENS.has(prevScreen) && ROOT_TAB_SCREENS.has(screen)) {
      return 'ad-anim-screen-curtain';
    }
    const prevDepth = SCREEN_HIERARCHY_DEPTH[prevScreen] ?? 0;
    const nextDepth = SCREEN_HIERARCHY_DEPTH[screen] ?? 0;
    if (nextDepth > prevDepth) return 'ad-anim-screen-forward';
    if (nextDepth < prevDepth) return 'ad-anim-screen-back';
    return 'ad-anim-screen-curtain';
  })();

  return (
    <BackNavigationProvider value={backStack.backNavApi}>
      <PhoneStage
        accentHex={accentHex}
        motionEnabled={effectiveMotion}
        animationsPaused={privacy.isAppInBackground}
        suppressAtmosphere={screen === 'home'}
      >
        <PartnerConnectionBadge
          role={progress.role}
          status={connectionStatus}
          darkMode={isVelvetQuestionStage}
          disabled={privacy.isLocked || appModal !== 'none' || isQuestionTransitioning}
          motionEnabled={effectiveMotion}
          onPress={() => {
            playTapFeedback();
            setAppModal('sync');
          }}
        />
        <FeedbackToastHost toasts={toasts} onDismiss={dismissToast} />
        {screen === 'home' && (
          <HomeScreen
            role={progress.role}
            partnerName={progress.partnerSnapshot.partnerName}
            hasPartnerSync={progress.partnerSnapshot.lastSyncedAt !== null}
            resumeTarget={resumeTarget}
            onStart={handleStartFromHome}
            onResume={
              resumeTarget
                ? () =>
                    handleStartLevelDirectly(
                      resumeTarget.realm.id,
                      resumeTarget.set.id,
                      'home'
                    )
                : undefined
            }
            onSealTap={playTapFeedback}
            motionEnabled={effectiveMotion}
            transitionClassName={screenTransitionClass}
          />
        )}

        <Suspense fallback={<StageRouteFallback motionEnabled={effectiveMotion} />}>
          {screen === 'modes' && (
            <ModesScreen
              modes={GAME_MODES}
              realms={GAME_REALMS}
              progress={progress}
              onExploreRealms={() => backStack.navigateTo('realms')}
              onBack={() => backStack.goBackTo('home', { replaceIfFallback: true })}
              onTapFeedback={playTapFeedback}
              onUnavailableFeedback={() =>
                nocturnalAudio.playDeselect(progress.settings.soundEnabled)
              }
              motionEnabled={effectiveMotion}
              transitionClassName={screenTransitionClass}
            />
          )}

          {screen === 'realms' && (() => {
            const realmsParent = backStack.getParentScreen();
            const returnToLog = realmsParent === 'log';
            return (
              <RealmsScreen
                realms={GAME_REALMS}
                progress={progress}
                initialRealmId={activeRealmId}
                autoOpenSheet={openRealmSheetOnArrival}
                updatedSetIds={updatedSyncSetIds}
                onAutoOpenHandled={() => setOpenRealmSheetOnArrival(false)}
                onBack={() =>
                  backStack.goBackTo(returnToLog ? 'log' : 'modes', {
                    replaceIfFallback: true,
                  })
                }
                backLabel={returnToLog ? 'العودة إلى السجل' : 'العودة لأنماط اللعبة'}
                onSelectRealm={setActiveRealmId}
                onSelectLevel={(realmId, setId) =>
                  handleStartLevelDirectly(realmId, setId, 'realms')
                }
                onReplayCompletedSet={handleReplaySpecificSet}
                onReviewCompletedSet={(realmId, setId) =>
                  handleReviewCompletedSet(realmId, setId, 'realms')
                }
                onViewSetInLog={(realmId, setId) => handleViewSetInLog(realmId, setId)}
                onOpenSyncModal={() => setAppModal('sync')}
                onTapFeedback={playTapFeedback}
                motionEnabled={effectiveMotion}
                transitionClassName={screenTransitionClass}
              />
            );
          })()}

          {screen === 'question' &&
            (progress.role === 'husband' ||
              !currentSetSummary.isCompleted ||
              isQuestionSessionActive ||
              isSelfReviewSession) && (
              <QuestionScreen
                key={`${activeSet.id}-${progress.role}-${isSelfReviewSession ? 'review' : 'play'}`}
                realm={activeRealm}
                set={activeSet}
                savedAnswers={viewProgress.answersBySet[activeSet.id] ?? {}}
                initialQuestionIndex={roundStartQuestionIndex}
                isSelfReview={isSelfReviewSession && progress.role !== 'husband'}
                externalLeaveRequest={questionLeaveRequest}
                onClearExternalLeaveRequest={() => setQuestionLeaveRequest(null)}
                onUnsavedSelectionChange={(dirty) => {
                  hasUnsavedQuestionRef.current = dirty;
                }}
                onTransitioningChange={setIsQuestionTransitioning}
                partnerView={
                  progress.role === 'husband'
                    ? {
                        partnerName: progress.partnerSnapshot.partnerName,
                        partnerAnswers:
                          progress.partnerSnapshot.answersBySet[activeSet.id] ?? {},
                      }
                    : undefined
                }
                onConfirmAnswer={handleConfirmQuestion}
                onCelebrateLevelComplete={() =>
                  nocturnalAudio.playComplete(progress.settings.soundEnabled)
                }
                onGoToLog={() => handleViewSetInLog(activeRealm.id, activeSet.id)}
                onDiscussInChat={handleDiscussInChat}
                onCompleteSet={handleCompleteSet}
                onExitRound={() => {
                  playTapFeedback();
                  setIsQuestionTransitioning(false);
                  setIsQuestionSessionActive(false);
                  setIsSelfReviewSession(false);
                  backStack.goBackTo(questionReturnScreen, { replaceIfFallback: true });
                }}
                onSelectSound={(added) => {
                  triggerHaptic();
                  if (added) {
                    nocturnalAudio.playSelect(progress.settings.soundEnabled);
                  } else {
                    nocturnalAudio.playDeselect(progress.settings.soundEnabled);
                  }
                }}
                onConfirmSound={() =>
                  nocturnalAudio.playConfirm(progress.settings.soundEnabled)
                }
                motionEnabled={effectiveMotion}
                transitionClassName={screenTransitionClass}
              />
            )}

          {(screen === 'completion' ||
            (screen === 'question' &&
              progress.role !== 'husband' &&
              currentSetSummary.isCompleted &&
              !isQuestionSessionActive &&
              !isSelfReviewSession)) && (
            <CompletionScreen
              realm={activeRealm}
              set={activeSet}
              setSummary={currentSetSummary}
              realmSummary={currentRealmSummary}
              nextSetInRealm={nextSetInRealm}
              nextIncompleteRealm={nextIncompleteRealm}
              role={progress.role}
              partnerName={progress.partnerSnapshot.partnerName}
              readOnlyReview={isSelfReviewSession && progress.role !== 'husband'}
              returnScreen={questionReturnScreen}
              onReplaySet={handleReplaySet}
              onViewInLog={() => handleViewSetInLog(activeRealm.id, activeSet.id)}
              onStartNextSet={handleStartNextSet}
              onStartNextRealm={handleStartNextRealm}
              onBackToRealms={() => {
                playTapFeedback();
                setIsSelfReviewSession(false);
                backStack.goBackTo('realms', { replaceIfFallback: true });
              }}
              onBackToOrigin={() => {
                playTapFeedback();
                setIsSelfReviewSession(false);
                backStack.goBackTo(questionReturnScreen, { replaceIfFallback: true });
              }}
              motionEnabled={effectiveMotion}
              transitionClassName={screenTransitionClass}
            />
          )}

          {screen === 'log' && (
            <LogScreen
              realms={GAME_REALMS}
              modes={GAME_MODES}
              progress={progress}
              initialRealmId={logInitialSetId ? activeRealmId : undefined}
              initialSetId={logInitialSetId}
              updatedSetIds={updatedSyncSetIds}
              onMarkSetSeen={clearUpdatedSyncSetId}
              onResetSet={(setId) => {
                nocturnalAudio.playDeselect(progress.settings.soundEnabled);
                triggerHaptic();
                const nextUpdatedAt = getNextMonotonicQuestionTimestamp(
                  progressRef.current.modeProgress.questions.updatedAt
                );
                clearQuestionDraftsForSet(setId);
                setProgress((prev) => resetSetProgress(prev, setId, nextUpdatedAt));
                cloud.markCloudUploadPending();
                if (
                  progressRef.current.role === 'wife' &&
                  nearby.busRef.current?.getState().status === 'connected'
                ) {
                  void nearby.busRef.current.emitLiveEvent({
                    type: 'SET_RESET_LIVE',
                    setId,
                    updatedAt: nextUpdatedAt,
                  });
                }
              }}
              onEditSet={(realmId, setId) => {
                clearUpdatedSyncSetId(setId);
                setActiveRealmId(realmId);
                setLogInitialSetId(setId);
                const realm = REALM_BY_ID.get(realmId) ?? GAME_REALMS[0];
                const setEntry = SET_LOOKUP.get(setId);
                const targetSet =
                  setEntry && setEntry.realm.id === realm.id ? setEntry.set : realm.sets[0];
                if (
                  progress.role !== 'husband' &&
                  getSetProgress(progress, targetSet).isCompleted
                ) {
                  handleReviewCompletedSet(realmId, setId, 'log');
                } else {
                  handleStartLevelDirectly(realmId, setId, 'log');
                }
              }}
              onDiscussInChat={handleDiscussInChat}
              onExploreRealms={() => backStack.navigateTo('realms')}
              onOpenSyncModal={() => setAppModal('sync')}
              onTapFeedback={playTapFeedback}
              motionEnabled={effectiveMotion}
              transitionClassName={screenTransitionClass}
            />
          )}

          {screen === 'profile' && (
            <ProfileScreen
              modes={GAME_MODES}
              realms={GAME_REALMS}
              progress={progress}
              busStatus={nearby.busState.status}
              connectionStatus={connectionStatus}
              pinEnabled={privacy.securityConfig.pinEnabled}
              lockOnBackground={privacy.securityConfig.lockOnBackground}
              isSettingsOpen={appModal === 'settings'}
              isPinModalOpen={privacy.pinModalMode !== null}
              onOpenSettings={() => setAppModal('settings')}
              onCloseSettings={() => setAppModal('none')}
              onUpdateName={(name) => {
                nocturnalAudio.playConfirm(progress.settings.soundEnabled);
                triggerHaptic();
                setProgress((prev) => {
                  const nextUpdatedAt =
                    prev.role === 'wife'
                      ? getNextMonotonicQuestionTimestamp(prev.modeProgress.questions.updatedAt)
                      : prev.modeProgress.questions.updatedAt;
                  return {
                    ...prev,
                    playerName: name,
                    modeProgress:
                      prev.role === 'wife'
                        ? {
                            ...prev.modeProgress,
                            questions: {
                              ...prev.modeProgress.questions,
                              updatedAt: nextUpdatedAt,
                            },
                          }
                        : prev.modeProgress,
                  };
                });
                cloud.markCloudUploadPending();
                window.setTimeout(() => {
                  void nearby.busRef.current?.sendHelloNow();
                }, 0);
              }}
              onToggleSetting={handleToggleSetting}
              onSwitchRole={handleSwitchDeviceRole}
              onOpenPinSetup={(mode) => privacy.setPinModalMode(mode)}
              onToggleLockOnBackground={privacy.toggleLockOnBackground}
              onLockNow={privacy.lockAppCleanly}
              onResetAllProgress={handleResetAll}
              onOpenLog={() => {
                setLogInitialSetId(null);
                backStack.navigateTo('log', { replace: true, logSetId: null });
              }}
              onOpenSyncModal={() => setAppModal('sync')}
              onTapFeedback={playTapFeedback}
              motionEnabled={effectiveMotion}
              transitionClassName={screenTransitionClass}
            />
          )}

          {screen === 'chat' && (
            <ChatRoomScreen
              progress={progress}
              messages={chatStore.messages}
              nearbyStatus={nearby.busState.status}
              nearbyPeerName={nearby.busState.peerName}
              cloudStatus={cloud.cloudStatus}
              isCloudLinked={cloud.isCloudVaultLinked}
              cloudPartnerJoined={cloud.cloudPartnerJoined}
              cloudAutoSyncEnabled={progress.settings.cloudAutoSyncEnabled}
              isOnline={cloud.isOnline}
              draftValue={chatDraft}
              onDraftChange={setChatDraft}
              prefillDraft={chatDraftPrefill}
              failedCloudChatIds={cloud.failedCloudChatIds}
              onRetryCloudMessage={cloud.handleRetryCloudChatMessage}
              onPrefillConsumed={() => setChatDraftPrefill(null)}
              onSendMessage={handleSendChatMessage}
              onClearChat={handleClearChat}
              onOpenSyncModal={() => setAppModal('sync')}
              onTapFeedback={playTapFeedback}
              motionEnabled={effectiveMotion}
              transitionClassName={screenTransitionClass}
            />
          )}
        </Suspense>

        {(screen === 'modes' ||
          screen === 'realms' ||
          screen === 'chat' ||
          screen === 'log' ||
          screen === 'profile') && (
          <BottomNavDock
            activeScreen={screen}
            accentHex={accentHex}
            unreadChatCount={unreadChatCount}
            motionEnabled={effectiveMotion}
            onGoHome={() => {
              playTapFeedback();
              backStack.goBackTo('home', { replaceIfFallback: true });
            }}
            onOpenModes={() => {
              playTapFeedback();
              backStack.navigateTo('modes', { replace: isRootTabScreen });
            }}
            onOpenChat={() => {
              playTapFeedback();
              backStack.navigateTo('chat', { replace: isRootTabScreen });
            }}
            onOpenLog={() => {
              playTapFeedback();
              setLogInitialSetId(null);
              backStack.navigateTo('log', { replace: isRootTabScreen, logSetId: null });
            }}
            onOpenProfile={() => {
              playTapFeedback();
              backStack.navigateTo('profile', { replace: isRootTabScreen });
            }}
          />
        )}

        {nearby.busRef.current && (hasOpenedSyncModal || appModal === 'sync') && (
          <Suspense
            fallback={
              appModal === 'sync' ? (
                <SyncModalLoadingFallback motionEnabled={effectiveMotion} />
              ) : null
            }
          >
            <PartnerSyncModal
              isOpen={appModal === 'sync'}
              skipBackOverlay
              progress={progress}
              busState={nearby.busState}
              nearbyPeers={nearby.nearbyPeers}
              pendingPairingRequest={nearby.pendingPairingRequest}
              isStartingNearby={nearby.isStartingNearby}
              connectingEndpointId={nearby.connectingEndpointId}
              nearbyError={nearby.nearbyError}
              onClearNearbyError={nearby.clearNearbyError}
              cloudUserEmail={cloud.cloudUser?.email ?? null}
              cloudUserName={cloud.cloudUser?.displayName ?? null}
              cloudState={cloud.cloudState}
              cloudStatus={cloud.cloudStatus}
              cloudPartnerJoined={cloud.cloudPartnerJoined}
              cloudError={cloud.cloudError}
              onClearCloudError={cloud.clearCloudError}
              cloudNotice={cloud.cloudNotice}
              serverExistingVaultId={cloud.serverExistingVaultId}
              initialInviteCode={cloud.pendingInviteCode}
              isOnline={cloud.isOnline}
              onStartNearbyDiscovery={nearby.handleStartNearbyDiscovery}
              onPairNearbyPeer={nearby.handlePairNearbyPeer}
              onAcceptPairing={nearby.handleAcceptPairing}
              onRejectPairing={nearby.handleRejectPairing}
              onUnpinPartnerDevice={nearby.handleUnpinPartnerDevice}
              onDismissCloudNotice={cloud.handleDismissCloudNotice}
              onManualSyncNow={() => {
                const bus = nearby.busRef.current;
                if (!bus) return Promise.resolve(false);
                return progressRef.current.role === 'wife'
                  ? bus.sendSnapshotNow()
                  : bus.sendHelloNow();
              }}
              onDisconnect={nearby.handleDisconnectNearby}
              onCloudSignIn={cloud.handleCloudSignIn}
              onCloudSignOut={cloud.handleCloudSignOut}
              onCreateCloudVault={cloud.handleCreateCloudVault}
              onJoinCloudVault={cloud.handleJoinCloudVault}
              onSwitchCloudVault={cloud.handleSwitchCloudVault}
              hasVaultAccountMismatch={cloud.hasVaultAccountMismatch}
              onClearMismatchedLocalVault={cloud.handleClearMismatchedLocalVault}
              onCloudSyncNow={cloud.handleCloudSyncNow}
              onUnlinkCloudVault={cloud.handleUnlinkCloudVault}
              onDismissPendingInvite={cloud.handleDismissPendingInvite}
              onOpenChat={() => {
                setAppModal('none');
                const goChat = () => {
                  setIsQuestionSessionActive(false);
                  setIsSelfReviewSession(false);
                  backStack.navigateTo('chat', { collapseToRoot: true });
                };
                window.setTimeout(() => {
                  if (screenRef.current === 'question' && hasUnsavedQuestionRef.current) {
                    setQuestionLeaveRequest({
                      nonce: Date.now(),
                      onConfirmLeave: goChat,
                    });
                    return;
                  }
                  goChat();
                }, 35);
              }}
              onClose={() => setAppModal('none')}
              onTapFeedback={playTapFeedback}
              motionEnabled={effectiveMotion}
            />
          </Suspense>
        )}

        <PinSetupModal
          isOpen={privacy.pinModalMode !== null}
          mode={privacy.pinModalMode ?? 'create'}
          role={progress.role}
          verifyCurrentPin={privacy.verifyCurrentPin}
          onSaveNewPin={privacy.saveNewPin}
          onDisablePin={privacy.disablePin}
          onClose={() => privacy.setPinModalMode(null)}
          motionEnabled={effectiveMotion}
        />

        {privacy.isLocked && privacy.securityConfig.pinEnabled && (
          <PrivacyLockScreen
            role={progress.role}
            playerName={progress.playerName}
            lockoutRemainingMs={privacy.lockoutRemainingMs}
            onSubmitPin={privacy.handleSubmitPinUnlock}
            onForgotPinWipeAll={handleForgotPinWipeAll}
            motionEnabled={effectiveMotion}
          />
        )}

        {privacy.isAppInBackground && progress.settings.privacyCurtainEnabled && (
          <PrivacyCurtainOverlay motionEnabled={effectiveMotion} />
        )}
      </PhoneStage>
    </BackNavigationProvider>
  );
}
