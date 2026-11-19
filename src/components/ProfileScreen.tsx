import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pencil,
  Check,
  X,
  Settings,
  ChevronLeft,
  Bluetooth,
  Cloud,
} from 'lucide-react';
import type {
  DeviceRole,
  GameMode,
  GameProgress,
  GameRealm,
  GameSettings,
} from '../data/types';
import {
  formatQuestionsCountArabic,
  getPlatformProgress,
  type PartnerConnectionStatus,
  toArabicDigits,
} from '../game/engine';
import { useHasNativeNearby } from '../sync/usePlatformCapabilities';
import type { LinkConnectionStatus } from '../sync/liveBus';
import type { PinSetupMode } from './PrivacyLockOverlay';
import { ProfileSettingsModal } from './profile/ProfileSettingsModal';
import {
  CornerRoseFiligree,
  RoseDivider,
  RoseRingProgress,
} from './RoseFiligree';

interface ProfileScreenProps {
  modes: GameMode[];
  realms: GameRealm[];
  progress: GameProgress;
  busStatus?: LinkConnectionStatus;
  connectionStatus?: PartnerConnectionStatus;
  pinEnabled: boolean;
  lockOnBackground: boolean;
  isSettingsOpen: boolean;
  isPinModalOpen?: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onUpdateName: (name: string) => void;
  onToggleSetting: (key: keyof GameSettings) => void;
  onSwitchRole?: (targetRole: DeviceRole) => Promise<void> | void;
  onOpenPinSetup: (mode: PinSetupMode) => void;
  onToggleLockOnBackground: () => void;
  onLockNow: () => void;
  onResetAllProgress: () => void;
  onOpenLog?: () => void;
  onOpenSyncModal?: () => void;
  onTapFeedback?: () => void;
  motionEnabled: boolean;
  transitionClassName?: string;
}

const SEAL_MINI_PETALS = [
  { startX: '-14px', startY: '-16px', bx: '-12px', by: '-44px', br: '-35deg', size: 10, delay: '0ms' },
  { startX: '4px', startY: '-20px', bx: '12px', by: '-50px', br: '22deg', size: 12, delay: '25ms' },
  { startX: '18px', startY: '-12px', bx: '36px', by: '-38px', br: '56deg', size: 10, delay: '45ms' },
  { startX: '18px', startY: '4px', bx: '42px', by: '-14px', br: '84deg', size: 9, delay: '70ms' },
];

/**
 * زر الختم الملكي للإعدادات — بالتصميم الدائري المطابق للختم الملكي في الرئيسية مع إبراز أيقونة وتسمية «الإعدادات»
 */
function SettingsRoyalSealButton({
  isOpen,
  motionEnabled,
  onClick,
}: {
  isOpen: boolean;
  motionEnabled: boolean;
  onClick: () => void;
}) {
  const [burstId, setBurstId] = useState(0);
  const burstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
    };
  }, []);

  const handlePress = () => {
    if (motionEnabled) {
      setBurstId(Date.now());
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
      burstTimerRef.current = window.setTimeout(() => {
        setBurstId(0);
        burstTimerRef.current = null;
      }, 920);
    }
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handlePress}
      aria-label="الإعدادات"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      className="group relative inline-flex flex-col items-center gap-1 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D6286C] rounded-full"
    >
      <span className="relative w-14 h-14 flex items-center justify-center">
        {/* هالة ملكية نابضة خفيفة خلف الختم */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-1.5 rounded-full bg-[radial-gradient(circle,rgba(255,152,192,0.52)_0%,rgba(214,40,108,0.18)_52%,transparent_76%)] ${
            motionEnabled ? 'ad-seal-aura' : 'opacity-50'
          }`}
        />

        <span
          className={`relative z-10 w-full h-full rounded-full bg-gradient-to-br from-white via-[#FFF4F8] to-[#FFE2ED] flex items-center justify-center transition-[transform,box-shadow,border-color] duration-300 ease-out group-hover:scale-[1.07] group-active:scale-[0.92] ${
            isOpen
              ? 'border-[1.5px] border-[#D6286C] shadow-[0_12px_30px_rgba(214,40,108,0.34),0_0_0_3px_rgba(255,196,220,0.55)]'
              : 'border border-[#E88FB2] shadow-[0_10px_26px_rgba(196,30,96,0.22)] group-hover:shadow-[0_14px_30px_rgba(214,40,108,0.3)]'
          }`}
        >
          <svg viewBox="0 0 40 40" className="w-9 h-9 text-[#D6286C] overflow-visible" aria-hidden="true">
            <defs>
              <radialGradient id="profileSealPetal" cx="42%" cy="35%" r="68%">
                <stop offset="0%" stopColor="#FFF7FA" />
                <stop offset="56%" stopColor="#FFA2C6" />
                <stop offset="100%" stopColor="#D6286C" />
              </radialGradient>
            </defs>

            {/* حلقة دانتيل منقطة تدور بنعومة */}
            <circle
              cx="20"
              cy="20"
              r="17"
              fill="none"
              stroke="currentColor"
              strokeOpacity={isOpen ? 0.68 : 0.42}
              strokeWidth="1"
              strokeDasharray="2 3"
              className={motionEnabled ? 'ad-seal-orbit' : ''}
            />

            {/* بتلات الختم الملكي الأربع كإطار وردي حول قلب أبيض ناصع يبرز أيقونة الإعدادات */}
            <g
              style={{
                transformOrigin: '20px 20px',
                transform: `rotate(${isOpen ? 45 : 0}deg)`,
              }}
              className="transition-transform duration-500 ease-out"
            >
              <path
                d="M20 5.5 C25.2 5.5 28.4 10.6 24.2 15.6 C29.4 11.4 34.5 14.6 34.5 20 C34.5 25.4 29.4 28.6 24.2 24.4 C28.4 29.4 25.2 34.5 20 34.5 C14.8 34.5 11.6 29.4 15.8 24.4 C10.6 28.6 5.5 25.4 5.5 20 C5.5 14.6 10.6 11.4 15.8 15.6 C11.6 10.6 14.8 5.5 20 5.5Z"
                fill="url(#profileSealPetal)"
                fillOpacity={isOpen ? 0.65 : 0.46}
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </g>

            <circle
              cx="20"
              cy="20"
              r="10"
              fill="#FFFFFF"
              stroke="currentColor"
              strokeOpacity="0.5"
              strokeWidth="0.95"
            />
          </svg>

          <Settings
            strokeWidth={2.15}
            className={`absolute w-[19px] h-[19px] text-[#A81852] transition-transform duration-500 ${
              isOpen ? 'rotate-90' : 'group-hover:rotate-45'
            }`}
            aria-hidden="true"
          />
        </span>

        {/* موجة توهج وبتلات متناثرة عند الضغط */}
        {motionEnabled && burstId > 0 && (
          <span key={burstId} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
            <span className="absolute inset-0 rounded-full border-2 border-[#FF8BB8] shadow-[0_0_16px_rgba(255,139,184,0.65)] ad-seal-ripple" />
            <span
              className="absolute inset-1 rounded-full border border-[#FFF3EB]/90 ad-seal-ripple"
              style={{ animationDelay: '90ms' }}
            />
            {SEAL_MINI_PETALS.map((item, idx) => (
              <span
                key={idx}
                className="absolute top-1/2 left-1/2 ad-seal-burst-petal"
                style={
                  {
                    marginLeft: item.startX,
                    marginTop: item.startY,
                    width: item.size,
                    height: Math.round(item.size * 1.15),
                    animationDelay: item.delay,
                    '--bx': item.bx,
                    '--by': item.by,
                    '--br': item.br,
                  } as React.CSSProperties
                }
              >
                <svg viewBox="0 0 20 24" className="w-full h-full">
                  <path
                    d="M10 2C14.5 5 16.5 10.5 13 15.5C10.8 18.5 7.5 18.2 5.8 15.5C3.5 11.8 5.2 5.5 10 2Z"
                    fill="#FF88B6"
                    stroke="#FFF7FA"
                    strokeWidth="0.8"
                  />
                </svg>
              </span>
            ))}
          </span>
        )}
      </span>

      <span className="px-2.5 py-0.5 ad-cut-chip bg-white/95 border border-[#E4B29D] shadow-xs text-[11px] font-bold text-[#4B1732] tracking-tight leading-none">
        الإعدادات
      </span>
    </button>
  );
}

/**
 * شاشة الملف الشخصي — تعرض بطاقة اللاعبة وملخص إنجازها الشخصي،
 * مع زر الختم الملكي لفتح الإعدادات في نافذة عائمة وسط الشاشة.
 */
export function ProfileScreen({
  modes,
  realms,
  progress,
  busStatus = 'idle',
  connectionStatus,
  pinEnabled,
  lockOnBackground,
  isSettingsOpen,
  isPinModalOpen = false,
  onOpenSettings,
  onCloseSettings,
  onUpdateName,
  onToggleSetting,
  onSwitchRole,
  onOpenPinSetup,
  onToggleLockOnBackground,
  onLockNow,
  onResetAllProgress,
  onOpenLog,
  onOpenSyncModal,
  onTapFeedback,
  motionEnabled,
  transitionClassName = 'ad-anim-screen-curtain',
}: ProfileScreenProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(progress.playerName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSavedNotice, setNameSavedNotice] = useState(false);

  // Sync draftName if playerName changes externally
  useEffect(() => {
    if (!isEditingName) {
      setDraftName(progress.playerName);
    }
  }, [progress.playerName, isEditingName]);

  useEffect(() => {
    if (!nameSavedNotice) return;
    const timer = window.setTimeout(() => {
      setNameSavedNotice(false);
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [nameSavedNotice]);

  const platform = useMemo(
    () => getPlatformProgress(progress, modes, realms),
    [progress, modes, realms]
  );
  const isHusband = progress.role === 'husband';
  const targetSwitchRole: DeviceRole = isHusband ? 'wife' : 'husband';
  const roleLabel = isHusband ? 'نسخة الزوج' : 'نسخة الزوجة';
  const targetRoleLabel = targetSwitchRole === 'husband' ? 'نسخة الزوج' : 'نسخة الزوجة';
  const hasNativeNearby = useHasNativeNearby();
  const effectiveStatus: PartnerConnectionStatus =
    connectionStatus ?? (busStatus === 'connected' ? 'connected' : 'offline');
  const partnerQuestionsCount = useMemo(
    () =>
      Object.values(progress.partnerSnapshot.answersBySet).reduce(
        (sum, qMap) => sum + Object.keys(qMap).length,
        0
      ),
    [progress.partnerSnapshot.answersBySet]
  );
  const { settings } = progress;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) {
      setNameError('الرجاء كتابة اسم قبل الحفظ');
      return;
    }
    onUpdateName(trimmed);
    setNameError(null);
    setIsEditingName(false);
    setNameSavedNotice(true);
  };

  const handleCancelEdit = () => {
    setDraftName(progress.playerName);
    setNameError(null);
    setIsEditingName(false);
  };

  return (
    <section
      className={`flex-1 min-h-0 flex flex-col pt-safe overflow-hidden ${
        motionEnabled ? transitionClassName : ''
      }`}
      aria-label="الملف الشخصي"
    >
      {/* Serene Editorial Root Masthead */}
      <header className="shrink-0 pr-5 pl-badge-safe">
        <div className="flex items-center min-h-[44px]">
          <h1 className="font-display-ar text-[1.6rem] font-bold text-[#360D21] leading-none truncate">
            الملف الشخصي
          </h1>
        </div>
        <div
          aria-hidden="true"
          className="mt-1.5 h-px w-full bg-gradient-to-l from-transparent via-[#D6286C]/30 to-transparent"
        />
      </header>

      {/* Main Centered Profile Showcase */}
      <div className="flex-1 min-h-0 overflow-y-auto ad-no-scrollbar px-5 pt-2.5 pb-nav-dock flex flex-col">
        <div className="my-auto w-full flex flex-col gap-3 sm:gap-4">
        {/* 1. Layered Sculpted Player Keepsake Card */}
        <div className="relative shrink-0">
          <div
            aria-hidden="true"
            className="absolute inset-x-2.5 top-2 -bottom-1.5 ad-cut-card bg-[#F9C6D9] -rotate-1 opacity-85"
          />

          <div className="relative z-10 ad-cut-card bg-gradient-to-b from-white to-[#FFF2F7] border border-[#F1AFC8] text-[#360D21] px-4 py-3.5 sm:py-5 flex flex-col items-center text-center shadow-[0_18px_42px_rgba(214,40,108,0.14)] overflow-hidden">
            <CornerRoseFiligree position="top-right" color="#D6286C" className="w-6 h-6 opacity-30" />
            <CornerRoseFiligree position="bottom-left" color="#D6286C" className="w-6 h-6 opacity-30" />

            {/* Double-Halo Botanical Monogram Crest */}
            <div className="w-[62px] h-[62px] sm:w-[70px] sm:h-[70px] rounded-full border border-dashed border-[#E4B29D] flex items-center justify-center mb-2 sm:mb-2.5">
              <div className="w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] rounded-full bg-[#FCEBF0] border border-[#ECC0D1] flex items-center justify-center">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#D6286C] to-[#9E194D] text-white flex items-center justify-center font-display-ar text-xl sm:text-2xl font-bold shadow-md">
                  {Array.from(progress.playerName.trim())[0] ?? 'ض'}
                </div>
              </div>
            </div>

            {isEditingName ? (
              <form
                onSubmit={handleSaveName}
                className="flex flex-col items-center gap-1.5 w-full max-w-[290px]"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <label htmlFor="player-name-input" className="sr-only">
                    {isHusband ? 'اسم الزوج' : 'اسم الزوجة'}
                  </label>
                  <input
                    id="player-name-input"
                    type="text"
                    value={draftName}
                    onChange={(e) => {
                      setDraftName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    maxLength={24}
                    autoFocus
                    className="flex-1 min-w-0 min-h-[44px] px-3 ad-cut-chip bg-[#FFF8FA] border border-[#E8AFC3] text-sm text-[#360D21] text-center focus:outline-none focus:border-[#D6286C]"
                  />
                  <button
                    type="submit"
                    aria-label="حفظ الاسم"
                    className="min-w-[44px] min-h-[44px] ad-cut-chip bg-[#D6286C] text-white flex items-center justify-center cursor-pointer shrink-0 hover:brightness-95 active:scale-95 transition-[transform,filter] duration-150"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    aria-label="إلغاء التعديل"
                    className="min-w-[44px] min-h-[44px] ad-cut-chip bg-[#FCEEF3] text-[#5E364A] hover:text-[#D6286C] active:scale-95 flex items-center justify-center cursor-pointer shrink-0 transition-[color,transform] duration-150"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                {draftName.length >= 18 && (
                  <p className="text-[10.5px] font-semibold text-[#5E364A] tabular-nums-ar">
                    {toArabicDigits(draftName.length)} / ٢٤
                  </p>
                )}
                {nameError && (
                  <p
                    role="alert"
                    className={`text-[11px] font-semibold text-[#B92859] ${
                      motionEnabled ? 'ad-anim-toast-in' : ''
                    }`}
                  >
                    {nameError}
                  </p>
                )}
              </form>
            ) : (
              <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center w-full max-w-[300px]">
                <span className="w-[44px]" aria-hidden="true" />
                <h2 className="font-display-ar text-2xl sm:text-[1.65rem] font-bold text-[#360D21] truncate px-1 text-center leading-snug">
                  {progress.playerName}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(progress.playerName);
                    setNameError(null);
                    setIsEditingName(true);
                  }}
                  aria-label="تعديل الاسم"
                  className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#5E364A] hover:text-[#D6286C] hover:bg-[#FCEEF3] active:scale-95 transition-[color,background-color,transform] duration-150 cursor-pointer"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="w-28 my-2">
              <RoseDivider />
            </div>

            <p className="text-xs text-[#5E364A] tabular-nums-ar px-4 leading-relaxed">
              <span className="font-bold text-[#D6286C]">{roleLabel}</span>{' '}
              <span aria-hidden="true">·</span>{' '}
              {isHusband
                ? partnerQuestionsCount > 0
                  ? `مزامنة ${formatQuestionsCountArabic(partnerQuestionsCount)} من ${progress.partnerSnapshot.partnerName}`
                  : 'بانتظار الاقتران القريب ومزامنة اختيارات الشريكة'
                : `${toArabicDigits(platform.totalRoundsCompleted)} مستويات منجزة عبر الأنماط`}
            </p>

            {nameSavedNotice && (
              <p
                role="status"
                aria-live="polite"
                className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 ad-cut-chip bg-[#FCEEF3] border border-[#E8AFC3] text-[11px] font-bold text-[#9E194D] ${
                  motionEnabled ? 'ad-anim-toast-in' : ''
                }`}
              >
                <Check className="w-3 h-3" aria-hidden="true" />
                <span>تم تحديث الاسم بنجاح</span>
              </p>
            )}

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={() => {
                  onTapFeedback?.();
                  onOpenSyncModal();
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 min-h-[44px] px-4 ad-cut-chip bg-white/95 border border-[#EFCBD7] hover:border-[#D6286C] active:scale-[0.98] text-[11px] font-bold text-[#7B1E48] shadow-xs transition-[border-color,transform] duration-150 cursor-pointer"
              >
                {hasNativeNearby ? (
                  <Bluetooth className="w-3.5 h-3.5 text-[#D6286C]" aria-hidden="true" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-[#D6286C]" aria-hidden="true" />
                )}
                <span>
                  {effectiveStatus === 'connected'
                    ? 'الطرفان متصلان الآن · إدارة المزامنة'
                    : effectiveStatus === 'error'
                      ? 'تعذّر الربط · مراجعة إعدادات المزامنة'
                      : effectiveStatus === 'pending'
                        ? 'معلّق للمزامنة · عرض الحالة'
                        : effectiveStatus === 'waiting'
                          ? isHusband
                            ? 'بانتظار دخول الشريكة · عرض رمز الربط'
                            : 'بانتظار دخول الشريك · عرض رمز الربط'
                          : hasNativeNearby
                            ? 'الاقتران القريب والمزامنة بدون نت'
                            : 'المزامنة السحابية بين الهاتفين'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Unified Multi-Mode Achievement Folio + Bottom-Corner Royal Seal Settings Button */}
        <div className="relative shrink-0">
          <div className="ad-cut-card bg-white/95 border border-[#EECCDA] px-3.5 pt-3.5 pb-7 sm:px-5 sm:pt-5 sm:pb-8 flex flex-col gap-2.5 sm:gap-3.5 shadow-[0_14px_34px_rgba(214,40,108,0.1)]">
            <div className="flex items-center justify-between gap-3.5">
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xs sm:text-[13px] font-bold text-[#360D21]">
                    {isHusband ? 'ملخص المنصة وتقدّم الشريكة' : 'ملخص إنجاز المنصة'}
                  </h3>
                  <span className="text-[11px] font-semibold text-[#5E364A] tabular-nums-ar shrink-0">
                    {isHusband
                      ? platform.partnerSynced
                        ? `متزامن مع ${progress.partnerSnapshot.partnerName}`
                        : 'بانتظار أول مزامنة'
                      : `${toArabicDigits(platform.activeModesCount)} من ${toArabicDigits(platform.totalModes)} أنماط نشطة`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#FCE8F0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#D6286C] to-[#E6558F] transition-[width] duration-500"
                    style={{ width: `${platform.overallPercent}%` }}
                  />
                </div>
              </div>

              <RoseRingProgress
                percent={platform.overallPercent}
                size={60}
                strokeWidth={5}
                accentHex="#D6286C"
                label={`${toArabicDigits(platform.overallPercent)}٪`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-[#F4D9E3] pt-2.5 sm:pt-3.5">
              <div className="flex flex-col items-center text-center gap-0.5">
                <span className="text-base sm:text-lg font-extrabold text-[#360D21] tabular-nums-ar whitespace-nowrap">
                  {toArabicDigits(platform.availableModes)} من {toArabicDigits(platform.totalModes)}
                </span>
                <span className="text-[11px] text-[#5E364A] whitespace-nowrap">الأنماط المفعّلة</span>
              </div>

              <div className="flex flex-col items-center text-center gap-0.5 border-x border-[#F4D9E3] px-1">
                <span className="text-base sm:text-lg font-extrabold text-[#D6286C] tabular-nums-ar whitespace-nowrap">
                  {toArabicDigits(platform.totalRoundsCompleted)}
                </span>
                <span className="text-[11px] text-[#5E364A] whitespace-nowrap">
                  {isHusband ? 'مستويات الشريكة' : 'مستويات منجزة'}
                </span>
              </div>

              <div className="flex flex-col items-center text-center gap-0.5">
                <span className="text-base sm:text-lg font-extrabold text-[#360D21] tabular-nums-ar whitespace-nowrap">
                  {toArabicDigits(platform.totalSavedEntries)}
                </span>
                <span className="text-[11px] text-[#5E364A] whitespace-nowrap">
                  {isHusband ? 'إجابات متزامنة' : 'السجلات المحفوظة'}
                </span>
              </div>
            </div>

            {onOpenLog ? (
              <div className="border-t border-[#F4D9E3] pt-2.5 sm:pt-3 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    onTapFeedback?.();
                    onOpenLog();
                  }}
                  className="min-h-[44px] px-4 ad-cut-chip bg-[#FFF6F9] border border-[#F1AFC8] hover:border-[#D6286C] active:scale-[0.98] text-xs font-bold text-[#9E194D] flex items-center justify-center cursor-pointer transition-[border-color,transform] duration-150"
                >
                  استعراض سجل الأنماط والمحفوظات
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-[#5E364A] text-center border-t border-[#F4D9E3] pt-2.5 sm:pt-3 leading-relaxed">
                {isHusband
                  ? 'لمراجعة تفاصيل الأنماط والنتائج، افتح تبويب «السجل» من الشريط السفلي.'
                  : 'لمراجعة تفاصيل الأنماط والنتائج، افتحي تبويب «السجل» من الشريط السفلي.'}
              </p>
            )}
          </div>

          <div className="absolute -bottom-6 left-4 z-30">
            <SettingsRoyalSealButton
              isOpen={isSettingsOpen}
              motionEnabled={motionEnabled}
              onClick={() => {
                onTapFeedback?.();
                onOpenSettings();
              }}
            />
          </div>
        </div>
        </div>
      </div>

      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        isPinModalOpen={isPinModalOpen}
        isHusband={isHusband}
        roleLabel={roleLabel}
        targetRoleLabel={targetRoleLabel}
        targetSwitchRole={targetSwitchRole}
        hasNativeNearby={hasNativeNearby}
        effectiveStatus={effectiveStatus}
        settings={settings}
        pinEnabled={pinEnabled}
        lockOnBackground={lockOnBackground}
        motionEnabled={motionEnabled}
        onClose={onCloseSettings}
        onOpenSyncModal={onOpenSyncModal}
        onToggleSetting={onToggleSetting}
        onSwitchRole={onSwitchRole}
        onOpenPinSetup={onOpenPinSetup}
        onToggleLockOnBackground={onToggleLockOnBackground}
        onLockNow={onLockNow}
        onResetAllProgress={onResetAllProgress}
        onTapFeedback={onTapFeedback}
      />
    </section>
  );
}
