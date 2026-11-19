import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { GAME_REALMS } from '../data/gameData';
import type { GameRealm, ScreenId } from '../data/types';
import { registerCapacitorBackButton } from '../sync/capacitorBridge';
import {
  computeBatchOverlayPopCount,
  computeCollapseToHomeDelta,
  findBackDelta,
  getImmediateParentScreen,
  type AppHistoryEntry,
  type BackNavigationApi,
  type OverlayRecord,
} from '../utils/backNavigation';

const VALID_SCREENS: ReadonlySet<ScreenId> = new Set([
  'home',
  'modes',
  'realms',
  'question',
  'completion',
  'chat',
  'log',
  'profile',
]);

export interface NavigateOptions {
  replace?: boolean;
  collapseToRoot?: boolean;
  realmId?: string;
  setId?: string;
  logSetId?: string | null;
  questionReturnScreen?: ScreenId;
}

interface UseBackStackParams {
  screen: ScreenId;
  setScreen: Dispatch<SetStateAction<ScreenId>>;
  screenRef: MutableRefObject<ScreenId>;
  activeRealmId: string;
  activeSetId: string;
  logInitialSetId: string | null;
  questionReturnScreen: ScreenId;
  setActiveRealmId: Dispatch<SetStateAction<string>>;
  setActiveSetId: Dispatch<SetStateAction<string>>;
  setLogInitialSetId: Dispatch<SetStateAction<string | null>>;
  setQuestionReturnScreen: Dispatch<SetStateAction<ScreenId>>;
  setIsQuestionSessionActive: Dispatch<SetStateAction<boolean>>;
  setIsQuestionTransitioning: Dispatch<SetStateAction<boolean>>;
  setIsSelfReviewSession: Dispatch<SetStateAction<boolean>>;
  appModal: 'none' | 'settings' | 'sync';
  setAppModal: Dispatch<SetStateAction<'none' | 'settings' | 'sync'>>;
  isLockedRef: MutableRefObject<boolean>;
  roleConfiguredRef: MutableRefObject<boolean>;
  realmById: ReadonlyMap<string, GameRealm>;
}

export function useBackStack({
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
  isLockedRef,
  roleConfiguredRef,
  realmById,
}: UseBackStackParams) {
  const seqRef = useRef<number>(1);
  const stackRef = useRef<AppHistoryEntry[]>([]);
  const activeOverlaysRef = useRef<Map<string, OverlayRecord>>(new Map());
  const pendingOverlayPopsRef = useRef<Set<number>>(new Set());
  const overlayPopScheduledRef = useRef<boolean>(false);
  const pendingHistorySyncRef = useRef<{
    mode: 'replace' | 'push-after-home';
    entry: AppHistoryEntry;
  } | null>(null);

  const contextMetaRef = useRef({
    realmId: activeRealmId,
    setId: activeSetId,
    logSetId: logInitialSetId,
    questionReturnScreen,
  });
  contextMetaRef.current = {
    realmId: activeRealmId,
    setId: activeSetId,
    logSetId: logInitialSetId,
    questionReturnScreen,
  };

  // Native Capacitor hardware Back-button bridge (no-op in browser)
  useEffect(() => {
    return registerCapacitorBackButton(
      () =>
        isLockedRef.current ||
        !roleConfiguredRef.current ||
        stackRef.current.length > 1 ||
        activeOverlaysRef.current.size > 0
    );
  }, [isLockedRef, roleConfiguredRef]);

  // Mirror screen state onto document.body.dataset.state for predictable state inspection
  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  // Keep current non-overlay history snapshot synced with selected realm/set context
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history) return;
    const top = stackRef.current[stackRef.current.length - 1];
    if (!top || top.overlayId || top.screen !== screen) return;
    const updated: AppHistoryEntry = {
      ...top,
      realmId: activeRealmId,
      setId: activeSetId,
      logSetId: logInitialSetId,
      questionReturnScreen,
    };
    stackRef.current[stackRef.current.length - 1] = updated;
    try {
      window.history.replaceState(updated, '');
    } catch {
      // Ignore restricted history environments
    }
  }, [screen, activeRealmId, activeSetId, logInitialSetId, questionReturnScreen]);

  // Sync browser history stack for mobile hardware / browser Back & Forward buttons
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history) return;

    if (stackRef.current.length === 0) {
      if (screenRef.current === 'modes') {
        const homeEntry: AppHistoryEntry = {
          seq: 1,
          screen: 'home',
          realmId: contextMetaRef.current.realmId,
          setId: contextMetaRef.current.setId,
          logSetId: contextMetaRef.current.logSetId,
          questionReturnScreen: contextMetaRef.current.questionReturnScreen,
        };
        const modesEntry: AppHistoryEntry = {
          ...homeEntry,
          seq: 2,
          screen: 'modes',
        };
        seqRef.current = 2;
        stackRef.current = [homeEntry, modesEntry];
        try {
          window.history.replaceState(homeEntry, '');
          window.history.pushState(modesEntry, '');
        } catch {
          // Ignore restricted history environments
        }
      } else {
        const initialEntry: AppHistoryEntry = {
          seq: 1,
          screen: screenRef.current,
          realmId: contextMetaRef.current.realmId,
          setId: contextMetaRef.current.setId,
          logSetId: contextMetaRef.current.logSetId,
          questionReturnScreen: contextMetaRef.current.questionReturnScreen,
        };
        seqRef.current = 1;
        stackRef.current = [initialEntry];
        try {
          window.history.replaceState(initialEntry, '');
        } catch {
          // Ignore restricted history environments
        }
      }
    }

    const onPopState = (event: PopStateEvent) => {
      if (pendingHistorySyncRef.current) {
        const sync = pendingHistorySyncRef.current;
        pendingHistorySyncRef.current = null;
        try {
          if (sync.mode === 'replace') {
            window.history.replaceState(sync.entry, '');
          } else {
            window.history.pushState(sync.entry, '');
          }
        } catch {
          // Ignore restricted history environments
        }
        return;
      }

      if (isLockedRef.current || !roleConfiguredRef.current) {
        const currentTop = stackRef.current[stackRef.current.length - 1];
        if (currentTop) {
          try {
            window.history.pushState(currentTop, '');
          } catch {
            // Ignore restricted history environments
          }
        }
        return;
      }

      const incoming = (event.state ?? null) as Partial<AppHistoryEntry> | null;
      const targetScreen = incoming?.screen;
      const resolved: ScreenId =
        targetScreen && VALID_SCREENS.has(targetScreen) ? targetScreen : 'home';

      let targetSeq = 0;
      if (typeof incoming?.seq === 'number') {
        const idx = stackRef.current.findIndex((entry) => entry.seq === incoming.seq);
        if (idx >= 0) {
          stackRef.current = stackRef.current.slice(0, idx + 1);
          targetSeq = incoming.seq;
        } else {
          targetSeq = incoming.seq;
          if (incoming.seq > seqRef.current) {
            seqRef.current = incoming.seq;
          }
          stackRef.current = [
            {
              seq: targetSeq,
              screen: resolved,
              realmId: incoming.realmId ?? contextMetaRef.current.realmId,
              setId: incoming.setId ?? contextMetaRef.current.setId,
              logSetId:
                incoming.logSetId !== undefined
                  ? incoming.logSetId
                  : contextMetaRef.current.logSetId,
              questionReturnScreen:
                incoming.questionReturnScreen ?? contextMetaRef.current.questionReturnScreen,
              overlayId: incoming.overlayId,
            },
          ];
        }
      } else {
        targetSeq = 0;
        stackRef.current = [
          {
            seq: 0,
            screen: resolved,
            realmId: contextMetaRef.current.realmId,
            setId: contextMetaRef.current.setId,
            logSetId: contextMetaRef.current.logSetId,
            questionReturnScreen: contextMetaRef.current.questionReturnScreen,
          },
        ];
      }

      const overlaysToClose: OverlayRecord[] = [];
      for (const [, record] of activeOverlaysRef.current) {
        if (record.seq > targetSeq) {
          record.consumed = true;
          overlaysToClose.push(record);
        }
      }
      for (const record of overlaysToClose) {
        record.onClose();
      }

      if (incoming?.realmId && realmById.has(incoming.realmId)) {
        setActiveRealmId(incoming.realmId);
      }
      if (incoming?.setId) {
        setActiveSetId(incoming.setId);
      }
      if (incoming && 'logSetId' in incoming) {
        setLogInitialSetId(incoming.logSetId ?? null);
      }
      if (incoming?.questionReturnScreen && VALID_SCREENS.has(incoming.questionReturnScreen)) {
        setQuestionReturnScreen(incoming.questionReturnScreen);
      }

      if (resolved !== 'question') {
        setIsQuestionSessionActive(false);
        setIsQuestionTransitioning(false);
        if (resolved !== 'completion') {
          setIsSelfReviewSession(false);
        }
      }
      screenRef.current = resolved;
      setScreen(resolved);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [
    isLockedRef,
    realmById,
    roleConfiguredRef,
    screenRef,
    setActiveRealmId,
    setActiveSetId,
    setIsQuestionSessionActive,
    setIsQuestionTransitioning,
    setIsSelfReviewSession,
    setLogInitialSetId,
    setQuestionReturnScreen,
    setScreen,
  ]);

  const scheduleOverlayCleanupPop = useCallback((record: OverlayRecord) => {
    if (record.consumed) return;
    pendingOverlayPopsRef.current.add(record.seq);
    if (overlayPopScheduledRef.current) return;
    overlayPopScheduledRef.current = true;
    queueMicrotask(() => {
      overlayPopScheduledRef.current = false;
      const seqsToPop = pendingOverlayPopsRef.current;
      pendingOverlayPopsRef.current = new Set();
      if (seqsToPop.size === 0 || typeof window === 'undefined' || !window.history) {
        return;
      }
      const popCount = computeBatchOverlayPopCount(stackRef.current, seqsToPop);
      if (popCount <= 0) return;
      try {
        window.history.go(-popCount);
      } catch {
        // Ignore restricted history environments
      }
    });
  }, []);

  const registerOverlay = useCallback((overlayId: string, onClose: () => void) => {
    const existing = activeOverlaysRef.current.get(overlayId);
    if (existing && !existing.consumed) {
      existing.onClose = onClose;
      return () => {
        const cur = activeOverlaysRef.current.get(overlayId);
        if (!cur) return;
        activeOverlaysRef.current.delete(overlayId);
        scheduleOverlayCleanupPop(cur);
      };
    }

    const seq = ++seqRef.current;
    const baseEntry = stackRef.current[stackRef.current.length - 1];
    const overlayEntry: AppHistoryEntry = {
      seq,
      screen: screenRef.current,
      realmId: baseEntry?.realmId ?? contextMetaRef.current.realmId,
      setId: baseEntry?.setId ?? contextMetaRef.current.setId,
      logSetId:
        baseEntry && 'logSetId' in baseEntry
          ? baseEntry.logSetId
          : contextMetaRef.current.logSetId,
      questionReturnScreen:
        baseEntry?.questionReturnScreen ?? contextMetaRef.current.questionReturnScreen,
      overlayId,
    };

    stackRef.current.push(overlayEntry);
    activeOverlaysRef.current.set(overlayId, { seq, onClose, consumed: false });

    if (typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState(overlayEntry, '');
      } catch {
        // Ignore restricted history environments
      }
    }

    return () => {
      const record = activeOverlaysRef.current.get(overlayId);
      if (!record) return;
      activeOverlaysRef.current.delete(overlayId);
      scheduleOverlayCleanupPop(record);
    };
  }, [scheduleOverlayCleanupPop, screenRef]);

  const backNavApi = useMemo<BackNavigationApi>(() => ({ registerOverlay }), [registerOverlay]);

  const isAnyAppModalOpen = appModal !== 'none';
  useEffect(() => {
    if (!isAnyAppModalOpen) return;
    return registerOverlay('app-modal', () => setAppModal('none'));
  }, [isAnyAppModalOpen, registerOverlay, setAppModal]);

  const navigateTo = useCallback(
    (nextScreen: ScreenId, options?: NavigateOptions) => {
      if (nextScreen !== 'question') {
        setIsQuestionSessionActive(false);
        setIsQuestionTransitioning(false);
        if (nextScreen !== 'completion') {
          setIsSelfReviewSession(false);
        }
      }

      let trailingOverlayCount = 0;
      for (let i = stackRef.current.length - 1; i >= 0; i -= 1) {
        if (stackRef.current[i]?.overlayId) {
          trailingOverlayCount += 1;
        } else {
          break;
        }
      }

      if (options?.collapseToRoot && stackRef.current[0]?.screen === 'home') {
        for (const [, record] of activeOverlaysRef.current) {
          record.consumed = true;
        }
        const homeBaseEntry: AppHistoryEntry = {
          ...stackRef.current[0],
          screen: 'home',
        };
        const targetEntry: AppHistoryEntry = {
          seq: ++seqRef.current,
          screen: nextScreen,
          realmId: options.realmId ?? contextMetaRef.current.realmId,
          setId: options.setId ?? contextMetaRef.current.setId,
          logSetId:
            'logSetId' in options ? options.logSetId : contextMetaRef.current.logSetId,
          questionReturnScreen:
            options.questionReturnScreen ?? contextMetaRef.current.questionReturnScreen,
        };

        const collapseDelta = computeCollapseToHomeDelta(stackRef.current);
        const isSimpleSecondSlot =
          stackRef.current.length === 2 && !stackRef.current[1]?.overlayId;

        stackRef.current = [homeBaseEntry, targetEntry];

        if (typeof window !== 'undefined' && window.history) {
          try {
            if (collapseDelta === 0) {
              window.history.pushState(targetEntry, '');
            } else if (isSimpleSecondSlot) {
              window.history.replaceState(targetEntry, '');
            } else {
              pendingHistorySyncRef.current = {
                mode: 'push-after-home',
                entry: targetEntry,
              };
              window.history.go(collapseDelta);
            }
          } catch {
            // Ignore restricted history environments
          }
        }

        screenRef.current = nextScreen;
        setScreen(nextScreen);
        return;
      }

      if (screenRef.current === nextScreen && trailingOverlayCount === 0) {
        return;
      }

      for (const [, record] of activeOverlaysRef.current) {
        record.consumed = true;
      }

      const useReplace = Boolean(options?.replace) || trailingOverlayCount > 0;
      const topEntry = stackRef.current[stackRef.current.length - 1];
      const nextSeq = useReplace && topEntry ? topEntry.seq : ++seqRef.current;

      const nextEntry: AppHistoryEntry = {
        seq: nextSeq,
        screen: nextScreen,
        realmId: options?.realmId ?? contextMetaRef.current.realmId,
        setId: options?.setId ?? contextMetaRef.current.setId,
        logSetId:
          options && 'logSetId' in options
            ? options.logSetId
            : contextMetaRef.current.logSetId,
        questionReturnScreen:
          options?.questionReturnScreen ?? contextMetaRef.current.questionReturnScreen,
      };

      if (trailingOverlayCount > 0) {
        stackRef.current.splice(
          stackRef.current.length - trailingOverlayCount,
          trailingOverlayCount
        );
      }
      if (options?.replace && stackRef.current.length > 0) {
        stackRef.current[stackRef.current.length - 1] = nextEntry;
      } else {
        stackRef.current.push(nextEntry);
      }

      if (typeof window !== 'undefined' && window.history) {
        try {
          if (trailingOverlayCount > 0 && options?.replace) {
            pendingHistorySyncRef.current = { mode: 'replace', entry: nextEntry };
            window.history.go(-trailingOverlayCount);
          } else if (trailingOverlayCount > 1 && !options?.replace) {
            pendingHistorySyncRef.current = { mode: 'replace', entry: nextEntry };
            window.history.go(-(trailingOverlayCount - 1));
          } else if (useReplace) {
            window.history.replaceState(nextEntry, '');
          } else {
            window.history.pushState(nextEntry, '');
          }
        } catch {
          // Ignore restricted history environments
        }
      }

      screenRef.current = nextScreen;
      setScreen(nextScreen);
    },
    [
      screenRef,
      setIsQuestionSessionActive,
      setIsQuestionTransitioning,
      setIsSelfReviewSession,
      setScreen,
    ]
  );

  const goBackTo = useCallback(
    (fallbackScreen: ScreenId, options?: { replaceIfFallback?: boolean }) => {
      const delta = findBackDelta(stackRef.current, fallbackScreen);
      if (delta < 0 && typeof window !== 'undefined' && window.history) {
        for (const [, record] of activeOverlaysRef.current) {
          record.consumed = true;
        }
        try {
          window.history.go(delta);
          return;
        } catch {
          // Fall through to direct navigation
        }
      }
      navigateTo(fallbackScreen, { replace: options?.replaceIfFallback });
    },
    [navigateTo]
  );

  const getParentScreen = useCallback(
    () => getImmediateParentScreen(stackRef.current),
    []
  );

  const collapseOverlaysOnLock = useCallback(() => {
    if (typeof window !== 'undefined' && window.history && stackRef.current.length > 0) {
      let overlayCount = 0;
      for (let i = stackRef.current.length - 1; i >= 0; i -= 1) {
        if (stackRef.current[i]?.overlayId) {
          overlayCount += 1;
        } else {
          break;
        }
      }
      for (const [, record] of activeOverlaysRef.current) {
        record.consumed = true;
        record.onClose();
      }
      activeOverlaysRef.current.clear();
      if (overlayCount > 0) {
        const baseEntry =
          stackRef.current[stackRef.current.length - 1 - overlayCount] ?? stackRef.current[0];
        stackRef.current.splice(stackRef.current.length - overlayCount, overlayCount);
        if (baseEntry) {
          pendingHistorySyncRef.current = { mode: 'replace', entry: baseEntry };
          try {
            window.history.go(-overlayCount);
          } catch {
            // Ignore restricted history environments
          }
        }
      }
    } else {
      for (const [, record] of activeOverlaysRef.current) {
        record.consumed = true;
        record.onClose();
      }
      activeOverlaysRef.current.clear();
    }
  }, []);

  const resetStackToHome = useCallback(() => {
    const homeEntry: AppHistoryEntry = {
      seq: 1,
      screen: 'home',
      realmId: GAME_REALMS[0].id,
      setId: GAME_REALMS[0].sets[0].id,
      logSetId: null,
      questionReturnScreen: 'realms',
    };
    activeOverlaysRef.current.clear();
    pendingHistorySyncRef.current = null;
    seqRef.current = 1;
    stackRef.current = [homeEntry];
    if (typeof window !== 'undefined' && window.history) {
      try {
        window.history.replaceState(homeEntry, '');
      } catch {
        // Ignore restricted history environments
      }
    }
  }, []);

  return {
    backNavApi,
    navigateTo,
    goBackTo,
    getParentScreen,
    collapseOverlaysOnLock,
    resetStackToHome,
  };
}
