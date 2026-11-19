import React, { useEffect, useRef, useState } from 'react';
import {
  Bluetooth,
  CheckCircle2,
  Clock,
  Cloud,
  Link2,
  Lock,
  MessageCircleHeart,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import type { ChatMessage, DeviceRole, GameProgress } from '../data/types';
import { toArabicDigits } from '../game/engine';
import { useHasNativeNearby } from '../sync/usePlatformCapabilities';
import type { LinkConnectionStatus } from '../sync/liveBus';
import type { CloudSyncStatus } from '../sync/cloudSync';
import { BrandMark } from './BrandMark';
import { RoseDivider, WhisperPetalIcon } from './RoseFiligree';
import { InlineConfirmBox } from './SharedUI';

interface ChatRoomScreenProps {
  progress: GameProgress;
  messages: ChatMessage[];
  nearbyStatus: LinkConnectionStatus;
  nearbyPeerName: string | null;
  cloudStatus: CloudSyncStatus;
  isCloudLinked: boolean;
  cloudPartnerJoined?: boolean;
  cloudAutoSyncEnabled?: boolean;
  isOnline: boolean;
  draftValue?: string;
  onDraftChange?: (value: string) => void;
  prefillDraft?: string | null;
  failedCloudChatIds?: string[];
  onRetryCloudMessage?: (messageId: string) => void;
  onPrefillConsumed?: () => void;
  onSendMessage: (text: string) => void;
  onClearChat: () => Promise<'cleared-all' | 'cleared-local-queued' | 'cleared-local' | void>;
  onOpenSyncModal: () => void;
  onTapFeedback?: () => void;
  motionEnabled: boolean;
  transitionClassName?: string;
}

function getQuickWhispers(role: DeviceRole): string[] {
  if (role === 'wife') {
    return [
      'كيف تجد أجواءنا الليلة؟',
      'أفكر في اختياري الأخير الآن',
      'هل نفتح مستوى جديداً معاً؟',
    ];
  }
  return [
    'كيف تجدين أجواءنا الليلة؟',
    'أفكر في إجابتكِ الأخيرة الآن',
    'هل نفتح مستوى جديداً معاً؟',
  ];
}

const TIME_FORMATTER: Intl.DateTimeFormat | null = (() => {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
})();

const DAY_FORMATTER: Intl.DateTimeFormat | null = (() => {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return null;
  }
})();

function formatMessageTime(ts: number): string {
  if (!TIME_FORMATTER) return '';
  try {
    return TIME_FORMATTER.format(new Date(ts));
  } catch {
    return '';
  }
}

function getDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatMessageDayLabel(ts: number, todayKey: string, yesterdayKey: string): string {
  const targetKey = getDayKey(ts);
  if (targetKey === todayKey) return 'اليوم';
  if (targetKey === yesterdayKey) return 'أمس';
  if (!DAY_FORMATTER) return '';
  try {
    return DAY_FORMATTER.format(new Date(ts));
  } catch {
    return '';
  }
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  role: DeviceRole;
  failedCloudChatIds: string[];
  canQueueCloudDelivery: boolean;
  isNearbyConnected: boolean;
  motionEnabled: boolean;
  onRetryCloudMessage?: (messageId: string) => void;
  onTapFeedback?: () => void;
}

const ChatMessageList = React.memo(function ChatMessageList({
  messages,
  role,
  failedCloudChatIds,
  canQueueCloudDelivery,
  isNearbyConnected,
  motionEnabled,
  onRetryCloudMessage,
  onTapFeedback,
}: ChatMessageListProps) {
  const isHusband = role === 'husband';
  const failedSet = React.useMemo(() => new Set(failedCloudChatIds), [failedCloudChatIds]);
  const knownIdsRef = useRef<Set<string>>(new Set(messages.map((m) => m.id)));
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (messages.length === 0) {
      knownIdsRef.current.clear();
      setAnimatedIds((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }
    const newlyAdded: string[] = [];
    for (const m of messages) {
      if (!knownIdsRef.current.has(m.id)) {
        knownIdsRef.current.add(m.id);
        newlyAdded.push(m.id);
      }
    }
    if (newlyAdded.length > 0) {
      setAnimatedIds((prev) => {
        const next = new Set(prev);
        for (const id of newlyAdded) {
          next.add(id);
        }
        return next;
      });
    }
  }, [messages]);

  const now = new Date();
  const todayKey = getDayKey(now.getTime());
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getDayKey(yesterday.getTime());

  return (
    <>
      {messages.map((msg, idx) => {
        const isMine = msg.senderRole === role;
        const shouldAnimateIn = motionEnabled && animatedIds.has(msg.id);
        const prevMsg = idx > 0 ? messages[idx - 1] : null;
        const showDayDivider =
          !prevMsg || getDayKey(prevMsg.createdAt) !== getDayKey(msg.createdAt);
        const dayLabel = showDayDivider
          ? formatMessageDayLabel(msg.createdAt, todayKey, yesterdayKey)
          : '';
        return (
          <React.Fragment key={msg.id}>
            {showDayDivider && dayLabel && (
              <div className="my-1.5 flex items-center gap-2.5 px-2" aria-label={`محادثات ${dayLabel}`}>
                <span className="h-px flex-1 bg-gradient-to-l from-[#E894B5]/55 to-transparent" />
                <span className="text-[11px] font-bold text-[#5E364A] shrink-0">
                  {dayLabel}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-[#E894B5]/55 to-transparent" />
              </div>
            )}
            <div
              className={`flex flex-col max-w-[84%] ${
                isMine ? 'self-start items-start' : 'self-end items-end'
              } ${shouldAnimateIn ? 'ad-anim-message-in' : ''}`}
            >
              <div
                className={`px-3.5 py-2.5 text-[13px] leading-relaxed break-words shadow-xs ${
                  isMine
                    ? 'rounded-[22px_6px_22px_6px] bg-gradient-to-br from-[#D6286C] to-[#AD1A54] text-white shadow-[0_6px_16px_rgba(173,26,84,0.18)]'
                    : 'rounded-[6px_22px_6px_22px] bg-white/95 border border-[#F1AFC8] text-[#360D21]'
                }`}
              >
                {msg.text}
              </div>

              <div className="mt-1 px-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#5E364A] tabular-nums-ar">
                <span>{isMine ? (isHusband ? 'أنت' : 'أنتِ') : msg.senderName}</span>
                <span>·</span>
                <span>{formatMessageTime(msg.createdAt)}</span>
                {isMine && (
                  <span className="inline-flex items-center gap-1 text-[#9E194D]">
                    {failedSet.has(msg.id) && onRetryCloudMessage ? (
                      <button
                        type="button"
                        onClick={() => {
                          onTapFeedback?.();
                          onRetryCloudMessage(msg.id);
                        }}
                        aria-label="إعادة محاولة إرسال الرسالة"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 ad-cut-chip bg-[#FFF0F4] border border-[#E89CB7] text-[10.5px] font-bold text-[#B92859] hover:bg-[#FADCE7] active:scale-[0.97] transition-[background-color,transform] duration-150 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>تعذّر الإرسال · إعادة</span>
                      </button>
                    ) : msg.deliveredVia === 'hybrid' ? (
                      <span
                        className="inline-flex items-center gap-0.5"
                        title="وصلت عبر البلوتوث والسحابة"
                        aria-label="وصلت عبر البلوتوث والسحابة"
                      >
                        <Bluetooth className="w-3.5 h-3.5" aria-hidden="true" />
                        <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    ) : msg.deliveredVia === 'nearby' ? (
                      <span title="وصلت عبر الاتصال القريب" aria-label="وصلت عبر الاتصال القريب">
                        <Bluetooth className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    ) : msg.deliveredVia === 'cloud' ? (
                      <span title="وصلت عبر السحابة المشفّرة" aria-label="وصلت عبر السحابة المشفّرة">
                        <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    ) : (msg.pendingCloudUpload && canQueueCloudDelivery) ||
                      (msg.pendingNearbyAck && isNearbyConnected) ? (
                      <span
                        className="inline-flex items-center gap-0.5 text-[#5E364A]"
                        title="بانتظار الإرسال"
                        aria-label="بانتظار الإرسال"
                      >
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-0.5 text-[#5E364A]"
                        title="محفوظة محلياً فقط — اربط الهاتفين للإرسال"
                        aria-label="محفوظة محلياً فقط"
                      >
                        <Smartphone className="w-3 h-3" aria-hidden="true" />
                        <span className="text-[10.5px]">محلي فقط</span>
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
});

export function ChatRoomScreen({
  progress,
  messages,
  nearbyStatus,
  nearbyPeerName,
  cloudStatus,
  isCloudLinked,
  cloudPartnerJoined = false,
  cloudAutoSyncEnabled = true,
  isOnline,
  draftValue,
  onDraftChange,
  prefillDraft = null,
  failedCloudChatIds = [],
  onRetryCloudMessage,
  onPrefillConsumed,
  onSendMessage,
  onClearChat,
  onOpenSyncModal,
  onTapFeedback,
  motionEnabled,
  transitionClassName = 'ad-anim-screen-curtain',
}: ChatRoomScreenProps) {
  const [internalDraft, setInternalDraft] = useState('');
  const draft = draftValue !== undefined ? draftValue : internalDraft;
  const setDraft = (next: string) => {
    if (onDraftChange) {
      onDraftChange(next);
    } else {
      setInternalDraft(next);
    }
  };
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearNotice, setClearNotice] = useState<string | null>(null);
  const [showWhisperPicker, setShowWhisperPicker] = useState(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const composerAreaRef = useRef<HTMLFormElement | null>(null);
  const clearNoticeTimerRef = useRef<number | null>(null);

  const hasNativeNearby = useHasNativeNearby();
  const isHusband = progress.role === 'husband';
  const quickWhispers = getQuickWhispers(progress.role);
  const isNearbyConnected = nearbyStatus === 'connected';
  const isCloudLive =
    isCloudLinked &&
    isOnline &&
    progress.settings.cloudAutoSyncEnabled &&
    cloudStatus !== 'signed-out' &&
    cloudStatus !== 'unlinked';

  const partnerTitle =
    nearbyPeerName ||
    progress.partnerSnapshot.partnerName ||
    (progress.role === 'husband' ? 'الشريكة' : 'الشريك');

  useEffect(() => {
    listEndRef.current?.scrollIntoView({
      behavior: motionEnabled ? 'smooth' : 'auto',
      block: 'end',
    });
  }, [messages.length, showWhisperPicker, motionEnabled]);

  useEffect(() => {
    if (!confirmClear && !showWhisperPicker) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmClear(false);
        setShowWhisperPicker(false);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (confirmClear && headerRef.current && !headerRef.current.contains(target)) {
        setConfirmClear(false);
      }
      if (showWhisperPicker && composerAreaRef.current && !composerAreaRef.current.contains(target)) {
        setShowWhisperPicker(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [confirmClear, showWhisperPicker]);

  useEffect(() => {
    if (!prefillDraft) return;
    setDraft(prefillDraft);
    onPrefillConsumed?.();
    window.setTimeout(() => {
      composerRef.current?.focus();
    }, 60);
  }, [prefillDraft, onPrefillConsumed]);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    if (!draft) {
      el.style.height = '44px';
      return;
    }
    const rafId = window.requestAnimationFrame(() => {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [draft]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = draft.trim();
    if (!clean) return;
    onTapFeedback?.();
    onSendMessage(clean);
    setDraft('');
    setShowWhisperPicker(false);
  };

  useEffect(() => {
    return () => {
      if (clearNoticeTimerRef.current !== null) {
        window.clearTimeout(clearNoticeTimerRef.current);
      }
    };
  }, []);

  const handleConfirmClear = async () => {
    onTapFeedback?.();
    setIsClearing(true);
    try {
      const outcome = await onClearChat();
      setConfirmClear(false);
      const noticeText =
        outcome === 'cleared-all'
          ? 'تم مسح المحادثة محلياً وسحابياً'
          : outcome === 'cleared-local-queued'
            ? 'تم مسح المحادثة محلياً؛ سيُطبَّق المسح على السحابة فور توفر الإنترنت'
            : 'تم مسح المحادثة من هذا الجهاز';
      setClearNotice(noticeText);
      if (clearNoticeTimerRef.current !== null) {
        window.clearTimeout(clearNoticeTimerRef.current);
      }
      clearNoticeTimerRef.current = window.setTimeout(() => {
        setClearNotice(null);
      }, 3200);
    } finally {
      setIsClearing(false);
    }
  };

  const channelSummary =
    isNearbyConnected && isCloudLive
      ? 'متصل بالبلوتوث والإنترنت معاً'
      : isNearbyConnected
        ? 'متصل بالبلوتوث / Wi-Fi Direct'
        : isCloudLive && cloudPartnerJoined
          ? 'متصل سحابياً بتشفير خاص'
          : isCloudLive && !cloudPartnerJoined
            ? isHusband
              ? 'خزنة مشفّرة · بانتظار الشريكة'
              : 'خزنة مشفّرة · بانتظار الشريك'
            : isCloudLinked && !isOnline
              ? 'دون إنترنت · الإرسال تلقائياً عند العودة'
              : hasNativeNearby
                ? 'جاهز للربط القريب أو السحابي'
                : 'جاهز للربط السحابي بين الهاتفين';

  return (
    <section
      className={`relative flex-1 min-h-0 flex flex-col overflow-hidden ${
        motionEnabled ? transitionClassName : ''
      }`}
      aria-label="غرفة الدردشة الحية"
    >
      {/* Compact Editorial Masthead Header */}
      <header
        ref={headerRef}
        className="shrink-0 px-3 sm:px-4 pt-safe pb-1.5 bg-gradient-to-b from-[#FFF9FB]/92 to-transparent"
      >
        <div className="grid grid-cols-[minmax(7.5rem,1fr)_auto_minmax(7.5rem,1fr)] items-center gap-1 min-h-[44px]">
          <button
            type="button"
            disabled={messages.length === 0 || isClearing}
            onClick={() => {
              onTapFeedback?.();
              setConfirmClear((prev) => !prev);
            }}
            aria-label="مسح سجل المحادثة"
            className="justify-self-start min-w-[44px] min-h-[44px] rounded-full bg-white/90 border border-[#F1AFC8] flex items-center justify-center text-[#8E184B] cursor-pointer hover:bg-[#FCEEF3] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs transition-[background-color,transform] duration-150"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex items-center justify-center">
            <BrandMark />
          </div>

          <span className="justify-self-end" aria-hidden="true" />
        </div>

        {/* Single Hairline Partner & Encrypted Channel Summary */}
        <div className="mt-1.5 pt-1.5 border-t border-[#F1AFC8]/60 flex items-center justify-between gap-2 text-[11px] font-semibold text-[#5E364A]">
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-bold text-[#360D21] shrink-0 truncate max-w-[44%]">
              دردشة مع {partnerTitle}
            </span>
            <span className="text-[#D6286C]/65 shrink-0" aria-hidden="true">·</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#D6286C] shrink-0" aria-hidden="true" />
            <span className="truncate">{channelSummary}</span>
          </span>
          <span className="flex items-center gap-1 text-[#5E364A] shrink-0">
            <Lock className="w-3 h-3 text-[#D6286C]" aria-hidden="true" />
            <span>مشفّر</span>
          </span>
        </div>

        {confirmClear && (
          <InlineConfirmBox
            variant="destructive"
            className="mt-2 shadow-sm"
            busy={isClearing}
            message={
              isHusband
                ? 'سيتم مسح رسائل هذه المحادثة من الجهازين (محلياً وسحابياً). هل تودّ المتابعة؟'
                : 'سيتم مسح رسائل هذه المحادثة من الجهازين (محلياً وسحابياً). هل تودّين المتابعة؟'
            }
            confirmLabel={isClearing ? 'جارٍ المسح...' : 'تأكيد المسح'}
            cancelLabel="تراجع"
            onConfirm={() => void handleConfirmClear()}
            onCancel={() => setConfirmClear(false)}
          />
        )}

        {clearNotice && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-2 ad-cut-tile bg-[#FFF6F9] border border-[#D6286C]/35 px-3 py-2 flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-[#360D21] shadow-xs ${
              motionEnabled ? 'ad-anim-toast-in' : ''
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#D6286C] shrink-0" aria-hidden="true" />
            <span>{clearNotice}</span>
          </div>
        )}
      </header>

      {/* Scrollable Messages Viewport */}
      <div className="flex-1 min-h-0 overflow-y-auto ad-no-scrollbar px-4 py-2 flex flex-col gap-2.5">
        {messages.length === 0 ? (
          <div className="my-auto ad-cut-card bg-white/88 border border-[#F1AFC8] p-4 flex flex-col items-center text-center gap-2.5 shadow-[0_12px_28px_rgba(180,34,106,0.08)]">
            <span className="w-11 h-11 rounded-full bg-gradient-to-br from-white to-[#FFE2ED] border border-[#E88FB2] flex items-center justify-center text-[#D6286C]">
              <MessageCircleHeart className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h1 className="font-display-ar text-lg font-bold text-[#360D21]">
                مساحة همس خاصة بكما
              </h1>
              <p className="text-xs text-[#5E364A] leading-relaxed max-w-[30ch]">
                {hasNativeNearby
                  ? 'تعمل تلقائياً عبر البلوتوث وWi-Fi Direct في وضع عدم الاتصال، وعبر السحابة المشفّرة عند توفر الإنترنت.'
                  : 'مساحة همس خاصة ومشفّرة بين الزوجين تتزامن لحظياً عبر السحابة عند الربط بين الهاتفين.'}
              </p>
            </div>

            <div className="w-28">
              <RoseDivider color="#D6286C" />
            </div>

            <div className="w-full flex flex-col gap-1.5 pt-1">
              {quickWhispers.map((whisper) => (
                <button
                  key={whisper}
                  type="button"
                  onClick={() => {
                    onTapFeedback?.();
                    setDraft(whisper);
                    window.setTimeout(() => {
                      composerRef.current?.focus();
                    }, 0);
                  }}
                  className="w-full min-h-[44px] px-3 py-2 ad-cut-chip bg-[#FFF6F9] border border-[#F1AFC8] text-xs font-semibold text-[#360D21] hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer text-right"
                >
                  «{whisper}»
                </button>
              ))}
            </div>

            {!isNearbyConnected && !isCloudLinked && (
              <button
                type="button"
                onClick={() => {
                  onTapFeedback?.();
                  onOpenSyncModal();
                }}
                className="w-full min-h-[44px] mt-1 ad-cut-tile bg-[#D6286C] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-[transform,filter] duration-150 shadow-sm"
              >
                <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>إعداد الربط بين الهاتفين الآن</span>
              </button>
            )}
          </div>
        ) : (
          <ChatMessageList
            messages={messages}
            role={progress.role}
            failedCloudChatIds={failedCloudChatIds}
            canQueueCloudDelivery={isCloudLinked && cloudAutoSyncEnabled}
            isNearbyConnected={isNearbyConnected}
            motionEnabled={motionEnabled}
            onRetryCloudMessage={onRetryCloudMessage}
            onTapFeedback={onTapFeedback}
          />
        )}
        <div ref={listEndRef} />
      </div>

      {/* Bottom Message Composer — pb-nav-dock clears BottomNavDock 14px protruding crown rose */}
      <form
        ref={composerAreaRef}
        onSubmit={handleSubmit}
        className="shrink-0 px-3 sm:px-4 pt-2.5 pb-nav-dock bg-gradient-to-t from-[#FFEBF2] via-[#FFF8FB]/96 to-transparent border-t border-[#F1AFC8]/75 shadow-[0_-8px_20px_rgba(255,233,241,0.7)]"
      >
        {messages.length > 0 && showWhisperPicker && (
          <div className={`mb-2 flex flex-col gap-1.5 ${motionEnabled ? 'ad-anim-toast-in' : ''}`}>
            {quickWhispers.map((whisper) => (
              <button
                key={whisper}
                type="button"
                onClick={() => {
                  onTapFeedback?.();
                  setDraft(whisper);
                  setShowWhisperPicker(false);
                  composerRef.current?.focus();
                }}
                className="w-full min-h-[44px] px-3 py-2 ad-cut-chip bg-white/95 border border-[#EFCBD7] text-[11px] font-semibold text-[#360D21] hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer text-right truncate"
              >
                «{whisper}»
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onTapFeedback?.();
                setShowWhisperPicker((prev) => !prev);
              }}
              aria-label="همسات سريعة مقترحة"
              aria-expanded={showWhisperPicker}
              className={`min-w-[44px] min-h-[44px] ad-cut-chip border flex items-center justify-center cursor-pointer active:scale-95 transition-[background-color,border-color,color,transform] duration-150 shrink-0 ${
                showWhisperPicker
                  ? 'bg-[#D6286C] border-[#D6286C] text-white'
                  : 'bg-white border-[#E8AFC3] text-[#D6286C] hover:bg-[#FCEEF3]'
              }`}
            >
              <WhisperPetalIcon className="w-4 h-4" />
            </button>
          )}
          <label htmlFor="chat-composer-input" className="sr-only">
            {isHusband ? 'اكتب رسالتك هنا' : 'اكتبي رسالتكِ هنا'}
          </label>
          <textarea
            ref={composerRef}
            id="chat-composer-input"
            dir="rtl"
            rows={1}
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={isHusband ? 'اكتب همسة أو رسالة حية...' : 'اكتبي همسة أو رسالة حية...'}
            className="flex-1 min-h-[44px] max-h-[110px] resize-none ad-cut-chip bg-white border border-[#E8AFC3] px-3.5 py-2.5 text-xs sm:text-[13px] text-[#360D21] placeholder:text-[#5E364A] focus:outline-none focus:border-[#D6286C] shadow-xs"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="إرسال الرسالة"
            className="min-w-[44px] min-h-[44px] ad-cut-chip bg-gradient-to-br from-[#D6286C] to-[#AD1A54] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(214,40,108,0.28)] cursor-pointer hover:brightness-95 active:scale-[0.96] transition-[transform,filter,opacity] duration-150 disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4 -scale-x-100" aria-hidden="true" />
          </button>
        </div>

        {draft.length >= 850 && (
          <div className="mt-1 flex justify-end px-1">
            <span
              className={`text-[10.5px] font-bold tabular-nums-ar ${
                draft.length >= 970 ? 'text-[#A61B48]' : 'text-[#5E364A]'
              }`}
            >
              {toArabicDigits(draft.length)} / ١٠٠٠
            </span>
          </div>
        )}
      </form>
    </section>
  );
}
