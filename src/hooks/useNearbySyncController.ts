import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { ChatMessage, DeviceRole, GameProgress, GameRealm, QuestionSet, ScreenId } from '../data/types';
import {
  applyIncomingPartnerSnapshot,
  getDefaultPartnerName,
  shouldAcceptPartnerSnapshotUpdate,
  shouldApplyIncomingSnapshotRevision,
  unpinPartnerDevice,
} from '../game/engine';
import {
  formatNearbyErrorMessage,
  hasLayaliNearbyPlugin,
  startCapacitorNearbySession,
} from '../sync/capacitorBridge';
import {
  LiveSessionBus,
  type DiscoveredPeer,
  type LiveBusState,
  type PairingVerificationRequest,
} from '../sync/liveBus';
import {
  clearLocalChatHistory,
  markChatMessageDelivered,
  mergeIncomingChatMessage,
  type LocalChatStore,
} from '../utils/chatStorage';
import { nocturnalAudio } from '../utils/sound';

interface UseNearbySyncControllerParams {
  progress: GameProgress;
  setProgress: Dispatch<SetStateAction<GameProgress>>;
  progressRef: MutableRefObject<GameProgress>;
  screenRef: MutableRefObject<ScreenId>;
  chatStore: LocalChatStore;
  setChatStore: Dispatch<SetStateAction<LocalChatStore>>;
  chatStoreRef: MutableRefObject<LocalChatStore>;
  setUnreadChatCount: Dispatch<SetStateAction<number>>;
  setUpdatedSyncSetIds: Dispatch<SetStateAction<string[]>>;
  markUpdatedSetsFromDiff: (
    prevAnswers: Record<string, Record<string, string[]>>,
    nextAnswers: Record<string, Record<string, string[]>>
  ) => void;
  setAppModal: Dispatch<SetStateAction<'none' | 'settings' | 'sync'>>;
  isSyncModalOpen: boolean;
  triggerHaptic: () => void;
  setLookup: ReadonlyMap<string, { realm: GameRealm; set: QuestionSet }>;
  onUnexpectedDisconnect?: () => void;
  onRemoteChatCleared?: () => void;
}

export function useNearbySyncController({
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
  isSyncModalOpen,
  triggerHaptic,
  setLookup,
  onUnexpectedDisconnect,
  onRemoteChatCleared,
}: UseNearbySyncControllerParams) {
  const busRef = useRef<LiveSessionBus | null>(null);
  if (!busRef.current) {
    busRef.current = new LiveSessionBus(() => progressRef.current);
  }

  const [busState, setBusState] = useState<LiveBusState>(() => busRef.current!.getState());
  const [nearbyPeers, setNearbyPeers] = useState<DiscoveredPeer[]>([]);
  const [pendingPairingRequest, setPendingPairingRequest] =
    useState<PairingVerificationRequest | null>(null);
  const [isStartingNearby, setIsStartingNearby] = useState<boolean>(false);
  const [connectingEndpointId, setConnectingEndpointId] = useState<string | null>(null);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const nearbyStopRef = useRef<(() => Promise<void>) | null>(null);
  const nearbyConnectRef = useRef<((endpointId: string) => Promise<void>) | null>(null);
  const nearbyAcceptRef = useRef<((endpointId: string) => Promise<void>) | null>(null);
  const nearbyRejectRef = useRef<((endpointId: string) => Promise<void>) | null>(null);
  const nearbySentChatIdsRef = useRef<Set<string>>(new Set());
  const autoDiscoveryAttemptedRef = useRef<boolean>(false);
  const manualDisconnectRef = useRef<boolean>(false);
  const onUnexpectedDisconnectRef = useRef(onUnexpectedDisconnect);
  onUnexpectedDisconnectRef.current = onUnexpectedDisconnect;
  const onRemoteChatClearedRef = useRef(onRemoteChatCleared);
  onRemoteChatClearedRef.current = onRemoteChatCleared;

  // Nearby P2P Chat outbox flush on Bluetooth/Wi-Fi Direct connect
  useEffect(() => {
    if (busState.status !== 'connected') {
      nearbySentChatIdsRef.current.clear();
      return;
    }
    const bus = busRef.current;
    if (!bus) return;

    const pendingNearby = chatStore.messages.filter(
      (m) =>
        m.pendingNearbyAck &&
        m.senderRole === progress.role &&
        !nearbySentChatIdsRef.current.has(m.id)
    );
    for (const msg of pendingNearby) {
      nearbySentChatIdsRef.current.add(msg.id);
      void bus.emitLiveEvent({
        type: 'CHAT_MESSAGE',
        messageId: msg.id,
        senderName: msg.senderName,
        text: msg.text,
        createdAt: msg.createdAt,
      });
    }
  }, [busState.status, chatStore.messages, progress.role]);

  // Subscribe to P2P LiveSessionBus snapshots, HELLO, & live events
  useEffect(() => {
    const bus = busRef.current;
    if (!bus) return;
    const unsubState = bus.subscribeState(setBusState);
    const unsubHello = bus.subscribeHello((packet) => {
      if (packet.role === progressRef.current.role) return;
      setProgress((prev) => ({
        ...prev,
        partnerSnapshot: {
          ...prev.partnerSnapshot,
          partnerName:
            packet.playerName.trim() ||
            prev.partnerSnapshot.partnerName ||
            getDefaultPartnerName(prev.role),
          pairedDeviceId: prev.partnerSnapshot.pairedDeviceId ?? packet.deviceId,
          pairedDeviceLabel: prev.partnerSnapshot.pairedDeviceLabel ?? packet.playerName,
        },
      }));
    });
    const unsubSnapshot = bus.subscribeSnapshot((packet) => {
      if (packet.role !== 'wife' || progressRef.current.role !== 'husband') return;
      const shouldApplyRevision = shouldAcceptPartnerSnapshotUpdate(
        progressRef.current.partnerSnapshot,
        packet.updatedAt,
        packet.answersBySet,
        packet.completedSetIds
      );
      if (shouldApplyRevision) {
        markUpdatedSetsFromDiff(
          progressRef.current.partnerSnapshot.answersBySet,
          packet.answersBySet
        );
      }
      setProgress((prev) => {
        if (
          shouldAcceptPartnerSnapshotUpdate(
            prev.partnerSnapshot,
            packet.updatedAt,
            packet.answersBySet,
            packet.completedSetIds
          )
        ) {
          return applyIncomingPartnerSnapshot(prev, {
            partnerName: packet.playerName,
            answersBySet: packet.answersBySet,
            completedSetIds: packet.completedSetIds,
            pairedDeviceId: packet.deviceId,
            pairedDeviceLabel: packet.playerName,
            syncedAt: packet.updatedAt,
          });
        }
        const nextPartnerName =
          packet.playerName.trim().slice(0, 24) || prev.partnerSnapshot.partnerName;
        const nextDeviceId = prev.partnerSnapshot.pairedDeviceId ?? packet.deviceId;
        const nextDeviceLabel = prev.partnerSnapshot.pairedDeviceLabel ?? packet.playerName;
        if (
          nextPartnerName === prev.partnerSnapshot.partnerName &&
          nextDeviceId === prev.partnerSnapshot.pairedDeviceId &&
          nextDeviceLabel === prev.partnerSnapshot.pairedDeviceLabel
        ) {
          return prev;
        }
        return {
          ...prev,
          partnerSnapshot: {
            ...prev.partnerSnapshot,
            partnerName: nextPartnerName,
            pairedDeviceId: nextDeviceId,
            pairedDeviceLabel: nextDeviceLabel,
          },
        };
      });
    });
    const unsubEvent = bus.subscribeLiveEvent((event, fromDeviceId) => {
      if (event.type === 'CHAT_MESSAGE') {
        const partnerRole: DeviceRole = progressRef.current.role === 'wife' ? 'husband' : 'wife';
        const alreadyKnown = chatStoreRef.current.messages.some((m) => m.id === event.messageId);
        const incomingMsg: ChatMessage = {
          id: event.messageId,
          senderRole: partnerRole,
          senderName: event.senderName,
          senderDeviceId: fromDeviceId || 'nearby-peer',
          text: event.text,
          createdAt: event.createdAt,
          deliveredVia: 'nearby',
          pendingNearbyAck: false,
          pendingCloudUpload: false,
        };
        setChatStore((prev) => mergeIncomingChatMessage(prev, incomingMsg));
        if (
          !alreadyKnown &&
          event.createdAt > chatStoreRef.current.clearedAt &&
          screenRef.current !== 'chat'
        ) {
          setUnreadChatCount((c) => c + 1);
          nocturnalAudio.playSelect(progressRef.current.settings.soundEnabled);
        }
        void bus.emitLiveEvent({
          type: 'CHAT_ACK',
          messageId: event.messageId,
          receivedAt: Date.now(),
        });
        return;
      }

      if (event.type === 'CHAT_ACK') {
        setChatStore((prev) => markChatMessageDelivered(prev, event.messageId, 'nearby'));
        return;
      }

      if (event.type === 'CHAT_CLEAR') {
        setChatStore((prev) => clearLocalChatHistory(prev, event.clearedAt));
        setUnreadChatCount(0);
        onRemoteChatClearedRef.current?.();
        return;
      }

      if (progressRef.current.role !== 'husband') return;
      if (event.type === 'QUESTION_ANSWERED_LIVE') {
        if (
          shouldApplyIncomingSnapshotRevision(
            progressRef.current.partnerSnapshot.lastSyncedAt,
            event.updatedAt
          )
        ) {
          setUpdatedSyncSetIds((prev) =>
            prev.includes(event.setId) ? prev : [...prev, event.setId]
          );
        }
        setProgress((prev) => {
          if (
            !shouldApplyIncomingSnapshotRevision(
              prev.partnerSnapshot.lastSyncedAt,
              event.updatedAt
            )
          ) {
            return prev;
          }
          const targetSet = setLookup.get(event.setId)?.set;
          const existingSetAnswers = prev.partnerSnapshot.answersBySet[event.setId] ?? {};
          const updatedSetAnswers = {
            ...existingSetAnswers,
            [event.questionId]: Array.from(new Set(event.selectedIds)),
          };
          const totalQ = targetSet?.questions.length ?? 0;
          const answeredCount = Object.values(updatedSetAnswers).filter((v) => v.length > 0).length;
          const completedIds =
            totalQ > 0 && answeredCount >= totalQ
              ? Array.from(new Set([...prev.partnerSnapshot.completedSetIds, event.setId]))
              : prev.partnerSnapshot.completedSetIds;

          return {
            ...prev,
            partnerSnapshot: {
              ...prev.partnerSnapshot,
              answersBySet: {
                ...prev.partnerSnapshot.answersBySet,
                [event.setId]: updatedSetAnswers,
              },
              completedSetIds: completedIds,
              lastSyncedAt: event.updatedAt,
            },
          };
        });
      } else if (event.type === 'SET_RESET_LIVE') {
        setProgress((prev) => {
          if (
            !shouldApplyIncomingSnapshotRevision(
              prev.partnerSnapshot.lastSyncedAt,
              event.updatedAt
            )
          ) {
            return prev;
          }
          const nextAnswers = { ...prev.partnerSnapshot.answersBySet };
          delete nextAnswers[event.setId];
          return {
            ...prev,
            partnerSnapshot: {
              ...prev.partnerSnapshot,
              answersBySet: nextAnswers,
              completedSetIds: prev.partnerSnapshot.completedSetIds.filter(
                (id) => id !== event.setId
              ),
              lastSyncedAt: event.updatedAt,
            },
          };
        });
      } else if (event.type === 'ALL_RESET_LIVE') {
        setProgress((prev) => {
          if (
            !shouldApplyIncomingSnapshotRevision(
              prev.partnerSnapshot.lastSyncedAt,
              event.updatedAt
            )
          ) {
            return prev;
          }
          return {
            ...prev,
            partnerSnapshot: {
              ...prev.partnerSnapshot,
              answersBySet: {},
              completedSetIds: [],
              lastSyncedAt: event.updatedAt,
            },
          };
        });
      }
    });

    return () => {
      unsubState();
      unsubHello();
      unsubSnapshot();
      unsubEvent();
      if (nearbyStopRef.current) {
        void nearbyStopRef.current();
        nearbyStopRef.current = null;
        nearbyConnectRef.current = null;
        nearbyAcceptRef.current = null;
        nearbyRejectRef.current = null;
      }
      void bus.disconnect();
    };
  }, [
    chatStoreRef,
    markUpdatedSetsFromDiff,
    progressRef,
    screenRef,
    setChatStore,
    setLookup,
    setProgress,
    setUnreadChatCount,
    setUpdatedSyncSetIds,
  ]);

  const handleStartNearbyDiscovery = useCallback(async () => {
    const bus = busRef.current;
    if (!bus) return;
    autoDiscoveryAttemptedRef.current = true;
    setNearbyError(null);
    setNearbyPeers([]);
    setPendingPairingRequest(null);
    setIsStartingNearby(true);
    bus.setStatus('discovering');
    try {
      if (nearbyStopRef.current) {
        await nearbyStopRef.current();
        nearbyStopRef.current = null;
        nearbyConnectRef.current = null;
        nearbyAcceptRef.current = null;
        nearbyRejectRef.current = null;
      }
      const current = progressRef.current;
      const session = await startCapacitorNearbySession({
        deviceName: current.playerName,
        role: current.role,
        onSessionControls: (controls) => {
          nearbyStopRef.current = controls.stop;
          nearbyConnectRef.current = controls.connectPeer;
          nearbyAcceptRef.current = controls.acceptConnection;
          nearbyRejectRef.current = controls.rejectConnection;
        },
        onPeerFound: (peer) => {
          setNearbyPeers((prev) =>
            prev.some((p) => p.endpointId === peer.endpointId) ? prev : [...prev, peer]
          );
        },
        onPeerLost: (endpointId) => {
          setNearbyPeers((prev) => prev.filter((p) => p.endpointId !== endpointId));
          setPendingPairingRequest((prev) =>
            prev?.endpointId === endpointId ? null : prev
          );
        },
        onConnectionRequested: (request) => {
          if (request.role && request.role === progressRef.current.role) {
            void nearbyRejectRef.current?.(request.endpointId);
            setNearbyError(
              'لا يمكن الاقتران بجهازين يحملان نفس النسخة؛ يجب أن يكون أحد الجهازين «نسخة الزوجة» والآخر «نسخة الزوج».'
            );
            return;
          }
          setPendingPairingRequest(request);
          bus.setStatus('waiting-peer');
          setAppModal('sync');
        },
        onPacket: (packet) => {
          void bus.handleIncomingPacket(packet);
        },
        onConnected: (transport) => {
          setConnectingEndpointId(null);
          setPendingPairingRequest(null);
          void bus.attachTransport(transport);
        },
        onTransferError: (msg) => {
          setNearbyError(formatNearbyErrorMessage(msg));
        },
        onDisconnected: () => {
          const wasConnected = bus.getState().status === 'connected';
          setConnectingEndpointId(null);
          setPendingPairingRequest(null);
          const stopFn = nearbyStopRef.current;
          nearbyStopRef.current = null;
          nearbyConnectRef.current = null;
          nearbyAcceptRef.current = null;
          nearbyRejectRef.current = null;
          if (stopFn) {
            void stopFn();
          }
          void bus.disconnect();
          if (wasConnected && !manualDisconnectRef.current) {
            onUnexpectedDisconnectRef.current?.();
          }
          manualDisconnectRef.current = false;
        },
      });
      nearbyStopRef.current = session.stop;
      nearbyConnectRef.current = session.connectPeer;
      nearbyAcceptRef.current = session.acceptConnection;
      nearbyRejectRef.current = session.rejectConnection;
    } catch (err) {
      nearbyStopRef.current = null;
      nearbyConnectRef.current = null;
      nearbyAcceptRef.current = null;
      nearbyRejectRef.current = null;
      setConnectingEndpointId(null);
      setNearbyError(formatNearbyErrorMessage(err, 'تعذّر بدء الاكتشاف القريب'));
      bus.setStatus('idle');
    } finally {
      setIsStartingNearby(false);
    }
  }, [progressRef, setAppModal]);

  const handlePairNearbyPeer = useCallback(async (endpointId: string) => {
    setNearbyError(null);
    setConnectingEndpointId(endpointId);
    busRef.current?.setStatus('connecting');
    try {
      await nearbyConnectRef.current?.(endpointId);
    } catch (err) {
      setConnectingEndpointId(null);
      setNearbyError(formatNearbyErrorMessage(err, 'تعذّر إتمام الاقتران مع الجهاز القريب'));
      busRef.current?.setStatus('discovering');
    }
  }, []);

  const handleAcceptPairing = useCallback(async (endpointId: string) => {
    setNearbyError(null);
    busRef.current?.setStatus('connecting');
    try {
      await nearbyAcceptRef.current?.(endpointId);
      setPendingPairingRequest(null);
    } catch (err) {
      setConnectingEndpointId(null);
      setNearbyError(formatNearbyErrorMessage(err, 'تعذّر قبول الاقتران'));
      busRef.current?.setStatus('discovering');
    }
  }, []);

  const handleRejectPairing = useCallback(async (endpointId: string) => {
    try {
      await nearbyRejectRef.current?.(endpointId);
    } catch (err) {
      setNearbyError(formatNearbyErrorMessage(err, 'تعذّر رفض طلب الاقتران'));
    } finally {
      setConnectingEndpointId(null);
      setPendingPairingRequest(null);
      busRef.current?.setStatus('discovering');
    }
  }, []);

  const clearNearbyError = useCallback(() => {
    setNearbyError(null);
    if (busRef.current?.getState().status === 'error') {
      busRef.current.setStatus('idle', null);
    }
  }, []);

  const handleUnpinPartnerDevice = useCallback(() => {
    nocturnalAudio.playDeselect(progressRef.current.settings.soundEnabled);
    triggerHaptic();
    setProgress((prev) => unpinPartnerDevice(prev));
    if (busRef.current?.getState().status === 'error') {
      busRef.current.setStatus('idle', null);
    }
  }, [progressRef, setProgress, triggerHaptic]);

  const handleDisconnectNearby = useCallback(async () => {
    manualDisconnectRef.current = true;
    setNearbyError(null);
    setConnectingEndpointId(null);
    setPendingPairingRequest(null);
    try {
      if (nearbyStopRef.current) {
        await nearbyStopRef.current();
        nearbyStopRef.current = null;
        nearbyConnectRef.current = null;
        nearbyAcceptRef.current = null;
        nearbyRejectRef.current = null;
      }
      setNearbyPeers([]);
      await busRef.current?.disconnect();
    } finally {
      manualDisconnectRef.current = false;
    }
  }, []);

  // Start Nearby Bluetooth/Wi-Fi Direct discovery once when opening the Sync modal,
  // avoiding infinite retry loops if OS permissions or Bluetooth are denied/off.
  useEffect(() => {
    if (!progress.roleConfigured || !hasLayaliNearbyPlugin()) {
      return;
    }
    if (isSyncModalOpen) {
      if (
        !autoDiscoveryAttemptedRef.current &&
        !nearbyStopRef.current &&
        !isStartingNearby &&
        busRef.current?.getState().status !== 'connected'
      ) {
        void handleStartNearbyDiscovery();
      }
      return;
    }
    autoDiscoveryAttemptedRef.current = false;
    const status = busRef.current?.getState().status;
    if (nearbyStopRef.current && status === 'discovering' && !pendingPairingRequest) {
      void handleDisconnectNearby();
    }
  }, [
    isSyncModalOpen,
    progress.roleConfigured,
    isStartingNearby,
    pendingPairingRequest,
    handleStartNearbyDiscovery,
    handleDisconnectNearby,
  ]);

  return {
    busRef,
    busState,
    nearbyPeers,
    pendingPairingRequest,
    isStartingNearby,
    connectingEndpointId,
    nearbyError,
    nearbySentChatIdsRef,
    clearNearbyError,
    handleStartNearbyDiscovery,
    handlePairNearbyPeer,
    handleAcceptPairing,
    handleRejectPairing,
    handleUnpinPartnerDevice,
    handleDisconnectNearby,
  };
}
