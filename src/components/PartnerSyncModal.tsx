import React, { useEffect, useRef, useState } from 'react';
import {
  Bluetooth,
  CheckCircle2,
  Cloud,
  Lock,
  MessageCircleHeart,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Unlink,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { GameProgress } from '../data/types';
import { formatQuestionsCountArabic } from '../game/engine';
import type {
  DiscoveredPeer,
  LiveBusState,
  PairingVerificationRequest,
} from '../sync/liveBus';
import { isCapacitorNative } from '../sync/capacitorBridge';
import { useHasNativeNearby } from '../sync/usePlatformCapabilities';
import type { CloudSyncStatus } from '../sync/cloudSync';
import { formatCloudErrorMessage } from '../utils/cloudErrors';
import {
  buildCloudInviteShareUrl,
  parseCloudInviteCode,
  type LocalCloudSyncState,
} from '../utils/cloudCrypto';
import { useBackOverlay } from '../utils/backNavigation';
import { RoseDivider } from './RoseFiligree';
import { InlineConfirmBox, RoseModalShell } from './SharedUI';
import { NearbySyncSection } from './sync/NearbySyncSection';
import { CloudSyncSection } from './sync/CloudSyncSection';

interface PartnerSyncModalProps {
  isOpen: boolean;
  progress: GameProgress;
  busState: LiveBusState;
  nearbyPeers: DiscoveredPeer[];
  pendingPairingRequest?: PairingVerificationRequest | null;
  isStartingNearby?: boolean;
  connectingEndpointId?: string | null;
  nearbyError?: string | null;
  onClearNearbyError?: () => void;
  cloudUserEmail?: string | null;
  cloudUserName?: string | null;
  cloudState: LocalCloudSyncState;
  cloudStatus: CloudSyncStatus;
  cloudPartnerJoined?: boolean;
  cloudError?: string | null;
  onClearCloudError?: () => void;
  cloudNotice?: string | null;
  serverExistingVaultId?: string | null;
  initialInviteCode?: string | null;
  isOnline: boolean;
  onStartNearbyDiscovery: () => Promise<void>;
  onPairNearbyPeer: (endpointId: string) => Promise<void>;
  onAcceptPairing?: (endpointId: string) => Promise<void>;
  onRejectPairing?: (endpointId: string) => Promise<void>;
  onUnpinPartnerDevice?: () => void;
  onDismissCloudNotice?: () => void;
  onManualSyncNow: () => Promise<boolean>;
  onDisconnect: () => Promise<void>;
  onCloudSignIn: () => Promise<void>;
  onCloudSignOut: (options?: { clearLocalVault?: boolean }) => Promise<void>;
  onCreateCloudVault: () => Promise<void>;
  onJoinCloudVault: (inviteCode: string) => Promise<void>;
  onSwitchCloudVault?: (inviteCode: string) => Promise<void>;
  hasVaultAccountMismatch?: boolean;
  onClearMismatchedLocalVault?: () => void;
  onCloudSyncNow: () => Promise<boolean>;
  onUnlinkCloudVault: () => Promise<void>;
  onDismissPendingInvite?: () => void;
  onOpenChat?: () => void;
  onClose: () => void;
  onTapFeedback?: () => void;
  motionEnabled: boolean;
  skipBackOverlay?: boolean;
}

function formatSyncTimestamp(ts: number | null): string {
  if (!ts) return 'لم تُجرَ مزامنة بعد';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return 'تمت المزامنة';
  }
}

/**
 * نافذة الاقتران القريب والمزامنة المباشرة بدون إنترنت (بلوتوث وواي فاي مباشر):
 * مباشرة بدون أكواد نسخ ولصق، مع احتفاظ الجلسة باتصالها في الخلفية عند إغلاق النافذة.
 */
export function PartnerSyncModal({
  isOpen,
  progress,
  busState,
  nearbyPeers,
  pendingPairingRequest = null,
  isStartingNearby = false,
  connectingEndpointId = null,
  nearbyError = null,
  onClearNearbyError,
  cloudUserEmail = null,
  cloudUserName = null,
  cloudState,
  cloudStatus,
  cloudPartnerJoined = false,
  cloudError = null,
  onClearCloudError,
  cloudNotice = null,
  serverExistingVaultId = null,
  initialInviteCode = null,
  isOnline,
  onStartNearbyDiscovery,
  onPairNearbyPeer,
  onAcceptPairing,
  onRejectPairing,
  onUnpinPartnerDevice,
  onDismissCloudNotice,
  onManualSyncNow,
  onDisconnect,
  onCloudSignIn,
  onCloudSignOut,
  onCreateCloudVault,
  onJoinCloudVault,
  onSwitchCloudVault,
  hasVaultAccountMismatch = false,
  onClearMismatchedLocalVault,
  onCloudSyncNow,
  onUnlinkCloudVault,
  onDismissPendingInvite,
  onOpenChat,
  onClose,
  onTapFeedback,
  motionEnabled,
  skipBackOverlay = false,
}: PartnerSyncModalProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [syncDoneBanner, setSyncDoneBanner] = useState<string | null>(null);
  const [confirmUnpin, setConfirmUnpin] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [nearbyBusy, setNearbyBusy] = useState(false);
  const [confirmCloudUnlink, setConfirmCloudUnlink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const confirmCloudUnlinkRef = useRef<HTMLDivElement | null>(null);
  const confirmUnpinRef = useRef<HTMLDivElement | null>(null);

  useBackOverlay(!skipBackOverlay && isOpen, 'partner-sync-modal', onClose);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      const t = window.setTimeout(() => {
        setLocalError(null);
        setSyncDoneBanner(null);
        setConfirmUnpin(false);
        setConfirmCloudUnlink(false);
        setCopiedCode(false);
        setCopiedLink(false);
        setNearbyBusy(false);
      }, 190);
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (confirmCloudUnlink && confirmCloudUnlinkRef.current) {
      confirmCloudUnlinkRef.current.scrollIntoView({
        behavior: motionEnabled ? 'smooth' : 'auto',
        block: 'nearest',
      });
    }
  }, [confirmCloudUnlink, motionEnabled]);

  useEffect(() => {
    if (confirmUnpin && confirmUnpinRef.current) {
      confirmUnpinRef.current.scrollIntoView({
        behavior: motionEnabled ? 'smooth' : 'auto',
        block: 'nearest',
      });
    }
  }, [confirmUnpin, motionEnabled]);

  useEffect(() => {
    if (isOpen && initialInviteCode && !cloudState.vaultId) {
      setJoinCodeInput(initialInviteCode);
      setShowJoinInput(true);
    }
  }, [isOpen, initialInviteCode, cloudState.vaultId]);

  useEffect(() => {
    if (!syncDoneBanner) return;
    const t = window.setTimeout(() => setSyncDoneBanner(null), 3000);
    return () => window.clearTimeout(t);
  }, [syncDoneBanner]);

  useEffect(() => {
    if (!copiedCode) return;
    const t = window.setTimeout(() => setCopiedCode(false), 2200);
    return () => window.clearTimeout(t);
  }, [copiedCode]);

  useEffect(() => {
    if (!copiedLink) return;
    const t = window.setTimeout(() => setCopiedLink(false), 2200);
    return () => window.clearTimeout(t);
  }, [copiedLink]);

  const hasNativeNearby = useHasNativeNearby();

  const isHusband = progress.role === 'husband';
  const isNative = isCapacitorNative();
  const isCloudLinked = Boolean(
    cloudUserEmail && cloudState.vaultId && cloudState.vaultKey
  );
  const parsedIncomingInvite = initialInviteCode ? parseCloudInviteCode(initialInviteCode) : null;
  const hasConflictingExistingVault = Boolean(
    parsedIncomingInvite &&
      cloudState.vaultId &&
      parsedIncomingInvite.vaultId !== cloudState.vaultId
  );
  const cloudInviteCode =
    cloudState.vaultId && cloudState.vaultKey
      ? `${cloudState.vaultId}.${cloudState.vaultKey}`
      : null;
  const inviteShareUrl = buildCloudInviteShareUrl(cloudInviteCode, {
    isCapacitorNative: isNative,
    publicAppUrl: import.meta.env?.VITE_PUBLIC_APP_URL,
  });
  const partnerAnswersCount = Object.values(progress.partnerSnapshot.answersBySet).reduce(
    (sum, qMap) => sum + Object.keys(qMap).length,
    0
  );

  const isNearbyActionDisabled = nearbyBusy || isStartingNearby || busState.status === 'connecting';

  const handleNearbyAction = async (fn: () => Promise<void>, fallbackMessage: string) => {
    if (nearbyBusy) return;
    onTapFeedback?.();
    setLocalError(null);
    setNearbyBusy(true);
    try {
      await fn();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setNearbyBusy(false);
    }
  };

  const handleTriggerDiscovery = () =>
    void handleNearbyAction(onStartNearbyDiscovery, 'تعذّر بدء البحث القريب');

  const handleSyncClick = async () => {
    if (nearbyBusy) return;
    onTapFeedback?.();
    setLocalError(null);
    setNearbyBusy(true);
    try {
      const ok = await onManualSyncNow();
      if (ok) {
        setSyncDoneBanner(
          isHusband
            ? 'تم إرسال طلب تحديث الإجابات من جهاز الشريكة'
            : 'تمت مزامنة أحدث الإجابات بنجاح'
        );
      } else {
        setLocalError('يرجى إتمام الاقتران القريب بين الجهازين أولاً');
      }
    } finally {
      setNearbyBusy(false);
    }
  };

  const handleDisconnectClick = () =>
    void handleNearbyAction(onDisconnect, 'تعذّر إنهاء الاقتران القريب');

  const handleCloudAction = async (fn: () => Promise<void>) => {
    onTapFeedback?.();
    setLocalError(null);
    setCloudBusy(true);
    try {
      await fn();
    } catch (err) {
      setLocalError(formatCloudErrorMessage(err, 'تعذّر إتمام المزامنة السحابية'));
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!cloudInviteCode) return;
    onTapFeedback?.();
    try {
      await navigator.clipboard.writeText(cloudInviteCode);
      setCopiedCode(true);
    } catch {
      setLocalError('تعذّر النسخ تلقائياً؛ يرجى تحديد الرمز ونسخه يدوياً');
    }
  };

  const handleShareInviteLink = async () => {
    if (!inviteShareUrl || !cloudInviteCode) return;
    onTapFeedback?.();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'دعوة ربط ليالي الورد',
          text: isHusband
            ? 'انضمي إلى خزنة ليالي الورد المشفّرة بيننا عبر هذا الرابط:'
            : 'انضم إلى خزنة ليالي الورد المشفّرة بيننا عبر هذا الرابط:',
          url: inviteShareUrl,
        });
        setSyncDoneBanner('تمت مشاركة رابط الدعوة بنجاح');
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Fallback to clipboard when native share sheet is unavailable
      }
    }
    try {
      await navigator.clipboard.writeText(inviteShareUrl);
      setCopiedLink(true);
    } catch {
      setLocalError('تعذّر نسخ رابط الدعوة تلقائياً');
    }
  };

  const resolvedNearbyError = nearbyError ?? busState.errorMessage;
  const visibleErrors: Array<{
    key: 'local' | 'nearby' | 'cloud';
    message: string;
    onDismiss?: () => void;
  }> = [];
  if (localError) {
    visibleErrors.push({
      key: 'local',
      message: localError,
      onDismiss: () => setLocalError(null),
    });
  }
  if (resolvedNearbyError && resolvedNearbyError !== localError) {
    visibleErrors.push({
      key: 'nearby',
      message: resolvedNearbyError,
      onDismiss: onClearNearbyError,
    });
  }
  if (
    cloudError &&
    cloudError !== localError &&
    cloudError !== resolvedNearbyError
  ) {
    visibleErrors.push({
      key: 'cloud',
      message: cloudError,
      onDismiss: onClearCloudError,
    });
  }

  const nearbySection = (
    <NearbySyncSection
      hasNativeNearby={hasNativeNearby}
      isHusband={isHusband}
      role={progress.role}
      busState={busState}
      nearbyPeers={nearbyPeers}
      isStartingNearby={isStartingNearby}
      connectingEndpointId={connectingEndpointId}
      nearbyBusy={nearbyBusy}
      isNearbyActionDisabled={isNearbyActionDisabled}
      onTriggerDiscovery={handleTriggerDiscovery}
      onPairNearbyPeer={(endpointId) =>
        void handleNearbyAction(
          () => onPairNearbyPeer(endpointId),
          'تعذّر إتمام الاقتران القريب'
        )
      }
      motionEnabled={motionEnabled}
    />
  );

  const cloudSection = (
    <CloudSyncSection
      isOnline={isOnline}
      isHusband={isHusband}
      cloudUserEmail={cloudUserEmail}
      cloudUserName={cloudUserName}
      cloudState={cloudState}
      cloudStatus={cloudStatus}
      cloudPartnerJoined={cloudPartnerJoined}
      cloudAutoSyncEnabled={progress.settings.cloudAutoSyncEnabled}
      serverExistingVaultId={serverExistingVaultId}
      initialInviteCode={initialInviteCode}
      hasVaultAccountMismatch={hasVaultAccountMismatch}
      hasConflictingExistingVault={hasConflictingExistingVault}
      cloudInviteCode={cloudInviteCode}
      cloudBusy={cloudBusy}
      joinCodeInput={joinCodeInput}
      setJoinCodeInput={setJoinCodeInput}
      showJoinInput={showJoinInput}
      setShowJoinInput={setShowJoinInput}
      confirmCloudUnlink={confirmCloudUnlink}
      setConfirmCloudUnlink={setConfirmCloudUnlink}
      confirmCloudUnlinkRef={confirmCloudUnlinkRef}
      copiedCode={copiedCode}
      copiedLink={copiedLink}
      formatTimestamp={formatSyncTimestamp}
      onTapFeedback={onTapFeedback}
      onCloudAction={handleCloudAction}
      onCloudSignIn={onCloudSignIn}
      onCloudSignOut={onCloudSignOut}
      onCreateCloudVault={onCreateCloudVault}
      onJoinCloudVault={onJoinCloudVault}
      onSwitchCloudVault={onSwitchCloudVault}
      onClearMismatchedLocalVault={onClearMismatchedLocalVault}
      onCloudSyncNow={onCloudSyncNow}
      onUnlinkCloudVault={onUnlinkCloudVault}
      onDismissPendingInvite={onDismissPendingInvite}
      onCopyInviteCode={handleCopyInviteCode}
      onShareInviteLink={handleShareInviteLink}
      onShowBanner={setSyncDoneBanner}
      motionEnabled={motionEnabled}
    />
  );

  return (
    <RoseModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="partner-sync-title"
      maxWidthClass="max-w-[366px]"
      motionEnabled={motionEnabled}
      insetFrame={false}
      scrollableBody
      cardPaddingClass="p-0"
    >
      <div className="flex-1 min-h-0 max-h-[86dvh] overflow-y-auto ad-no-scrollbar px-4 pt-3.5 pb-4 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-white to-[#FFE2ED] border border-[#E88FB2] flex items-center justify-center text-[#D6286C] shrink-0 shadow-xs">
                  {hasNativeNearby ? (
                    <Bluetooth className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Cloud className="w-4 h-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#5E364A]">
                    {hasNativeNearby
                      ? 'مزامنة مباشرة بدون إنترنت وسحابية'
                      : 'مزامنة سحابية مشفّرة بين الهاتفين'}
                  </p>
                  <h2
                    id="partner-sync-title"
                    className="font-display-ar text-xl font-bold text-[#360D21] leading-snug"
                  >
                    الربط والمزامنة بين الزوجين
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق نافذة الاقتران والمزامنة"
                className="min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#5E364A] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shrink-0 shadow-sm"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div>
              <RoseDivider color="#D6286C" />
            </div>

            {/* 1. Hero Live Connection & Sync Summary */}
            <div className="ad-cut-tile bg-gradient-to-br from-[#FFF9FB] via-[#FFF0F6] to-[#FFE4EE] border-[1.5px] border-[#D6286C]/42 p-3 flex flex-col gap-2 shadow-[0_10px_24px_rgba(214,40,108,0.12)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#360D21] flex items-center gap-1.5">
                  {busState.status === 'connected' || (isCloudLinked && cloudPartnerJoined) ? (
                    <CheckCircle2 className="w-4 h-4 text-[#D6286C]" aria-hidden="true" />
                  ) : (
                    <Wifi className="w-4 h-4 text-[#7B3556]" aria-hidden="true" />
                  )}
                  <span>
                    {busState.status === 'connected'
                      ? `متصل الآن مع ${busState.peerName ?? progress.partnerSnapshot.partnerName}`
                      : isCloudLinked && cloudStatus === 'error'
                        ? 'تعذّرت المزامنة السحابية الآن'
                        : isCloudLinked && cloudStatus === 'offline-pending'
                          ? 'مزامنة معلّقة · ستُرفع عند توفر الإنترنت'
                          : isCloudLinked && cloudPartnerJoined
                            ? 'متصل سحابياً · الطرفان في نفس الخزنة'
                            : isCloudLinked && !cloudPartnerJoined
                              ? isHusband
                                ? 'بانتظار دخول الشريكة بالرمز السحابي'
                                : 'بانتظار دخول الشريك بالرمز السحابي'
                              : busState.status === 'discovering'
                                ? 'جارٍ البحث عن الجهاز القريب...'
                                : busState.status === 'waiting-peer'
                                  ? 'بانتظار قبول الاقتران...'
                                  : busState.status === 'connecting'
                                    ? 'جارٍ فتح القناة المشفرة...'
                                    : busState.status === 'error'
                                      ? 'تعذّر الاتصال القريب'
                                      : 'غير مقترن بجهاز آخر حالياً'}
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-[#5E364A] tabular-nums-ar shrink-0">
                  {isNative ? 'تطبيق أندرويد' : 'نسخة الويب'}
                </span>
              </div>

              {isHusband && (
                <div className="flex items-center justify-between text-[11px] text-[#5E364A] border-t border-[#EBC1D2] pt-2 tabular-nums-ar">
                  <span>
                    اختيارات {progress.partnerSnapshot.partnerName}:{' '}
                    {formatQuestionsCountArabic(partnerAnswersCount)}
                  </span>
                  <span>{formatSyncTimestamp(progress.partnerSnapshot.lastSyncedAt)}</span>
                </div>
              )}

              {busState.status === 'connected' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={nearbyBusy}
                    onClick={() => void handleSyncClick()}
                    className="min-h-[44px] px-3 ad-cut-chip bg-[#D6286C] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-95 active:scale-[0.97] transition-[transform,filter] duration-150 disabled:opacity-65 disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${motionEnabled && nearbyBusy ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>{isHusband ? 'تحديث الإجابات' : 'مزامنة الآن'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={nearbyBusy}
                    onClick={handleDisconnectClick}
                    className="min-h-[44px] px-3 ad-cut-chip bg-white border border-[#EFCBD7] text-[#8E184B] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#FCEEF3] active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:opacity-65 disabled:cursor-not-allowed"
                  >
                    <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>إنهاء الاقتران</span>
                  </button>
                </div>
              )}
            </div>

            {/* 1.5 Explicit 4-Digit Cryptographic Pairing Confirmation Prompt */}
            {pendingPairingRequest && (
              <div
                role="alertdialog"
                aria-labelledby="pairing-verify-title"
                className={`relative z-10 ad-cut-tile bg-[#FFF9FB] border-[1.5px] border-[#D6286C] p-3.5 flex flex-col gap-2.5 shadow-[0_12px_28px_rgba(214,40,108,0.16)] ${
                  motionEnabled ? 'ad-anim-toast-in' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-9 h-9 ad-cut-chip bg-gradient-to-br from-[#D6286C] to-[#9E194D] text-white flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 id="pairing-verify-title" className="text-xs font-bold text-[#360D21]">
                      طلب اقتران قريب من «{pendingPairingRequest.label}»
                    </h3>
                    <p className="text-[11px] text-[#5E364A] leading-relaxed mt-0.5">
                      {isHusband
                        ? 'تأكّد من تطابق رمز التحقق الظاهر على الجهازين قبل القبول:'
                        : 'تأكّدي من تطابق رمز التحقق الظاهر على الجهازين قبل القبول:'}
                    </p>
                  </div>
                </div>

                <div
                  dir="ltr"
                  className="ad-cut-chip bg-[#FFF6F9] py-2 px-3 text-center font-display-ar text-2xl font-extrabold tracking-[0.35em] text-[#9E194D] tabular-nums"
                >
                  {pendingPairingRequest.authDigits}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={nearbyBusy}
                    onClick={() => {
                      if (onAcceptPairing) {
                        void handleNearbyAction(
                          () => onAcceptPairing(pendingPairingRequest.endpointId),
                          'تعذّر قبول الاقتران القريب'
                        );
                      }
                    }}
                    className="min-h-[44px] ad-cut-chip bg-[#D6286C] text-white text-xs font-bold cursor-pointer hover:brightness-95 active:scale-[0.97] transition-[transform,filter] duration-150 disabled:opacity-65"
                  >
                    تأكيد الاقتران
                  </button>
                  <button
                    type="button"
                    disabled={nearbyBusy}
                    onClick={() => {
                      if (onRejectPairing) {
                        void handleNearbyAction(
                          () => onRejectPairing(pendingPairingRequest.endpointId),
                          'تعذّر رفض طلب الاقتران'
                        );
                      }
                    }}
                    className="min-h-[44px] ad-cut-chip bg-[#FCEEF3] text-[#8E184B] text-xs font-bold cursor-pointer hover:bg-[#FADCE7] active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:opacity-65"
                  >
                    رفض
                  </button>
                </div>
              </div>
            )}

            {hasNativeNearby ? (
              <>
                {nearbySection}
                {cloudSection}
              </>
            ) : (
              <>
                {cloudSection}
                {nearbySection}
              </>
            )}

            {/* Compact Device Role & Pinned Device Metadata Strip */}
            <div className="relative z-10 ad-cut-tile bg-white/78 border border-[#F1CEDB] px-3 py-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-3.5 h-3.5 text-[#D6286C] shrink-0" aria-hidden="true" />
                <p className="text-[11px] text-[#5E364A] leading-snug truncate">
                  <span className="font-bold text-[#360D21]">
                    {isHusband ? 'نسخة الزوج:' : 'نسخة الزوجة:'}
                  </span>{' '}
                  {isHusband
                    ? 'تستقبل اختيارات الزوجة تلقائياً دون تعديل'
                    : 'تحفظ اختياراتكِ وتشاركها تلقائياً عند الربط'}
                </p>
              </div>

              {progress.partnerSnapshot.pairedDeviceId && (
                <div className="border-t border-[#F7DCE6] pt-1.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#5E364A] flex items-center gap-1.5 min-w-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D6286C] shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        الجهاز الموثوق المثبت: {progress.partnerSnapshot.pairedDeviceLabel || progress.partnerSnapshot.partnerName}
                      </span>
                    </span>
                    {onUnpinPartnerDevice && !confirmUnpin && (
                      <button
                        type="button"
                        onClick={() => {
                          onTapFeedback?.();
                          setConfirmUnpin(true);
                        }}
                        className="min-h-[44px] px-3 ad-cut-chip bg-[#FCEEF3] text-[#8E184B] text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 hover:bg-[#FADCE7] active:scale-[0.97] transition-[background-color,transform] duration-150"
                      >
                        <Unlink className="w-3 h-3" aria-hidden="true" />
                        <span>فك التثبيت</span>
                      </button>
                    )}
                  </div>

                  {confirmUnpin && onUnpinPartnerDevice && (
                    <InlineConfirmBox
                      containerRef={confirmUnpinRef}
                      variant="primary"
                      centeredText={false}
                      message={
                        isHusband
                          ? 'فك تثبيت الجهاز يسمح بالاقتران بهاتف جديد مع الإبقاء على الاختيارات المزامنة مسبقاً. هل تودّ المتابعة؟'
                          : 'فك تثبيت الجهاز يسمح بالاقتران بهاتف جديد مع الإبقاء على الاختيارات المحفوظة. هل تودّين المتابعة؟'
                      }
                      confirmLabel="تأكيد فك التثبيت"
                      cancelLabel="تراجع"
                      onConfirm={() => {
                        onTapFeedback?.();
                        onUnpinPartnerDevice();
                        setConfirmUnpin(false);
                      }}
                      onCancel={() => setConfirmUnpin(false)}
                    />
                  )}
                </div>
              )}
            </div>

            {cloudNotice && visibleErrors.length === 0 && (
              <div
                role="status"
                aria-live="polite"
                className={`ad-cut-tile bg-[#FFF6F9] border border-[#E8AFC3] px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-[#5E364A] ${
                  motionEnabled ? 'ad-anim-toast-in' : ''
                }`}
              >
                <span>{cloudNotice}</span>
                {onDismissCloudNotice && (
                  <button
                    type="button"
                    onClick={onDismissCloudNotice}
                    aria-label="إغلاق التنبيه"
                    className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#8E184B] hover:bg-[#FADCE7] active:scale-95 transition-[background-color,transform] duration-150 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {visibleErrors.map((errItem) => (
              <div
                key={errItem.key}
                role="alert"
                className={`ad-cut-tile bg-[#FFF0F4] border border-[#E89CB7] ps-3 pe-1 py-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-[#9E194D] ${
                  motionEnabled ? 'ad-anim-toast-in' : ''
                }`}
              >
                <span className="flex-1 text-right leading-relaxed">{errItem.message}</span>
                {errItem.onDismiss && (
                  <button
                    type="button"
                    onClick={errItem.onDismiss}
                    aria-label="إغلاق رسالة الخطأ"
                    className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#8E184B] hover:bg-[#FADCE7] active:scale-95 transition-[background-color,transform] duration-150 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}

            {syncDoneBanner && (
              <div
                role="status"
                aria-live="polite"
                className={`ad-cut-tile bg-white border border-[#D6286C]/40 px-3 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-[#360D21] ${
                  motionEnabled ? 'ad-anim-toast-in' : ''
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#D6286C]" aria-hidden="true" />
                <span>{syncDoneBanner}</span>
              </div>
            )}

            {onOpenChat && (
              <button
                type="button"
                onClick={() => {
                  onTapFeedback?.();
                  onClose();
                  onOpenChat();
                }}
                className="w-full min-h-[44px] ad-cut-tile bg-[#FCEEF3] border border-[#E8AFC3] text-[#360D21] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150"
              >
                <MessageCircleHeart className="w-4 h-4 text-[#D6286C]" aria-hidden="true" />
                <span>فتح غرفة الدردشة الحية بين الزوجين</span>
              </button>
            )}
      </div>
    </RoseModalShell>
  );
}
