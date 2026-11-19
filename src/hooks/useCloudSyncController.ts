import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import type { DeviceRole, GameProgress, ScreenId } from '../data/types';
import {
  applyIncomingPartnerSnapshot,
  shouldAcceptPartnerSnapshotUpdate,
} from '../game/engine';
import { auth, googleProvider } from '../firebase';
import {
  getCapacitorLaunchUrl,
  isCapacitorNative,
  registerCapacitorAppUrlOpenListener,
} from '../sync/capacitorBridge';
import {
  clearCloudChatMessages,
  createCoupleCloudVault,
  deleteUserCloudProfile,
  ensureUserCloudProfile,
  fetchCoupleCloudVaultSnapshot,
  joinCoupleCloudVault,
  pushEncryptedChatMessageToCloud,
  pushEncryptedSnapshotToCloud,
  subscribeToCloudChatMessages,
  subscribeToCoupleCloudVault,
  unlinkCoupleCloudVault,
  type CloudSyncStatus,
} from '../sync/cloudSync';
import {
  clearPendingCloudClearWatermark,
  markChatMessageDelivered,
  mergeIncomingChatMessagesBatch,
  type LocalChatStore,
} from '../utils/chatStorage';
import {
  clearCloudSyncState,
  createInitialCloudSyncState,
  extractInviteCodeFromUrl,
  loadCloudSyncState,
  parseCloudInviteCode,
  saveCloudSyncState,
  type LocalCloudSyncState,
} from '../utils/cloudCrypto';
import { formatCloudErrorMessage } from '../utils/cloudErrors';

interface UseCloudSyncControllerParams {
  progress: GameProgress;
  setProgress: Dispatch<SetStateAction<GameProgress>>;
  progressRef: MutableRefObject<GameProgress>;
  screenRef: MutableRefObject<ScreenId>;
  isLocked: boolean;
  chatStore: LocalChatStore;
  setChatStore: Dispatch<SetStateAction<LocalChatStore>>;
  chatStoreRef: MutableRefObject<LocalChatStore>;
  setUnreadChatCount: Dispatch<SetStateAction<number>>;
  markUpdatedSetsFromDiff: (
    prevAnswers: Record<string, Record<string, string[]>>,
    nextAnswers: Record<string, Record<string, string[]>>
  ) => void;
  setAppModal: Dispatch<SetStateAction<'none' | 'settings' | 'sync'>>;
  onIncomingChatNotification?: (count: number) => void;
  onPartnerJoined?: () => void;
  onActionFeedback?: (
    message: string,
    tone: 'success' | 'info' | 'warning' | 'error'
  ) => void;
}

function extractInviteCodeFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  return extractInviteCodeFromUrl(window.location.href);
}

function scrubInviteFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanUrl = new URL(window.location.href);
    let dirty = false;

    if (cleanUrl.searchParams.has('joinVault')) {
      cleanUrl.searchParams.delete('joinVault');
      dirty = true;
    }

    if (cleanUrl.hash && cleanUrl.hash.includes('joinVault=')) {
      const hashParams = new URLSearchParams(cleanUrl.hash.slice(1));
      if (hashParams.has('joinVault')) {
        hashParams.delete('joinVault');
        const nextHash = hashParams.toString();
        cleanUrl.hash = nextHash ? `#${nextHash}` : '';
        dirty = true;
      }
    }

    if (dirty) {
      window.history.replaceState(
        window.history.state,
        '',
        cleanUrl.pathname + cleanUrl.search + cleanUrl.hash
      );
    }
  } catch {
    // Ignore URL cleanup errors cleanly
  }
}

export function useCloudSyncController({
  progress,
  setProgress,
  progressRef,
  screenRef,
  isLocked,
  chatStore,
  setChatStore,
  chatStoreRef,
  setUnreadChatCount,
  markUpdatedSetsFromDiff,
  setAppModal,
  onIncomingChatNotification,
  onPartnerJoined,
  onActionFeedback,
}: UseCloudSyncControllerParams) {
  const [cloudUser, setCloudUser] = useState<User | null>(() => auth.currentUser);
  const [cloudState, setCloudState] = useState<LocalCloudSyncState>(() => loadCloudSyncState());
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(() =>
    auth.currentUser ? 'unlinked' : 'signed-out'
  );
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [serverExistingVaultId, setServerExistingVaultId] = useState<string | null>(null);
  const [cloudPartnerJoined, setCloudPartnerJoined] = useState<boolean>(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() =>
    extractInviteCodeFromLocation()
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [failedCloudChatIds, setFailedCloudChatIds] = useState<string[]>([]);

  const handledInviteAutoOpenRef = useRef<boolean>(false);
  const cloudInflightChatIdsRef = useRef<Set<string>>(new Set());
  const seenIncomingChatIdsRef = useRef<Set<string>>(new Set());
  const clearingCloudWatermarkRef = useRef<number | null>(null);
  const pendingProfileResetInflightRef = useRef<boolean>(false);
  const prevPartnerJoinedRef = useRef<boolean>(false);
  const vaultSnapshotInitializedRef = useRef<boolean>(false);
  const onIncomingChatNotificationRef = useRef(onIncomingChatNotification);
  onIncomingChatNotificationRef.current = onIncomingChatNotification;
  const onPartnerJoinedRef = useRef(onPartnerJoined);
  onPartnerJoinedRef.current = onPartnerJoined;
  const onActionFeedbackRef = useRef(onActionFeedback);
  onActionFeedbackRef.current = onActionFeedback;
  const cloudUserRef = useRef<User | null>(cloudUser);
  cloudUserRef.current = cloudUser;
  const cloudStateRef = useRef<LocalCloudSyncState>(cloudState);
  cloudStateRef.current = cloudState;
  const isOnlineRef = useRef<boolean>(isOnline);
  isOnlineRef.current = isOnline;

  const hasVaultAccountMismatch = Boolean(
    cloudUser &&
      cloudState.vaultId &&
      cloudState.accountUid &&
      cloudUser.uid !== cloudState.accountUid
  );
  const hasVaultAccountMismatchRef = useRef<boolean>(hasVaultAccountMismatch);
  hasVaultAccountMismatchRef.current = hasVaultAccountMismatch;

  const didMountCloudRef = useRef(false);
  const skipNextCloudPersistRef = useRef(false);

  useEffect(() => {
    if (!didMountCloudRef.current) {
      didMountCloudRef.current = true;
      return;
    }
    if (skipNextCloudPersistRef.current) {
      skipNextCloudPersistRef.current = false;
      return;
    }
    saveCloudSyncState(cloudState);
  }, [cloudState]);

  // Immediately scrub any #joinVault= / ?joinVault= secret from URL bar on boot or hash/deep-link navigation
  useEffect(() => {
    scrubInviteFromUrl();
    if (typeof window === 'undefined') return;

    const acceptIncomingUrl = (rawUrl: string) => {
      const incoming = extractInviteCodeFromUrl(rawUrl);
      if (incoming) {
        handledInviteAutoOpenRef.current = false;
        setPendingInviteCode(incoming);
        scrubInviteFromUrl();
      }
    };

    const onHashChange = () => {
      const incoming = extractInviteCodeFromLocation();
      if (incoming) {
        handledInviteAutoOpenRef.current = false;
        setPendingInviteCode(incoming);
        scrubInviteFromUrl();
      }
    };
    window.addEventListener('hashchange', onHashChange);

    void getCapacitorLaunchUrl().then((launchUrl) => {
      if (launchUrl) {
        acceptIncomingUrl(launchUrl);
      }
    });
    const unsubDeepLink = registerCapacitorAppUrlOpenListener(acceptIncomingUrl);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      unsubDeepLink();
    };
  }, []);

  const handleDismissPendingInvite = useCallback(() => {
    setPendingInviteCode(null);
    scrubInviteFromUrl();
  }, []);

  const handleDismissCloudNotice = useCallback(() => {
    setCloudNotice(null);
  }, []);

  const clearCloudError = useCallback(() => {
    setCloudError(null);
  }, []);

  // Auto-open PartnerSyncModal once when arriving via ?joinVault= invite link
  useEffect(() => {
    if (
      !pendingInviteCode ||
      handledInviteAutoOpenRef.current ||
      !progress.roleConfigured ||
      isLocked
    ) {
      return;
    }
    const parsedIncoming = parseCloudInviteCode(pendingInviteCode);
    if (parsedIncoming && cloudState.vaultId && parsedIncoming.vaultId === cloudState.vaultId) {
      handledInviteAutoOpenRef.current = true;
      handleDismissPendingInvite();
      return;
    }
    handledInviteAutoOpenRef.current = true;
    setAppModal('sync');
  }, [
    pendingInviteCode,
    progress.roleConfigured,
    isLocked,
    cloudState.vaultId,
    handleDismissPendingInvite,
    setAppModal,
  ]);

  const markCloudUploadPending = useCallback(() => {
    setCloudState((prev) => {
      if (!prev.vaultId || !prev.vaultKey || prev.pendingUpload) return prev;
      return { ...prev, pendingUpload: true };
    });
  }, []);

  // Track device internet connectivity
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncNetworkState = () => {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    };
    window.addEventListener('online', syncNetworkState);
    window.addEventListener('offline', syncNetworkState);
    return () => {
      window.removeEventListener('online', syncNetworkState);
      window.removeEventListener('offline', syncNetworkState);
    };
  }, []);

  // Listen to Firebase Auth state (including redirect fallback) & ensure user profile document
  useEffect(() => {
    void getRedirectResult(auth).catch((err) => {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      setCloudError(
        'تعذّر إتمام تسجيل الدخول بحساب Google بعد إعادة التوجيه؛ يرجى المحاولة مجدداً.'
      );
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCloudUser(user);
      if (!user) {
        setCloudStatus('signed-out');
        setCloudError(null);
        setServerExistingVaultId(null);
        seenIncomingChatIdsRef.current.clear();
        return;
      }
      const curCloud = cloudStateRef.current;
      const isAccountMismatch = Boolean(
        curCloud.vaultId && curCloud.accountUid && user.uid !== curCloud.accountUid
      );
      if (progressRef.current.roleConfigured && navigator.onLine) {
        void ensureUserCloudProfile(
          user,
          progressRef.current,
          isAccountMismatch ? null : curCloud.vaultId,
          { forceResetRole: curCloud.pendingProfileReset }
        )
          .then((resolvedVaultId) => {
            if (cloudStateRef.current.pendingProfileReset) {
              setCloudState((prev) =>
                prev.pendingProfileReset ? { ...prev, pendingProfileReset: false } : prev
              );
            }
            if (!cloudStateRef.current.vaultId && resolvedVaultId) {
              setServerExistingVaultId(resolvedVaultId);
            } else {
              setServerExistingVaultId(null);
            }
          })
          .catch((err) => {
            if (!navigator.onLine) return;
            const rawMsg = err instanceof Error ? err.message : String(err ?? '');
            const lower = rawMsg.toLowerCase();
            if (
              lower.includes('unavailable') ||
              lower.includes('offline') ||
              lower.includes('network')
            ) {
              return;
            }
            setCloudError(
              formatCloudErrorMessage(err, 'تعذّر التحقق من ملف المزامنة السحابية حالياً.')
            );
          });
      }
    });
    return unsubscribe;
  }, [progressRef]);

  // Automatically reconcile pendingProfileReset once an already-signed-in user regains internet
  useEffect(() => {
    if (
      !isOnline ||
      !cloudUser ||
      !cloudState.pendingProfileReset ||
      !progress.roleConfigured ||
      pendingProfileResetInflightRef.current
    ) {
      return;
    }
    pendingProfileResetInflightRef.current = true;
    const targetVaultId = hasVaultAccountMismatchRef.current ? null : cloudState.vaultId;
    void ensureUserCloudProfile(cloudUser, progressRef.current, targetVaultId, {
      forceResetRole: true,
    })
      .then((resolvedVaultId) => {
        setCloudState((prev) =>
          prev.pendingProfileReset ? { ...prev, pendingProfileReset: false } : prev
        );
        if (!cloudStateRef.current.vaultId && resolvedVaultId) {
          setServerExistingVaultId(resolvedVaultId);
        } else {
          setServerExistingVaultId(null);
        }
      })
      .catch(() => {
        // Keep pendingProfileReset true to retry on next reconnect/auth refresh
      })
      .finally(() => {
        pendingProfileResetInflightRef.current = false;
      });
  }, [
    isOnline,
    cloudUser,
    cloudState.pendingProfileReset,
    cloudState.vaultId,
    progress.roleConfigured,
    progressRef,
  ]);

  // Auto-upload local encrypted changes whenever internet connection is available
  useEffect(() => {
    if (!cloudUser) {
      setCloudStatus('signed-out');
      return;
    }
    if (!cloudState.vaultId || !cloudState.vaultKey || hasVaultAccountMismatch) {
      setCloudStatus('unlinked');
      return;
    }
    if (!progress.settings.cloudAutoSyncEnabled) {
      setCloudStatus(cloudState.pendingUpload ? 'offline-pending' : 'synced');
      return;
    }
    if (!isOnline) {
      setCloudStatus('offline-pending');
      return;
    }

    const wifeNeedsUpload =
      progress.role === 'wife' &&
      (cloudState.pendingUpload ||
        (progress.modeProgress.questions.updatedAt ?? 0) >
          (cloudState.lastCloudSyncedAt ?? 0));

    if (!wifeNeedsUpload && !cloudState.pendingUpload) {
      setCloudStatus((prev) => (prev === 'syncing' ? prev : 'synced'));
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setCloudStatus('syncing');
      setCloudError(null);
      void pushEncryptedSnapshotToCloud(
        cloudUser,
        progressRef.current,
        cloudState.vaultId!,
        cloudState.vaultKey!
      )
        .then(() => {
          if (cancelled) return;
          setCloudState((prev) => ({
            ...prev,
            accountUid: prev.accountUid ?? cloudUser.uid,
            pendingUpload: false,
            lastCloudSyncedAt: Date.now(),
          }));
          setCloudStatus('synced');
        })
        .catch((err) => {
          if (cancelled) return;
          if (!navigator.onLine) {
            setCloudStatus('offline-pending');
            return;
          }
          setCloudStatus('error');
          setCloudError(
            formatCloudErrorMessage(err, 'تعذّر رفع التحديثات إلى الخزنة السحابية')
          );
        });
    }, 650);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    isOnline,
    cloudUser,
    cloudState.vaultId,
    cloudState.vaultKey,
    cloudState.pendingUpload,
    cloudState.lastCloudSyncedAt,
    hasVaultAccountMismatch,
    progress.settings.cloudAutoSyncEnabled,
    progress.role,
    progress.modeProgress.questions.updatedAt,
    progress.playerName,
    progressRef,
  ]);

  // Live Firestore subscription so both Wife and Husband track vault partner status & encrypted snapshots
  useEffect(() => {
    if (
      !cloudUser ||
      !cloudState.vaultId ||
      !cloudState.vaultKey ||
      hasVaultAccountMismatch ||
      !progress.roleConfigured ||
      !progress.settings.cloudAutoSyncEnabled
    ) {
      vaultSnapshotInitializedRef.current = false;
      prevPartnerJoinedRef.current = false;
      if (!cloudState.vaultId || hasVaultAccountMismatch) {
        setCloudPartnerJoined(false);
      }
      return;
    }

    vaultSnapshotInitializedRef.current = false;
    prevPartnerJoinedRef.current = false;

    const unsubscribe = subscribeToCoupleCloudVault(
      cloudState.vaultId,
      cloudState.vaultKey,
      ({ vault, decryptedSnapshot }) => {
        const bothJoined = Boolean(vault.wifeUid && vault.husbandUid);
        if (vaultSnapshotInitializedRef.current && !prevPartnerJoinedRef.current && bothJoined) {
          onPartnerJoinedRef.current?.();
        }
        vaultSnapshotInitializedRef.current = true;
        prevPartnerJoinedRef.current = bothJoined;
        setCloudPartnerJoined(bothJoined);

        if (progressRef.current.role === 'wife') {
          if (!cloudStateRef.current.accountUid) {
            setCloudState((prev) =>
              prev.accountUid === cloudUser.uid ? prev : { ...prev, accountUid: cloudUser.uid }
            );
          }
          const incomingHusbandName = vault.husbandName?.trim();
          const isMaskedDefault = incomingHusbandName === 'الشريك';
          if (incomingHusbandName) {
            setProgress((prev) => {
              if (
                (isMaskedDefault && prev.partnerSnapshot.partnerName.trim().length > 0) ||
                prev.partnerSnapshot.partnerName === incomingHusbandName
              ) {
                return prev;
              }
              return {
                ...prev,
                partnerSnapshot: {
                  ...prev.partnerSnapshot,
                  partnerName: incomingHusbandName.slice(0, 24),
                },
              };
            });
          }
          if (isOnlineRef.current) {
            setCloudStatus('synced');
          }
          return;
        }

        if (progressRef.current.role === 'husband') {
          if (decryptedSnapshot) {
            const shouldApplyRevision = shouldAcceptPartnerSnapshotUpdate(
              progressRef.current.partnerSnapshot,
              decryptedSnapshot.updatedAt,
              decryptedSnapshot.answersBySet,
              decryptedSnapshot.completedSetIds
            );
            if (shouldApplyRevision) {
              markUpdatedSetsFromDiff(
                progressRef.current.partnerSnapshot.answersBySet,
                decryptedSnapshot.answersBySet
              );
              setProgress((prev) => {
                if (
                  !shouldAcceptPartnerSnapshotUpdate(
                    prev.partnerSnapshot,
                    decryptedSnapshot.updatedAt,
                    decryptedSnapshot.answersBySet,
                    decryptedSnapshot.completedSetIds
                  )
                ) {
                  return prev;
                }
                return applyIncomingPartnerSnapshot(prev, {
                  partnerName:
                    decryptedSnapshot.playerName ||
                    vault.wifeName ||
                    prev.partnerSnapshot.partnerName,
                  answersBySet: decryptedSnapshot.answersBySet,
                  completedSetIds: decryptedSnapshot.completedSetIds,
                  pairedDeviceId:
                    vault.sourceDeviceId || prev.partnerSnapshot.pairedDeviceId,
                  pairedDeviceLabel:
                    decryptedSnapshot.playerName ||
                    vault.wifeName ||
                    prev.partnerSnapshot.pairedDeviceLabel,
                  syncedAt: decryptedSnapshot.updatedAt,
                });
              });
              setCloudState((prev) => ({
                ...prev,
                accountUid: prev.accountUid ?? cloudUser.uid,
                lastCloudSyncedAt: Date.now(),
              }));
            } else {
              // Keep metadata fresh without rolling back newer Nearby answers
              setProgress((prev) => {
                const nextName =
                  decryptedSnapshot.playerName || prev.partnerSnapshot.partnerName;
                const nextDeviceId =
                  vault.sourceDeviceId || prev.partnerSnapshot.pairedDeviceId;
                const nextDeviceLabel =
                  decryptedSnapshot.playerName || prev.partnerSnapshot.pairedDeviceLabel;
                if (
                  nextName === prev.partnerSnapshot.partnerName &&
                  nextDeviceId === prev.partnerSnapshot.pairedDeviceId &&
                  nextDeviceLabel === prev.partnerSnapshot.pairedDeviceLabel
                ) {
                  return prev;
                }
                return {
                  ...prev,
                  partnerSnapshot: {
                    ...prev.partnerSnapshot,
                    partnerName: nextName,
                    pairedDeviceId: nextDeviceId,
                    pairedDeviceLabel: nextDeviceLabel,
                  },
                };
              });
              if (!cloudStateRef.current.accountUid) {
                setCloudState((prev) => ({
                  ...prev,
                  accountUid: cloudUser.uid,
                }));
              }
            }
          } else {
            if (!cloudStateRef.current.accountUid) {
              setCloudState((prev) => ({
                ...prev,
                accountUid: cloudUser.uid,
              }));
            }
            const incomingWifeName = vault.wifeName?.trim();
            if (incomingWifeName) {
              const isMaskedDefault = incomingWifeName === 'الشريكة';
              setProgress((prev) =>
                (isMaskedDefault && prev.partnerSnapshot.partnerName.trim().length > 0) ||
                prev.partnerSnapshot.partnerName === incomingWifeName.slice(0, 24)
                  ? prev
                  : {
                      ...prev,
                      partnerSnapshot: {
                        ...prev.partnerSnapshot,
                        partnerName: incomingWifeName.slice(0, 24),
                      },
                    }
              );
            }
          }
          if (isOnlineRef.current) {
            setCloudStatus('synced');
          }
        }
      },
      () => {
        setCloudPartnerJoined(false);
        setServerExistingVaultId(null);
        setCloudState((prev) => ({
          ...prev,
          vaultId: null,
          vaultKey: null,
          accountUid: null,
          lastCloudSyncedAt: null,
          pendingUpload: false,
        }));
        setCloudStatus(cloudUserRef.current ? 'unlinked' : 'signed-out');
        setCloudNotice(
          progressRef.current.role === 'husband'
            ? 'تم إنهاء الخزنة السحابية من قِبل الشريكة، ويمكنك إنشاء خزنة جديدة أو الانضمام برمز جديد مع بقاء إجاباتك المحفوظة محلياً.'
            : 'تم إنهاء الخزنة السحابية من قِبل الشريك، ويمكنكِ إنشاء خزنة جديدة أو الانضمام برمز جديد مع بقاء إجاباتكِ المحفوظة محلياً.'
        );
      },
      (err) => {
        if (!navigator.onLine) {
          setCloudStatus('offline-pending');
          return;
        }
        setCloudStatus('error');
        setCloudError(
          formatCloudErrorMessage(
            err,
            'تعذّر مزامنة الخزنة السحابية حالياً؛ يرجى المحاولة مجدداً.'
          )
        );
      }
    );

    return unsubscribe;
  }, [
    cloudUser,
    cloudState.vaultId,
    cloudState.vaultKey,
    hasVaultAccountMismatch,
    progress.roleConfigured,
    progress.settings.cloudAutoSyncEnabled,
    markUpdatedSetsFromDiff,
    progressRef,
    setProgress,
  ]);

  // Live Cloud E2EE Chat subscription
  useEffect(() => {
    if (
      !cloudUser ||
      !cloudState.vaultId ||
      !cloudState.vaultKey ||
      hasVaultAccountMismatch ||
      !progress.roleConfigured ||
      !progress.settings.cloudAutoSyncEnabled
    ) {
      return;
    }

    const unsubscribe = subscribeToCloudChatMessages(
      cloudState.vaultId,
      cloudState.vaultKey,
      (incomingMessages) => {
        if (incomingMessages.length === 0) return;
        const knownIds = new Set(chatStoreRef.current.messages.map((m) => m.id));
        const clearedAt = Math.max(
          chatStoreRef.current.clearedAt,
          chatStoreRef.current.pendingCloudClearAt ?? 0
        );
        let newPartnerCount = 0;
        let latestPartnerName: string | null = null;

        setChatStore((prev) => mergeIncomingChatMessagesBatch(prev, incomingMessages));

        for (const msg of incomingMessages) {
          if (msg.senderRole !== progressRef.current.role) {
            const cleanName = msg.senderName.trim().slice(0, 24);
            if (
              cleanName &&
              cleanName !== 'الشريك' &&
              cleanName !== 'الشريكة' &&
              cleanName !== 'الزوج' &&
              cleanName !== 'الزوجة'
            ) {
              latestPartnerName = cleanName;
            }
          }
          if (
            msg.senderRole !== progressRef.current.role &&
            msg.createdAt > clearedAt &&
            !knownIds.has(msg.id) &&
            !seenIncomingChatIdsRef.current.has(msg.id)
          ) {
            if (seenIncomingChatIdsRef.current.size > 600) {
              seenIncomingChatIdsRef.current.clear();
            }
            seenIncomingChatIdsRef.current.add(msg.id);
            newPartnerCount += 1;
          }
        }
        if (latestPartnerName) {
          const nextName = latestPartnerName;
          setProgress((prev) =>
            prev.partnerSnapshot.partnerName === nextName
              ? prev
              : {
                  ...prev,
                  partnerSnapshot: {
                    ...prev.partnerSnapshot,
                    partnerName: nextName,
                  },
                }
          );
        }
        if (newPartnerCount > 0 && screenRef.current !== 'chat') {
          setUnreadChatCount((c) => c + newPartnerCount);
          onIncomingChatNotificationRef.current?.(newPartnerCount);
        }
      },
      (err) => {
        if (!navigator.onLine) return;
        const rawMsg = err instanceof Error ? err.message : String(err ?? '');
        const lower = rawMsg.toLowerCase();
        if (
          lower.includes('unavailable') ||
          lower.includes('offline') ||
          lower.includes('network')
        ) {
          return;
        }
        setCloudError(
          formatCloudErrorMessage(err, 'تعذّر مزامنة رسائل الدردشة السحابية حالياً.')
        );
      }
    );

    return unsubscribe;
  }, [
    cloudUser,
    cloudState.vaultId,
    cloudState.vaultKey,
    hasVaultAccountMismatch,
    progress.roleConfigured,
    progress.settings.cloudAutoSyncEnabled,
    chatStoreRef,
    progressRef,
    screenRef,
    setChatStore,
    setProgress,
    setUnreadChatCount,
  ]);

  // Flush queued offline cloud chat clear watermark when connectivity returns (scoped to original vault)
  useEffect(() => {
    const pendingClearAt = chatStore.pendingCloudClearAt;
    if (
      !pendingClearAt ||
      !isOnline ||
      !cloudUser ||
      !cloudState.vaultId ||
      !cloudState.vaultKey ||
      hasVaultAccountMismatch ||
      !progress.roleConfigured ||
      clearingCloudWatermarkRef.current === pendingClearAt
    ) {
      return;
    }

    if (
      chatStore.pendingCloudClearVaultId &&
      chatStore.pendingCloudClearVaultId !== cloudState.vaultId
    ) {
      setChatStore((prev) => clearPendingCloudClearWatermark(prev));
      return;
    }

    clearingCloudWatermarkRef.current = pendingClearAt;
    const activeVaultId = cloudState.vaultId;
    void clearCloudChatMessages(activeVaultId, pendingClearAt)
      .then(() => {
        setChatStore((prev) => clearPendingCloudClearWatermark(prev));
      })
      .catch(() => {
        // Keep watermark to retry on next reconnect
      })
      .finally(() => {
        if (clearingCloudWatermarkRef.current === pendingClearAt) {
          clearingCloudWatermarkRef.current = null;
        }
      });
  }, [
    chatStore.pendingCloudClearAt,
    chatStore.pendingCloudClearVaultId,
    isOnline,
    cloudUser,
    cloudState.vaultId,
    cloudState.vaultKey,
    hasVaultAccountMismatch,
    progress.roleConfigured,
    setChatStore,
  ]);

  // Cloud Chat outbox uploader (backs up pre-link local & nearby-only messages once vault & auto-sync are active)
  useEffect(() => {
    if (
      !isOnline ||
      !cloudUser ||
      !cloudState.vaultId ||
      !cloudState.vaultKey ||
      hasVaultAccountMismatch ||
      !progress.roleConfigured ||
      !progress.settings.cloudAutoSyncEnabled
    ) {
      return;
    }

    const pendingToUpload = chatStore.messages.filter(
      (m) =>
        (m.pendingCloudUpload ||
          m.deliveredVia === 'local' ||
          m.deliveredVia === 'nearby') &&
        m.senderRole === progress.role &&
        !cloudInflightChatIdsRef.current.has(m.id) &&
        !failedCloudChatIds.includes(m.id)
    );
    if (pendingToUpload.length === 0) return;

    const activeVaultId = cloudState.vaultId;
    const activeVaultKey = cloudState.vaultKey;

    for (const msg of pendingToUpload) {
      cloudInflightChatIdsRef.current.add(msg.id);
      void pushEncryptedChatMessageToCloud(cloudUser, activeVaultId, activeVaultKey, msg)
        .then(() => {
          setFailedCloudChatIds((prev) => prev.filter((id) => id !== msg.id));
          setChatStore((prev) => markChatMessageDelivered(prev, msg.id, 'cloud'));
        })
        .catch(() => {
          if (navigator.onLine) {
            setFailedCloudChatIds((prev) => (prev.includes(msg.id) ? prev : [...prev, msg.id]));
          }
        })
        .finally(() => {
          cloudInflightChatIdsRef.current.delete(msg.id);
        });
    }
  }, [
    isOnline,
    cloudUser,
    cloudState.vaultId,
    cloudState.vaultKey,
    hasVaultAccountMismatch,
    progress.roleConfigured,
    progress.role,
    progress.settings.cloudAutoSyncEnabled,
    chatStore.messages,
    failedCloudChatIds,
    setChatStore,
  ]);

  // Automatic 12s retry timer for failed cloud chat uploads
  useEffect(() => {
    if (
      failedCloudChatIds.length === 0 ||
      !isOnline ||
      !cloudUser ||
      !cloudState.vaultId ||
      !cloudState.vaultKey ||
      hasVaultAccountMismatch ||
      !progress.roleConfigured ||
      !progress.settings.cloudAutoSyncEnabled
    ) {
      return;
    }

    const activeVaultId = cloudState.vaultId;
    const activeVaultKey = cloudState.vaultKey;
    const timer = window.setTimeout(() => {
      const retryQueue = chatStoreRef.current.messages.filter(
        (m) =>
          failedCloudChatIds.includes(m.id) &&
          m.pendingCloudUpload &&
          m.senderRole === progressRef.current.role &&
          !cloudInflightChatIdsRef.current.has(m.id)
      );
      for (const msg of retryQueue) {
        cloudInflightChatIdsRef.current.add(msg.id);
        void pushEncryptedChatMessageToCloud(cloudUser, activeVaultId, activeVaultKey, msg)
          .then(() => {
            setFailedCloudChatIds((prev) => prev.filter((id) => id !== msg.id));
            setChatStore((prev) => markChatMessageDelivered(prev, msg.id, 'cloud'));
          })
          .catch(() => {
            // Keep failed status so user can trigger manual retry
          })
          .finally(() => {
            cloudInflightChatIdsRef.current.delete(msg.id);
          });
      }
    }, 12_000);

    return () => window.clearTimeout(timer);
  }, [
    failedCloudChatIds,
    isOnline,
    cloudUser,
    cloudState.vaultId,
    cloudState.vaultKey,
    hasVaultAccountMismatch,
    progress.roleConfigured,
    progress.settings.cloudAutoSyncEnabled,
    chatStoreRef,
    progressRef,
    setChatStore,
  ]);

  const handleCloudSignIn = useCallback(async () => {
    setCloudError(null);
    setCloudNotice(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setCloudUser(res.user);
      const curCloud = cloudStateRef.current;
      const isAccountMismatch = Boolean(
        curCloud.vaultId && curCloud.accountUid && res.user.uid !== curCloud.accountUid
      );
      if (progressRef.current.roleConfigured) {
        const existingVaultId = await ensureUserCloudProfile(
          res.user,
          progressRef.current,
          isAccountMismatch ? null : curCloud.vaultId,
          { forceResetRole: curCloud.pendingProfileReset }
        );
        if (curCloud.pendingProfileReset) {
          setCloudState((prev) =>
            prev.pendingProfileReset ? { ...prev, pendingProfileReset: false } : prev
          );
        }
        if (!curCloud.vaultId && existingVaultId && !curCloud.pendingProfileReset) {
          setServerExistingVaultId(existingVaultId);
        } else {
          setServerExistingVaultId(null);
        }
      }
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      if (
        code === 'auth/popup-blocked' &&
        typeof window !== 'undefined' &&
        !isCapacitorNative() &&
        window.self === window.top
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      const msg = isCapacitorNative()
        ? 'تعذّر تسجيل الدخول بحساب Google داخل تطبيق أندرويد؛ تأكّد من تفعيل خدمات Google على الهاتف أو استخدم المزامنة القريبة بدون إنترنت.'
        : code === 'auth/popup-blocked'
          ? 'المتصفح منع نافذة تسجيل الدخول؛ يرجى السماح بالنوافذ المنبثقة والمحاولة مجدداً.'
          : 'تعذّر تسجيل الدخول بحساب Google؛ تأكّد من اتصال الهاتف بالإنترنت وحاول مجدداً.';
      setCloudError(msg);
      return;
    }
  }, [progressRef]);

  const handleCloudSignOut = useCallback(
    async (options?: { clearLocalVault?: boolean }) => {
      setCloudError(null);
      await signOut(auth);
      if (options?.clearLocalVault) {
        skipNextCloudPersistRef.current = true;
        clearCloudSyncState();
        setCloudState(createInitialCloudSyncState());
        setCloudPartnerJoined(false);
      }
      setCloudUser(null);
      setCloudStatus('signed-out');
    },
    []
  );

  const handleCreateCloudVault = useCallback(async () => {
    const user = cloudUserRef.current;
    if (!user) {
      throw new Error('يرجى تسجيل الدخول بحساب Google أولاً.');
    }
    setCloudError(null);
    setCloudNotice(null);
    setServerExistingVaultId(null);
    setCloudStatus('syncing');
    const { vaultId, vaultKey } = await createCoupleCloudVault(user, progressRef.current);
    setCloudState((prev) => ({
      ...prev,
      vaultId,
      vaultKey,
      accountUid: user.uid,
      lastCloudSyncedAt: Date.now(),
      pendingUpload: false,
      pendingProfileReset: false,
    }));
    setCloudStatus(isOnlineRef.current ? 'synced' : 'offline-pending');
  }, [progressRef]);

  const handleJoinCloudVault = useCallback(
    async (inviteCode: string) => {
      const user = cloudUserRef.current;
      if (!user) {
        throw new Error('يرجى تسجيل الدخول بحساب Google أولاً.');
      }
      setCloudError(null);
      setCloudNotice(null);
      setServerExistingVaultId(null);
      setCloudStatus('syncing');
      const { vaultId, vaultKey } = await joinCoupleCloudVault(
        user,
        progressRef.current,
        inviteCode
      );
      setPendingInviteCode(null);
      scrubInviteFromUrl();
      setChatStore((prev) => clearPendingCloudClearWatermark(prev));
      const isWife = progressRef.current.role === 'wife';
      const localWifeAnswersCount = isWife
        ? Object.values(progressRef.current.answersBySet).reduce(
            (sum, qMap) => sum + Object.keys(qMap).length,
            0
          )
        : 0;

      if (isWife && localWifeAnswersCount === 0 && isOnlineRef.current) {
        let hydratedFromExisting = false;
        try {
          const existing = await fetchCoupleCloudVaultSnapshot(vaultId, vaultKey);
          const remoteSnap = existing?.decryptedSnapshot;
          if (remoteSnap && Object.keys(remoteSnap.answersBySet).length > 0) {
            hydratedFromExisting = true;
            setProgress((prev) => ({
              ...prev,
              answersBySet: remoteSnap.answersBySet,
              completedSetIds: remoteSnap.completedSetIds,
              modeProgress: {
                ...prev.modeProgress,
                questions: {
                  updatedAt: Math.max(
                    remoteSnap.updatedAt || Date.now(),
                    prev.modeProgress.questions.updatedAt ?? 0
                  ),
                },
              },
            }));
            setCloudState((prev) => ({
              ...prev,
              vaultId,
              vaultKey,
              accountUid: user.uid,
              lastCloudSyncedAt: Date.now(),
              pendingUpload: false,
              pendingProfileReset: false,
            }));
            setCloudNotice('تم استرجاع إجاباتكِ المحفوظة مسبقاً من الخزنة السحابية بأمان.');
          }
        } catch {
          // Fall through to standard join sync if pre-fetch fails
        }
        if (hydratedFromExisting) {
          setCloudStatus(isOnlineRef.current ? 'synced' : 'offline-pending');
          return;
        }
      }

      setCloudState((prev) => ({
        ...prev,
        vaultId,
        vaultKey,
        accountUid: user.uid,
        lastCloudSyncedAt: isWife ? prev.lastCloudSyncedAt : Date.now(),
        pendingUpload: isWife,
        pendingProfileReset: false,
      }));
      if (isWife && isOnlineRef.current) {
        await pushEncryptedSnapshotToCloud(user, progressRef.current, vaultId, vaultKey);
        setCloudState((prev) => ({
          ...prev,
          lastCloudSyncedAt: Date.now(),
          pendingUpload: false,
        }));
      }
      setCloudStatus(isOnlineRef.current ? 'synced' : 'offline-pending');
    },
    [progressRef, setChatStore, setProgress]
  );

  const handleSwitchCloudVault = useCallback(
    async (inviteCode: string) => {
      const user = cloudUserRef.current;
      if (!user) {
        throw new Error('يرجى تسجيل الدخول بحساب Google أولاً.');
      }
      if (!isOnlineRef.current) {
        throw new Error('يتطلب تبديل الخزنة اتصالاً بالإنترنت لحفظ بياناتك قبل المغادرة.');
      }
      if (hasVaultAccountMismatchRef.current) {
        throw new Error('الخزنة الحالية مرتبطة بحساب Google آخر؛ أزل الارتباط المحلي أولاً.');
      }
      const prevVaultId = cloudStateRef.current.vaultId;
      setCloudError(null);
      setCloudStatus('syncing');
      const { vaultId, vaultKey } = await joinCoupleCloudVault(
        user,
        progressRef.current,
        inviteCode
      );
      setPendingInviteCode(null);
      scrubInviteFromUrl();
      setChatStore((prev) => clearPendingCloudClearWatermark(prev));
      const isWife = progressRef.current.role === 'wife';
      const localWifeAnswersCount = isWife
        ? Object.values(progressRef.current.answersBySet).reduce(
            (sum, qMap) => sum + Object.keys(qMap).length,
            0
          )
        : 0;
      setCloudPartnerJoined(false);

      let hydratedFromExisting = false;
      if (isWife && localWifeAnswersCount === 0 && isOnlineRef.current) {
        try {
          const existing = await fetchCoupleCloudVaultSnapshot(vaultId, vaultKey);
          const remoteSnap = existing?.decryptedSnapshot;
          if (remoteSnap && Object.keys(remoteSnap.answersBySet).length > 0) {
            hydratedFromExisting = true;
            setProgress((prev) => ({
              ...prev,
              answersBySet: remoteSnap.answersBySet,
              completedSetIds: remoteSnap.completedSetIds,
              modeProgress: {
                ...prev.modeProgress,
                questions: {
                  updatedAt: Math.max(
                    remoteSnap.updatedAt || Date.now(),
                    prev.modeProgress.questions.updatedAt ?? 0
                  ),
                },
              },
            }));
            setCloudState((prev) => ({
              ...prev,
              vaultId,
              vaultKey,
              accountUid: user.uid,
              lastCloudSyncedAt: Date.now(),
              pendingUpload: false,
              pendingProfileReset: false,
            }));
            setCloudNotice('تم استرجاع إجاباتكِ المحفوظة مسبقاً من الخزنة الجديدة بأمان.');
          }
        } catch {
          // Fall through to standard push
        }
      }

      if (!hydratedFromExisting) {
        setCloudState((prev) => ({
          ...prev,
          vaultId,
          vaultKey,
          accountUid: user.uid,
          lastCloudSyncedAt: isWife ? prev.lastCloudSyncedAt : Date.now(),
          pendingUpload: isWife,
          pendingProfileReset: false,
        }));
        if (isWife && isOnlineRef.current) {
          await pushEncryptedSnapshotToCloud(user, progressRef.current, vaultId, vaultKey);
          setCloudState((prev) => ({
            ...prev,
            lastCloudSyncedAt: Date.now(),
            pendingUpload: false,
          }));
        }
      }
      if (prevVaultId && prevVaultId !== vaultId) {
        void unlinkCoupleCloudVault(user, progressRef.current.role, prevVaultId, {
          skipUserProfileReset: true,
        }).catch(() => {
          // Best-effort cleanup of previous vault after joining new vault succeeded
        });
      }
      setCloudStatus(isOnlineRef.current ? 'synced' : 'offline-pending');
    },
    [progressRef, setChatStore, setProgress]
  );

  const handleClearMismatchedLocalVault = useCallback(() => {
    setCloudError(null);
    setCloudPartnerJoined(false);
    setChatStore((prev) => clearPendingCloudClearWatermark(prev));
    clearCloudSyncState();
    setCloudState(createInitialCloudSyncState());
    setCloudStatus(cloudUserRef.current ? 'unlinked' : 'signed-out');
  }, [setChatStore]);

  const handleCloudSyncNow = useCallback(async (): Promise<boolean> => {
    const user = cloudUserRef.current;
    const currentCloud = cloudStateRef.current;
    if (!user) {
      setCloudError('يرجى تسجيل الدخول بحساب Google أولاً.');
      return false;
    }
    if (!currentCloud.vaultId || !currentCloud.vaultKey) {
      setCloudError('يتطلب التحديث اليدوي إنشاء خزنة سحابية أو الانضمام إليها أولاً.');
      return false;
    }
    if (hasVaultAccountMismatchRef.current) {
      setCloudError('الخزنة الحالية مرتبطة بحساب Google آخر؛ أزل الارتباط المحلي أو بدّل الحساب.');
      return false;
    }
    if (!isOnlineRef.current) {
      setCloudStatus('offline-pending');
      setCloudError('الهاتف غير متصل بالإنترنت حالياً؛ ستتم المزامنة تلقائياً فور عودة الاتصال.');
      return false;
    }
    setCloudError(null);
    setCloudStatus('syncing');
    try {
      await pushEncryptedSnapshotToCloud(
        user,
        progressRef.current,
        currentCloud.vaultId,
        currentCloud.vaultKey
      );
      setCloudState((prev) => ({
        ...prev,
        accountUid: prev.accountUid ?? user.uid,
        pendingUpload: false,
        lastCloudSyncedAt: Date.now(),
      }));
      setCloudStatus('synced');
      return true;
    } catch (err) {
      setCloudStatus('error');
      setCloudError(formatCloudErrorMessage(err, 'تعذّر إتمام المزامنة السحابية الآن'));
      return false;
    }
  }, [progressRef]);

  const handleUnlinkCloudVault = useCallback(async () => {
    const user = cloudUserRef.current;
    const currentCloud = cloudStateRef.current;
    setCloudError(null);
    setCloudNotice(null);
    try {
      if (user && currentCloud.vaultId && !hasVaultAccountMismatchRef.current) {
        await unlinkCoupleCloudVault(user, progressRef.current.role, currentCloud.vaultId);
      }
      setCloudPartnerJoined(false);
      setServerExistingVaultId(null);
      setChatStore((prev) => clearPendingCloudClearWatermark(prev));
      setCloudState((prev) => ({
        ...prev,
        vaultId: null,
        vaultKey: null,
        accountUid: null,
        lastCloudSyncedAt: null,
        pendingUpload: false,
      }));
      setCloudStatus(user ? 'unlinked' : 'signed-out');
    } catch (err) {
      const msg = formatCloudErrorMessage(
        err,
        'تعذّر فك الربط السحابي الآن؛ تم الإبقاء على بيانات الخزنة المحلية لحمايتها.'
      );
      setCloudError(msg);
      throw err instanceof Error ? err : new Error(msg);
    }
  }, [progressRef, setChatStore]);

  const handleRetryCloudChatMessage = useCallback(
    async (messageId: string) => {
      const user = cloudUserRef.current;
      const currentCloud = cloudStateRef.current;
      if (!user || !currentCloud.vaultId || !currentCloud.vaultKey) {
        onActionFeedbackRef.current?.(
          'يرجى ربط الخزنة السحابية وتسجيل الدخول أولاً لإرسال الرسالة سحابياً.',
          'warning'
        );
        return;
      }
      if (hasVaultAccountMismatchRef.current) {
        onActionFeedbackRef.current?.(
          'الحساب النشط يختلف عن حساب الخزنة المرتبطة؛ راجع إعدادات المزامنة.',
          'warning'
        );
        return;
      }
      if (!isOnlineRef.current) {
        onActionFeedbackRef.current?.(
          'لا يتوفر اتصال بالإنترنت حالياً؛ ستُرفع الرسالة تلقائياً عند عودة الشبكة.',
          'warning'
        );
        return;
      }
      const targetMsg = chatStoreRef.current.messages.find((m) => m.id === messageId);
      if (
        !targetMsg ||
        (!targetMsg.pendingCloudUpload && targetMsg.deliveredVia !== 'local') ||
        cloudInflightChatIdsRef.current.has(messageId)
      ) {
        return;
      }
      cloudInflightChatIdsRef.current.add(messageId);
      try {
        await pushEncryptedChatMessageToCloud(
          user,
          currentCloud.vaultId,
          currentCloud.vaultKey,
          targetMsg
        );
        setFailedCloudChatIds((prev) => prev.filter((id) => id !== messageId));
        setChatStore((prev) => markChatMessageDelivered(prev, messageId, 'cloud'));
      } catch (err) {
        setFailedCloudChatIds((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));
        onActionFeedbackRef.current?.(
          formatCloudErrorMessage(err, 'تعذّر إعادة إرسال الرسالة الآن؛ يرجى المحاولة مجدداً.'),
          'error'
        );
      } finally {
        cloudInflightChatIdsRef.current.delete(messageId);
      }
    },
    [chatStoreRef, setChatStore]
  );

  const resetCloudOnRoleSwitch = useCallback(async (prevRole: DeviceRole) => {
    const user = cloudUserRef.current;
    const currentCloud = cloudStateRef.current;
    if (user && currentCloud.vaultId && isOnlineRef.current && !hasVaultAccountMismatchRef.current) {
      try {
        await unlinkCoupleCloudVault(user, prevRole, currentCloud.vaultId);
      } catch {
        // Best-effort vault unlink
      }
    }
    let profileResetRemainsPending = !user || !isOnlineRef.current;
    if (user && isOnlineRef.current) {
      try {
        await deleteUserCloudProfile(user);
        profileResetRemainsPending = false;
      } catch {
        profileResetRemainsPending = true;
      }
    }
    seenIncomingChatIdsRef.current.clear();
    setServerExistingVaultId(null);
    setCloudPartnerJoined(false);
    setCloudNotice(null);
    setCloudError(null);
    if (profileResetRemainsPending) {
      setCloudState({
        ...createInitialCloudSyncState(),
        pendingProfileReset: true,
      });
    } else {
      skipNextCloudPersistRef.current = true;
      clearCloudSyncState();
      setCloudState(createInitialCloudSyncState());
    }
    setCloudStatus(user ? 'unlinked' : 'signed-out');
  }, []);

  const wipeCloudOnForgotPin = useCallback((prevRole: DeviceRole) => {
    const prevUser = cloudUserRef.current;
    const prevVaultId = cloudStateRef.current.vaultId;
    const prevMismatch = hasVaultAccountMismatchRef.current;
    const wasOnline = typeof navigator !== 'undefined' && navigator.onLine;

    skipNextCloudPersistRef.current = true;
    clearCloudSyncState();

    if (wasOnline && prevUser) {
      const cleanupCloud = async () => {
        if (prevVaultId && !prevMismatch) {
          await unlinkCoupleCloudVault(prevUser, prevRole, prevVaultId).catch(() => {});
        }
        await deleteUserCloudProfile(prevUser).catch(() => {});
        await signOut(auth).catch(() => {});
      };
      void cleanupCloud();
    } else {
      void signOut(auth).catch(() => {});
    }

    setCloudState(createInitialCloudSyncState());
    setCloudUser(null);
    setCloudStatus('signed-out');
    setCloudError(null);
    setCloudPartnerJoined(false);
    setFailedCloudChatIds([]);
  }, []);

  const isCloudVaultLinked = Boolean(
    cloudUser && cloudState.vaultId && cloudState.vaultKey && !hasVaultAccountMismatch
  );

  return {
    cloudUser,
    cloudUserRef,
    cloudState,
    cloudStateRef,
    cloudStatus,
    cloudError,
    cloudNotice,
    serverExistingVaultId,
    cloudPartnerJoined,
    pendingInviteCode,
    isOnline,
    isOnlineRef,
    hasVaultAccountMismatch,
    hasVaultAccountMismatchRef,
    isCloudVaultLinked,
    failedCloudChatIds,
    setFailedCloudChatIds,
    markCloudUploadPending,
    handleDismissPendingInvite,
    handleDismissCloudNotice,
    clearCloudError,
    handleCloudSignIn,
    handleCloudSignOut,
    handleCreateCloudVault,
    handleJoinCloudVault,
    handleSwitchCloudVault,
    handleClearMismatchedLocalVault,
    handleCloudSyncNow,
    handleUnlinkCloudVault,
    handleRetryCloudChatMessage,
    resetCloudOnRoleSwitch,
    wipeCloudOnForgotPin,
    setIsOnline,
  };
}
