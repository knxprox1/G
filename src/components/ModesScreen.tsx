import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, Lock } from 'lucide-react';
import type { GameMode, GameProgress, GameRealm } from '../data/types';
import { formatSetsCount, getPlatformProgress, toArabicDigits } from '../game/engine';
import { useActionLock } from '../utils/useActionLock';
import { BrandMark } from './BrandMark';
import { ArtworkFrame } from './ArtworkFrame';
import {
  ArchCrownOrnament,
  RoseDivider,
  RealmMotifIcon,
} from './RoseFiligree';

interface ModesScreenProps {
  modes: GameMode[];
  realms: GameRealm[];
  progress: GameProgress;
  onExploreRealms: () => void;
  onBack?: () => void;
  onTapFeedback?: () => void;
  onUnavailableFeedback?: () => void;
  motionEnabled: boolean;
  transitionClassName?: string;
}

/**
 * شاشة أنماط اللعبة — تعتمد نفس التصميم الوردي الملكي بالكامل،
 * وتستعرض أنماط اللعبة بدلاً من العوالم (مع بقاء العوالم في شاشة العوالم المستقلة).
 */
export function ModesScreen({
  modes,
  realms,
  progress,
  onExploreRealms,
  onBack,
  onTapFeedback,
  onUnavailableFeedback,
  motionEnabled,
  transitionClassName = 'ad-anim-screen-curtain',
}: ModesScreenProps) {
  const isHusband = progress.role === 'husband';
  const platform = useMemo(
    () => getPlatformProgress(progress, modes, realms),
    [progress, modes, realms]
  );
  const overall = platform.questionsSummary;
  const [selectedModeId, setSelectedModeId] = useState<string>(modes[0]?.id ?? 'mode-questions');
  const [upcomingNotice, setUpcomingNotice] = useState<string | null>(null);
  const { runLocked } = useActionLock(450);

  const activeMode = modes.find((m) => m.id === selectedModeId) ?? modes[0];

  useEffect(() => {
    if (!upcomingNotice) return;
    const timer = window.setTimeout(() => {
      setUpcomingNotice(null);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [upcomingNotice]);

  const handleLaunchMode = () => {
    if (activeMode.isAvailable) {
      runLocked(() => {
        onTapFeedback?.();
        onExploreRealms();
      });
      return;
    }
    if (onUnavailableFeedback) {
      onUnavailableFeedback();
    } else {
      onTapFeedback?.();
    }
    setUpcomingNotice(`«${activeMode.title}» قيد التجهيز وسيُفتح في تحديث قادم`);
  };

  return (
    <section
      className={`relative flex-1 min-h-0 flex flex-col justify-start pt-safe pb-nav-dock overflow-hidden ${
        motionEnabled ? transitionClassName : ''
      }`}
      aria-label="أنماط اللعبة"
    >
      {/* Balanced Editorial Masthead Header with Back-to-Home Control */}
      <header className="shrink-0 px-3 sm:px-4">
        <div className="grid grid-cols-[minmax(7.5rem,1fr)_auto_minmax(7.5rem,1fr)] items-center gap-1 min-h-[44px]">
          <div className="justify-self-start flex items-center">
            {onBack ? (
              <button
                type="button"
                onClick={() => {
                  onTapFeedback?.();
                  onBack();
                }}
                aria-label="العودة إلى الرئيسية"
                className="shrink-0 min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#360D21] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shadow-xs"
              >
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            ) : (
              <span className="shrink-0 w-[44px] h-[44px]" aria-hidden="true" />
            )}
          </div>

          <div className="flex items-center justify-center min-w-0">
            <BrandMark />
          </div>

          <span className="justify-self-end" aria-hidden="true" />
        </div>

        <div
          aria-hidden="true"
          className="mt-1 h-px w-full bg-gradient-to-l from-transparent via-[#D6286C]/30 to-transparent"
        />
      </header>

      {/* Transient Gentle Notice anchored cleanly below header hairline without overlapping card or portal */}
      {upcomingNotice && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-[max(4rem,calc(env(safe-area-inset-top)+3.35rem))] inset-x-4 z-30 flex justify-center"
        >
          <div
            className={`ad-cut-tile bg-white/98 border border-[#F1AFC8] px-4 py-1.5 text-center text-xs font-semibold text-[#360D21] shadow-[0_12px_28px_rgba(145,42,82,0.18)] ${
              motionEnabled ? 'ad-anim-toast-in' : ''
            }`}
          >
            {upcomingNotice}
          </div>
        </div>
      )}

      {/* Upper Stage: Anchored Directly Under Header — Balanced Arched Portal & Editorial Column */}
      <div
        key={activeMode.id}
        className={`relative flex-1 min-h-0 max-h-[min(520px,64dvh)] mt-2 sm:mt-2.5 mb-1.5 px-4 sm:px-5 grid grid-cols-[1.06fr_0.98fr] sm:grid-cols-[1.04fr_1.02fr] gap-2.5 sm:gap-3.5 items-stretch ${
          motionEnabled ? 'ad-anim-content-swap' : ''
        }`}
      >
        {/* Right Column (RTL first): Full-Height Vertical Crowned Arched Portal */}
        <div className="flex flex-col items-center justify-start h-full min-h-0">
          <div className="shrink-0 -mb-0.5">
            <ArchCrownOrnament color={activeMode.accentHex} />
          </div>

          <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
            {/* Soft Breathing Luminous Halo */}
            <div
              aria-hidden="true"
              className={`absolute -inset-2 rounded-t-[140px] rounded-b-[32px] blur-md pointer-events-none ${
                motionEnabled ? 'ad-anim-halo' : 'opacity-65'
              }`}
              style={{
                background: `radial-gradient(circle at 50% 45%, ${activeMode.accentHex}38 0%, transparent 72%)`,
              }}
            />

            {/* Tilted Rose-Silk Backdrop Silhouette */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-t-[130px] rounded-b-[26px] bg-gradient-to-b from-[#F9BBD2] to-[#F39CBE] -rotate-2 opacity-85"
            />

            {/* Main Ornamental Arched Frame */}
            <div
              className="relative h-full w-full rounded-t-[130px] rounded-b-[26px] bg-gradient-to-b from-white to-[#FFF0F6] p-2 shadow-[0_18px_44px_rgba(180,34,106,0.22)] border"
              style={{ borderColor: `${activeMode.accentHex}52` }}
            >
              <div className="relative w-full h-full rounded-t-[122px] rounded-b-[20px] overflow-hidden bg-[#FAD3E2]">
                <ArtworkFrame
                  src={activeMode.artworkSrc}
                  alt={activeMode.title}
                  accentHex={activeMode.accentHex}
                  motif={activeMode.motif}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="w-full h-full object-cover object-center"
                />

                {/* Subtle warm rose vignette along bottom edge */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#360D21]/28 to-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Left Column (RTL second): Balanced Editorial Top + Centered Divider + Bottom Action Card */}
        <div className="relative flex flex-col justify-between h-full min-h-0 overflow-y-auto ad-no-scrollbar pt-[22px] pb-0.5 gap-1.5">
          {/* Top Editorial Group aligned cleanly with Arch Shoulder */}
          <div className="ad-cut-tile bg-white/82 border border-white/85 px-2.5 sm:px-3 py-2 flex flex-col gap-0.5 shadow-[0_6px_18px_rgba(180,34,106,0.05)]">
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-2">
                <span
                  dir="ltr"
                  className="font-display-en text-[1.6rem] sm:text-[1.85rem] font-bold leading-none"
                  style={{ color: activeMode.accentHex }}
                >
                  {activeMode.romanNumeral}
                </span>
                <span style={{ color: activeMode.accentHex }}>
                  <RealmMotifIcon motif={activeMode.motif} className="w-4 h-4" />
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#5E364A]">
                {activeMode.isAvailable && isHusband
                  ? platform.partnerSynced
                    ? `اختيارات ${progress.partnerSnapshot?.partnerName || 'الشريكة'}`
                    : `بانتظار مزامنة ${progress.partnerSnapshot?.partnerName || 'الشريكة'}`
                  : activeMode.statusLabel}
              </span>
            </div>

            <div>
              <h1 className="font-display-ar text-[1.22rem] sm:text-[1.48rem] font-bold text-[#360D21] leading-[1.22] [text-wrap:balance]">
                {activeMode.title}
              </h1>
              <p className="text-[11.5px] sm:text-[12.5px] text-[#5E364A] leading-[1.46] mt-0.5">
                {activeMode.tagline}
              </p>
            </div>
          </div>

          {/* Centered Floral Waist Ornament bridging Top Editorial & Bottom Action Card */}
          <div className="shrink-0">
            <RoseDivider color={activeMode.accentHex} />
          </div>

          {/* Bottom Frosted Porcelain Action Card Flush with Portrait Base */}
          <div className="shrink-0 ad-cut-tile bg-white/95 border border-[#F1AFC8]/85 p-2.5 sm:p-3 flex flex-col gap-1.5 shadow-[0_10px_24px_rgba(180,34,106,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] font-bold text-[#5E364A] tabular-nums-ar">
              {activeMode.isAvailable ? (
                <>
                  <span>{toArabicDigits(realms.length)} عالماً</span>
                  <span>{formatSetsCount(overall.totalSets)}</span>
                </>
              ) : (
                <span>محتوى إضافي قيد الإعداد</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-0.5 text-[11px] font-semibold">
                {activeMode.isAvailable ? (
                  <>
                    <span className="text-[#5E364A] tabular-nums-ar">
                      {toArabicDigits(overall.answeredQuestions)} من {toArabicDigits(overall.totalQuestions)} سؤال
                    </span>
                    <span
                      className="text-xs sm:text-[13px] font-bold tabular-nums-ar"
                      style={{ color: activeMode.accentHex }}
                    >
                      {toArabicDigits(overall.percent)}٪
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[#5E364A]">حالة التوفر</span>
                    <span
                      className="text-[12px] font-bold"
                      style={{ color: activeMode.accentHex }}
                    >
                      قريباً
                    </span>
                  </>
                )}
              </div>
              {activeMode.isAvailable ? (
                <div className="h-1.5 w-full rounded-full bg-[#FAD0E0] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${overall.percent}%`,
                      backgroundColor: activeMode.accentHex,
                    }}
                  />
                </div>
              ) : (
                <p className="text-[11px] font-medium text-[#5E364A] leading-snug">
                  {isHusband
                    ? 'سيُفتح في تحديث قادم · استعرض نمط الأسئلة الآن'
                    : 'سيُفتح في تحديث قادم · استعرضي نمط الأسئلة الآن'}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleLaunchMode}
              style={activeMode.isAvailable ? { backgroundColor: activeMode.accentHex } : undefined}
              className={`w-full min-h-[48px] ad-cut-tile font-bold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-[transform,filter,border-color,box-shadow] duration-150 cursor-pointer ${
                activeMode.isAvailable
                  ? 'ad-shimmer-btn text-white hover:brightness-95 shadow-[0_10px_22px_rgba(214,40,108,0.28)]'
                  : 'bg-gradient-to-l from-[#FFF8FA] via-white to-[#FCECF2] text-[#7B1E48] border border-[#E4B29D] hover:border-[#D6286C]/65 shadow-xs'
              }`}
            >
              <span>
                {activeMode.isAvailable && isHusband ? 'استعراض اختياراتها' : activeMode.ctaLabel}
              </span>
              {activeMode.isAvailable ? (
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#D6286C]/80" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Connected Modes Thread — Snug Spacing Between Portrait and Bottom Nav */}
      <div className="relative shrink-0 px-4 sm:px-5 pt-1 pb-0.5">

        <div className="flex items-center justify-between text-[11px] text-[#5E364A] mb-1.5">
          <span className="font-bold text-[#360D21]">
            أنماط اللعبة ({toArabicDigits(modes.length)})
          </span>
          <span className="tabular-nums-ar font-semibold">
            الإنجاز العام: {toArabicDigits(platform.overallPercent)}٪
          </span>
        </div>

        <div className="relative">
          {/* Connecting Rose Hairline Thread */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 inset-x-3 h-px bg-[#E894B5]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-5 z-20 bg-gradient-to-r from-[#FFE5F0]/90 to-transparent"
          />

          <div
            role="list"
            aria-label="قائمة أنماط اللعبة"
            className="relative z-10 flex items-stretch gap-2 overflow-x-auto snap-x snap-mandatory ad-no-scrollbar py-0.5 pl-2 scroll-px-1"
          >
            {modes.map((m) => {
              const isSelected = m.id === activeMode.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="listitem"
                  onClick={(e) => {
                    onTapFeedback?.();
                    setSelectedModeId(m.id);
                    setUpcomingNotice(null);
                    e.currentTarget.scrollIntoView({
                      behavior: motionEnabled ? 'smooth' : 'auto',
                      inline: 'nearest',
                      block: 'nearest',
                    });
                  }}
                  aria-pressed={isSelected}
                  style={
                    isSelected
                      ? {
                          background: `linear-gradient(135deg, ${m.accentHex} 0%, #9E194D 100%)`,
                          borderColor: m.accentHex,
                        }
                      : undefined
                  }
                  className={`relative shrink-0 w-[114px] sm:w-[126px] snap-start h-[78px] sm:h-[96px] px-2.5 sm:px-3 py-2 sm:py-2.5 ad-cut-tile border flex flex-col justify-between text-right active:scale-[0.97] transition-[transform,background-color,border-color,box-shadow] duration-150 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'text-white shadow-[0_10px_24px_rgba(214,40,108,0.28)] ring-1 ring-inset ring-white/25'
                      : 'bg-white/95 text-[#360D21] border-[#F1AFC8] hover:border-[#D6286C]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-1">
                    <div className="flex items-center gap-1">
                      <span
                        style={!isSelected ? { color: m.accentHex } : undefined}
                        className={isSelected ? 'text-white/90' : ''}
                      >
                        <RealmMotifIcon motif={m.motif} className="w-3.5 h-3.5" />
                      </span>
                      <span
                        dir="ltr"
                        className={`font-display-en text-xs sm:text-[13px] font-bold leading-none ${
                          isSelected ? 'text-white' : ''
                        }`}
                        style={!isSelected ? { color: m.accentHex } : undefined}
                      >
                        {m.romanNumeral}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold leading-none tabular-nums-ar inline-flex items-center gap-1 ${
                        isSelected ? 'text-white' : 'text-[#5E364A]'
                      }`}
                    >
                      {m.isAvailable ? (
                        `${toArabicDigits(overall.percent)}٪`
                      ) : (
                        <>
                          <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                          <span>قريباً</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs sm:text-[13px] font-bold leading-snug line-clamp-2 w-full">
                    {m.title}
                  </p>

                  {/* Thin mode progress bar for active mode, subtle hairline divider for upcoming modes */}
                  {m.isAvailable ? (
                    <div
                      className={`h-[2.5px] w-full rounded-full overflow-hidden ${
                        isSelected ? 'bg-white/25' : 'bg-[#FAD0E0]'
                      }`}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${overall.percent}%`,
                          backgroundColor: isSelected ? '#FFFFFF' : m.accentHex,
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      aria-hidden="true"
                      className={`h-[1.5px] w-full rounded-full ${
                        isSelected ? 'bg-white/30' : 'bg-[#F5D6E3]/80'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
