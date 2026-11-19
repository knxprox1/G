import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Bluetooth,
  Cloud,
  MessageCircleHeart,
  RotateCcw,
} from 'lucide-react';
import type { GameMode, GameProgress, GameRealm, ModeProgressRegistry } from '../data/types';
import {
  getOverallProgress,
  getQuestionsViewProgress,
  getRealmProgress,
  getSetProgress,
  toArabicDigits,
  type RealmProgressSummary,
} from '../game/engine';
import { useHasNativeNearby } from '../sync/usePlatformCapabilities';
import { useActionLock } from '../utils/useActionLock';
import {
  CornerRoseFiligree,
  RoseDivider,
  RoseRingProgress,
  WhisperPetalIcon,
} from './RoseFiligree';
import {
  FilterTabStrip,
  InlineConfirmBox,
  PartnerSyncBanner,
} from './SharedUI';

type LogFilter = 'all' | 'with-answers' | 'completed';
type ModeLogTab = keyof ModeProgressRegistry;

interface LogScreenProps {
  realms: GameRealm[];
  modes?: GameMode[];
  progress: GameProgress;
  initialRealmId?: string;
  initialSetId?: string | null;
  updatedSetIds?: string[];
  onMarkSetSeen?: (setId: string) => void;
  onResetSet: (setId: string) => void;
  onEditSet?: (realmId: string, setId: string) => void;
  onDiscussInChat?: (prefillText: string) => void;
  onExploreRealms?: () => void;
  onOpenSyncModal?: () => void;
  onTapFeedback?: () => void;
  motionEnabled: boolean;
  transitionClassName?: string;
}

const MODE_TABS: { id: ModeLogTab; label: string }[] = [
  { id: 'questions', label: 'نمط الأسئلة' },
  { id: 'cards', label: 'بطاقات الجرأة' },
  { id: 'dialogue', label: 'همسات الحوار' },
  { id: 'challenges', label: 'تحديات المساء' },
];

const LOG_FILTER_OPTIONS: { id: LogFilter; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'with-answers', label: 'بها إجابات' },
  { id: 'completed', label: 'مكتملة' },
];

/**
 * شاشة السجل الموحّدة — تستعرض سجلات الأنماط المفعّلة أو ذات النشاط،
 * وتعرض للزوجة تقدمها وإجاباتها مع إمكانية الإكمال والضبط،
 * وتعرض للزوج اختيارات الشريكة المتزامنة وتفاصيلها فورياً.
 */
export function LogScreen({
  realms,
  modes = [],
  progress,
  initialRealmId,
  initialSetId,
  updatedSetIds = [],
  onMarkSetSeen,
  onResetSet,
  onEditSet,
  onDiscussInChat,
  onExploreRealms,
  onOpenSyncModal,
  onTapFeedback,
  motionEnabled,
  transitionClassName = 'ad-anim-screen-curtain',
}: LogScreenProps) {
  const isHusband = progress.role === 'husband';
  const viewProgress = useMemo(() => getQuestionsViewProgress(progress), [progress]);
  const hasNativeNearby = useHasNativeNearby();
  const { runLocked } = useActionLock(450);

  const realmSummaryMap = useMemo(() => {
    const map = new Map<string, RealmProgressSummary>();
    for (const r of realms) {
      map.set(r.id, getRealmProgress(viewProgress, r));
    }
    return map;
  }, [realms, viewProgress]);

  const [activeModeTab, setActiveModeTab] = useState<ModeLogTab>('questions');
  const [showUpcomingModesNote, setShowUpcomingModesNote] = useState(false);
  const [selectedRealmId, setSelectedRealmId] = useState<string>(() => {
    if (initialRealmId && realms.some((r) => r.id === initialRealmId)) {
      return initialRealmId;
    }
    const firstWithAnswers = realms.find(
      (r) => (realmSummaryMap.get(r.id)?.answeredQuestions ?? 0) > 0
    );
    return (firstWithAnswers ?? realms[0])?.id ?? '';
  });
  const [activeFilter, setActiveFilter] = useState<LogFilter>('all');
  const [expandedSetId, setExpandedSetId] = useState<string | null>(() => initialSetId ?? null);
  const [confirmResetSetId, setConfirmResetSetId] = useState<string | null>(null);
  const confirmResetRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (initialRealmId && realms.some((r) => r.id === initialRealmId)) {
      setSelectedRealmId(initialRealmId);
    }
    setExpandedSetId(initialSetId ?? null);
    setConfirmResetSetId(null);
  }, [initialRealmId, initialSetId, realms]);

  useEffect(() => {
    if (!confirmResetSetId) return;
    const el = confirmResetRefs.current[confirmResetSetId];
    if (el) {
      el.scrollIntoView({
        behavior: motionEnabled ? 'smooth' : 'auto',
        block: 'nearest',
      });
    }
  }, [confirmResetSetId, motionEnabled]);

  const overall = useMemo(
    () => getOverallProgress(viewProgress, realms),
    [viewProgress, realms]
  );

  const logCounts = useMemo<Record<LogFilter, number>>(() => {
    let withAnswers = 0;
    let completed = 0;
    for (const r of realms) {
      const summary = realmSummaryMap.get(r.id);
      if (!summary) continue;
      if (summary.answeredQuestions > 0) withAnswers += 1;
      if (summary.isRealmCompleted) completed += 1;
    }
    return {
      all: realms.length,
      'with-answers': withAnswers,
      completed,
    };
  }, [realms, realmSummaryMap]);

  const filteredRealms = useMemo(() => {
    if (activeFilter === 'all') return realms;
    return realms.filter((r) => {
      const summary = realmSummaryMap.get(r.id);
      if (!summary) return false;
      if (activeFilter === 'completed') return summary.isRealmCompleted;
      return summary.answeredQuestions > 0;
    });
  }, [realms, realmSummaryMap, activeFilter]);

  const filteredRealm =
    filteredRealms.find((r) => r.id === selectedRealmId) ?? filteredRealms[0] ?? null;
  const frProgress = filteredRealm
    ? (realmSummaryMap.get(filteredRealm.id) ?? getRealmProgress(viewProgress, filteredRealm))
    : null;

  const handleSelectRealm = (realmId: string) => {
    setSelectedRealmId(realmId);
    setExpandedSetId(null);
    setConfirmResetSetId(null);
  };

  const { cards, dialogue, challenges } = progress.modeProgress;

  const { visibleTabs, hiddenUpcomingTabs } = useMemo(() => {
    const isModeTabVisible = (tabId: ModeLogTab): boolean => {
      if (tabId === 'questions') return true;
      const modeLookupId =
        tabId === 'cards'
          ? 'mode-cards'
          : tabId === 'dialogue'
            ? 'mode-dialogue'
            : 'mode-challenges';
      if (modes.find((m) => m.id === modeLookupId)?.isAvailable) return true;
      if (tabId === 'cards') {
        return cards.sessionsCompleted > 0 || cards.drawnCount > 0 || cards.favoriteCardIds.length > 0;
      }
      if (tabId === 'dialogue') {
        return (
          dialogue.sessionsCompleted > 0 ||
          dialogue.discussedTopicIds.length > 0 ||
          dialogue.favoriteTopicIds.length > 0
        );
      }
      return challenges.sessionsCompleted > 0 || challenges.completedChallengeIds.length > 0;
    };

    const visible: { id: ModeLogTab; label: string }[] = [];
    const hidden: { id: ModeLogTab; label: string }[] = [];
    for (const tab of MODE_TABS) {
      if (isModeTabVisible(tab.id)) visible.push(tab);
      else hidden.push(tab);
    }
    return { visibleTabs: visible, hiddenUpcomingTabs: hidden };
  }, [modes, cards, dialogue, challenges]);

  return (
    <section
      className={`flex-1 min-h-0 flex flex-col justify-between px-5 pt-safe overflow-hidden ${
        motionEnabled ? transitionClassName : ''
      }`}
      aria-label="السجل"
    >
      {/* Clean Root Tab Masthead */}
      <header className="shrink-0">
        <div className="flex items-center gap-2.5 min-h-[44px] pl-badge-safe min-w-0">
          <h1 className="font-display-ar text-[1.6rem] font-bold text-[#360D21] leading-none shrink-0">
            السجل
          </h1>
          <span className="text-[11px] font-semibold text-[#5E364A] tabular-nums-ar truncate">
            {activeModeTab === 'questions'
              ? isHusband
                ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span>اختيارات {progress.partnerSnapshot.partnerName}</span>
                      <span aria-hidden="true" className="text-[#C87899]">|</span>
                      <span>{toArabicDigits(overall.answeredQuestions)} من {toArabicDigits(overall.totalQuestions)}</span>
                    </span>
                  )
                : `${toArabicDigits(overall.answeredQuestions)} من ${toArabicDigits(overall.totalQuestions)} سؤال`
              : activeModeTab === 'cards'
                ? `${toArabicDigits(cards.drawnCount)} بطاقات مسحوبة`
                : activeModeTab === 'dialogue'
                  ? `${toArabicDigits(dialogue.discussedTopicIds.length)} حوارات`
                  : `${toArabicDigits(challenges.completedChallengeIds.length)} تحديات`}
          </span>
        </div>
        <div
          aria-hidden="true"
          className="mt-1.5 h-px w-full bg-gradient-to-l from-transparent via-[#D6286C]/30 to-transparent"
        />
      </header>

      {/* Multi-Mode Switcher (hides empty upcoming tabs) + Content */}
      <div className="flex-1 min-h-0 flex flex-col justify-start py-2 gap-2">
        {visibleTabs.length > 1 && (
          <div
            role="tablist"
            aria-label="أنماط السجل"
            className="shrink-0 p-1 ad-cut-tile bg-[#FCEEF3]/85 border border-[#EFCBD7] flex items-center gap-1 overflow-x-auto ad-no-scrollbar"
          >
            {visibleTabs.map((tab) => {
              const isActive = activeModeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    onTapFeedback?.();
                    setActiveModeTab(tab.id);
                  }}
                  className={`flex-1 min-h-[44px] px-3 ad-cut-chip text-xs active:scale-[0.98] transition-[background-color,color,transform] duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#360D21] text-white font-bold shadow-xs'
                      : 'text-[#5E364A] hover:text-[#360D21] hover:bg-white/60 font-semibold'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {activeModeTab !== 'questions' ? (
          <div
            key={activeModeTab}
            className={`flex-1 min-h-0 overflow-y-auto ad-no-scrollbar flex flex-col gap-3 py-1 pb-nav-dock ${
              motionEnabled ? 'ad-anim-content-swap' : ''
            }`}
          >
            {activeModeTab === 'cards' && (
              <div className="ad-cut-card bg-gradient-to-b from-white to-[#FFF4F8] border border-[#F1CEDB] p-4 flex flex-col gap-3 shadow-[0_10px_26px_rgba(214,40,108,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#B83265]">سجل النمط التفاعلي</span>
                    <h2 className="font-display-ar text-xl font-bold text-[#360D21]">
                      بطاقات الجرأة
                    </h2>
                  </div>
                  <WhisperPetalIcon className="w-5 h-5 text-[#B83265]" />
                </div>
                <div className="grid grid-cols-3 gap-2 border-y border-[#F4D9E3] py-2.5 text-center tabular-nums-ar">
                  <div>
                    <p className="text-base font-extrabold text-[#360D21]">{toArabicDigits(cards.sessionsCompleted)}</p>
                    <p className="text-[11px] text-[#5E364A]">جلسات مكتملة</p>
                  </div>
                  <div className="border-x border-[#F4D9E3]">
                    <p className="text-base font-extrabold text-[#D6286C]">{toArabicDigits(cards.drawnCount)}</p>
                    <p className="text-[11px] text-[#5E364A]">بطاقات مسحوبة</p>
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-[#360D21]">{toArabicDigits(cards.favoriteCardIds.length)}</p>
                    <p className="text-[11px] text-[#5E364A]">بطاقات مفضلة</p>
                  </div>
                </div>
                <p className="text-xs text-[#5E364A] leading-relaxed">
                  سجل «بطاقات الجرأة» مرتبط بناقل الجلسة الحية لتوثيق البطاقات المسحوبة والمنفّذة تلقائياً عند تشغيل النمط في جولاتكما الحية بين الجهازين.
                </p>
              </div>
            )}

            {activeModeTab === 'dialogue' && (
              <div className="ad-cut-card bg-gradient-to-b from-white to-[#FFF4F8] border border-[#F1CEDB] p-4 flex flex-col gap-3 shadow-[0_10px_26px_rgba(214,40,108,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#9C1A52]">سجل النمط التفاعلي</span>
                    <h2 className="font-display-ar text-xl font-bold text-[#360D21]">
                      همسات الحوار
                    </h2>
                  </div>
                  <WhisperPetalIcon className="w-5 h-5 text-[#9C1A52]" />
                </div>
                <div className="grid grid-cols-3 gap-2 border-y border-[#F4D9E3] py-2.5 text-center tabular-nums-ar">
                  <div>
                    <p className="text-base font-extrabold text-[#360D21]">{toArabicDigits(dialogue.sessionsCompleted)}</p>
                    <p className="text-[11px] text-[#5E364A]">أمسيات حوار</p>
                  </div>
                  <div className="border-x border-[#F4D9E3]">
                    <p className="text-base font-extrabold text-[#D6286C]">{toArabicDigits(dialogue.discussedTopicIds.length)}</p>
                    <p className="text-[11px] text-[#5E364A]">محاور مطروحة</p>
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-[#360D21]">{toArabicDigits(dialogue.favoriteTopicIds.length)}</p>
                    <p className="text-[11px] text-[#5E364A]">مفضلة</p>
                  </div>
                </div>
                <p className="text-xs text-[#5E364A] leading-relaxed">
                  تُحفظ هنا المحاور الحوارية المفتوحة والموضوعات المميّزة بنجمة خلال الجلسات المتزامنة بين الزوج والزوجة فور تفعيل هذا النمط.
                </p>
              </div>
            )}

            {activeModeTab === 'challenges' && (
              <div className="ad-cut-card bg-gradient-to-b from-white to-[#FFF4F8] border border-[#F1CEDB] p-4 flex flex-col gap-3 shadow-[0_10px_26px_rgba(214,40,108,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#C92363]">سجل النمط التفاعلي</span>
                    <h2 className="font-display-ar text-xl font-bold text-[#360D21]">
                      تحديات المساء
                    </h2>
                  </div>
                  <WhisperPetalIcon className="w-5 h-5 text-[#C92363]" />
                </div>
                <div className="grid grid-cols-2 gap-2 border-y border-[#F4D9E3] py-2.5 text-center tabular-nums-ar">
                  <div>
                    <p className="text-base font-extrabold text-[#360D21]">{toArabicDigits(challenges.sessionsCompleted)}</p>
                    <p className="text-[11px] text-[#5E364A]">جلسات مكتملة</p>
                  </div>
                  <div className="border-r border-[#F4D9E3]">
                    <p className="text-base font-extrabold text-[#D6286C]">{toArabicDigits(challenges.completedChallengeIds.length)}</p>
                    <p className="text-[11px] text-[#5E364A]">تحديات منجزة</p>
                  </div>
                </div>
                <p className="text-xs text-[#5E364A] leading-relaxed">
                  يُوثق هذا السجل التحديات الثنائية المؤقتة والنتائج المشتركة عبر القناة الحية بين الجهازين فور إطلاق نمط «تحديات المساء».
                </p>
              </div>
            )}

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={() => {
                  onTapFeedback?.();
                  onOpenSyncModal();
                }}
                className="w-full min-h-[46px] px-4 ad-cut-tile bg-white border border-[#EFCBD7] hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 text-xs font-bold text-[#7B1E48] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {hasNativeNearby ? (
                  <Bluetooth className="w-4 h-4 text-[#D6286C]" aria-hidden="true" />
                ) : (
                  <Cloud className="w-4 h-4 text-[#D6286C]" aria-hidden="true" />
                )}
                <span>
                  {hasNativeNearby
                    ? 'إدارة الاقتران القريب والمزامنة بدون نت'
                    : 'إدارة المزامنة السحابية الآمنة'}
                </span>
              </button>
            )}
          </div>
        ) : (
          <>
            {isHusband && progress.partnerSnapshot.lastSyncedAt === null && onOpenSyncModal && (
              <PartnerSyncBanner
                compact
                partnerName={progress.partnerSnapshot.partnerName}
                onPress={() => {
                  onTapFeedback?.();
                  onOpenSyncModal();
                }}
              />
            )}

            <FilterTabStrip
              tabs={LOG_FILTER_OPTIONS.map((f) => ({
                id: f.id,
                label: f.label,
                count: logCounts[f.id],
              }))}
              activeId={activeFilter}
              onChange={(id) => {
                setActiveFilter(id);
                setExpandedSetId(null);
                setConfirmResetSetId(null);
              }}
              ariaLabel="تصفية سجل الأسئلة"
              showEdgeFade
            />

        {filteredRealms.length === 0 || !filteredRealm || !frProgress ? (
          <div className="flex-1 flex items-center justify-center px-4 pb-nav-dock">
            <div className="w-full ad-cut-card bg-white/90 border border-dashed border-[#E8AFC3] p-6 text-center flex flex-col items-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-sm font-bold text-[#360D21]">
                  {isHusband
                    ? `لا توجد إجابات متزامنة من ${progress.partnerSnapshot.partnerName} ضمن هذا التصنيف بعد`
                    : 'لا توجد عوالم ضمن هذا التصنيف بعد'}
                </p>
                <p className="text-xs text-[#5E364A] leading-relaxed">
                  {isHusband
                    ? hasNativeNearby
                      ? 'اقترن بجهاز الشريكة عبر البلوتوث أو الواي فاي المباشر أو السحابة المشفّرة لعرض اختياراتها داخل الأسئلة وفي السجل.'
                      : 'اربط حسابك سحابياً بجهاز الشريكة لعرض اختياراتها داخل الأسئلة وفي السجل.'
                    : 'ابدئي بالإجابة على الأسئلة في أحد العوالم لتظهر تفاصيل تقدمكِ هنا.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {activeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      onTapFeedback?.();
                      setActiveFilter('all');
                    }}
                      className="min-h-[44px] px-3.5 ad-cut-chip bg-[#FCEEF3] text-[#7B1E48] text-xs font-bold hover:bg-[#FADCE7] active:scale-[0.97] transition-[background-color,transform] duration-150 cursor-pointer"
                    >
                      عرض جميع العوالم
                    </button>
                  )}
                  {isHusband && onOpenSyncModal ? (
                    <button
                      type="button"
                      onClick={() => {
                        onTapFeedback?.();
                        onOpenSyncModal();
                      }}
                      className="min-h-[44px] px-4 ad-cut-chip bg-[#D6286C] text-white text-xs font-bold flex items-center gap-1.5 hover:brightness-95 active:scale-[0.98] transition-[transform,filter] duration-150 cursor-pointer shadow-xs"
                    >
                      {hasNativeNearby ? (
                        <Bluetooth className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>مزامنة اختيارات الشريكة</span>
                    </button>
                  ) : (
                    onExploreRealms && (
                      <button
                        type="button"
                        onClick={() =>
                          runLocked(() => {
                            onTapFeedback?.();
                            onExploreRealms();
                          })
                        }
                        className="min-h-[44px] px-4 ad-cut-chip bg-[#D6286C] text-white text-xs font-bold flex items-center gap-1 hover:brightness-95 active:scale-[0.98] transition-[transform,filter] duration-150 cursor-pointer shadow-xs"
                      >
                      <span>استكشاف العوالم</span>
                      <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto snap-x snap-mandatory ad-no-scrollbar pb-0.5">
              {filteredRealms.map((r) => {
                const isSelected = r.id === filteredRealm.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={(e) => {
                      handleSelectRealm(r.id);
                      e.currentTarget.scrollIntoView({
                        behavior: motionEnabled ? 'smooth' : 'auto',
                        inline: 'nearest',
                        block: 'nearest',
                      });
                    }}
                    aria-pressed={isSelected}
                    style={
                      isSelected
                        ? { backgroundColor: r.accentHex, borderColor: r.accentHex }
                        : undefined
                    }
                    className={`shrink-0 snap-start min-h-[44px] px-3 ad-cut-chip text-xs border active:scale-[0.97] transition-[background-color,border-color,color,transform] duration-150 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'text-white font-semibold shadow-sm'
                        : 'bg-white/95 border-[#EFCBD7] text-[#5E364A] hover:border-[#D6286C]/50'
                    }`}
                  >
                    {r.romanNumeral} · {r.title}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto ad-no-scrollbar pb-nav-dock">
              <div
                key={filteredRealm.id}
                className={`flex flex-col justify-start gap-2.5 ${
                  motionEnabled ? 'ad-anim-content-swap' : ''
                }`}
              >
              {/* Structured Realm Summary Folio */}
              <div className="relative shrink-0 ad-cut-card bg-gradient-to-b from-white via-[#FFF9FB] to-[#FFF0F6] border border-[#F1CEDB] p-4 flex flex-col gap-2.5 shadow-[0_10px_24px_rgba(214,40,108,0.09)] overflow-hidden">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-20"
                  style={{
                    background: `radial-gradient(ellipse 80% 90% at 50% 0%, ${filteredRealm.accentHex}18 0%, transparent 72%)`,
                  }}
                />
                <CornerRoseFiligree
                  position="top-right"
                  color={filteredRealm.accentHex}
                  className="w-6 h-6 opacity-25"
                />
                <CornerRoseFiligree
                  position="bottom-left"
                  color={filteredRealm.accentHex}
                  className="w-6 h-6 opacity-25"
                />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className="font-display-ar text-xs font-bold block tabular-nums-ar"
                      style={{ color: filteredRealm.accentHex }}
                    >
                      العالم {toArabicDigits(filteredRealm.order)}
                    </span>
                    <h2 className="font-display-ar text-xl font-bold text-[#360D21] truncate leading-snug py-0.5">
                      {filteredRealm.title}
                    </h2>
                  </div>
                  <RoseRingProgress
                    percent={frProgress.percent}
                    size={52}
                    strokeWidth={4}
                    accentHex={filteredRealm.accentHex}
                    label={`${toArabicDigits(frProgress.percent)}٪`}
                  />
                </div>

                <div className="relative z-10">
                  <RoseDivider color={filteredRealm.accentHex} />
                </div>

                <p className="relative z-10 text-xs text-[#5E364A] leading-relaxed line-clamp-2">
                  {filteredRealm.description}
                </p>

                <div className="relative z-10 flex items-center justify-between pt-2 border-t border-[#F7DCE6] text-xs">
                  <span className="text-[#5E364A]">مستويات الجرأة المكتملة</span>
                  <span className="font-bold text-[#360D21] tabular-nums-ar">
                    {toArabicDigits(frProgress.completedSets)} من {toArabicDigits(frProgress.totalSets)}
                  </span>
                </div>
              </div>

              {/* Expandable Saved-Answers Tiers (Stays inside LogScreen) */}
              {filteredRealm.sets.map((set) => {
                const summary = getSetProgress(viewProgress, set);
                const isExpanded = expandedSetId === set.id;
                const isConfirmingReset = !isHusband && confirmResetSetId === set.id;
                const isUpdatedSyncSet = isHusband && updatedSetIds.includes(set.id);
                const setAnswers = viewProgress.answersBySet[set.id] ?? {};

                return (
                  <div
                    key={set.id}
                    className="ad-cut-tile bg-white/95 border border-[#EFCBD7] p-3.5 flex flex-col gap-2.5 shrink-0"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmResetSetId(null);
                          if (isUpdatedSyncSet) {
                            onMarkSetSeen?.(set.id);
                          }
                          setExpandedSetId((prev) => (prev === set.id ? null : set.id));
                        }}
                        aria-expanded={isExpanded}
                        className="flex-1 min-h-[44px] text-right min-w-0 cursor-pointer active:scale-[0.99] transition-transform duration-150 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {summary.isCompleted && (
                              <CheckCircle2
                                className="w-4 h-4 shrink-0"
                                style={{ color: filteredRealm.accentHex }}
                                aria-hidden="true"
                              />
                            )}
                            <span className="text-sm font-bold text-[#360D21] truncate">
                              {set.title}
                            </span>
                            {isUpdatedSyncSet && (
                              <span className="text-[11px] font-bold text-[#D6286C] shrink-0">
                                · تحديث جديد
                              </span>
                            )}
                            <span
                              className="text-[11px] font-semibold shrink-0"
                              style={{
                                color: summary.isCompleted ? filteredRealm.accentHex : '#5E364A',
                              }}
                            >
                              ·{' '}
                              {isHusband
                                ? summary.status === 'completed'
                                  ? 'تمت إجابتها'
                                  : summary.status === 'in-progress'
                                    ? 'جزئي'
                                    : 'لم تُجب'
                                : summary.status === 'completed'
                                  ? 'مكتمل'
                                  : summary.status === 'in-progress'
                                    ? 'قيد الاستكمال'
                                    : 'لم يبدأ'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5E364A] mt-0.5 tabular-nums-ar">
                            {toArabicDigits(summary.answeredQuestions)} من{' '}
                            {toArabicDigits(summary.totalQuestions)} أسئلة —{' '}
                            {toArabicDigits(summary.totalSelectionsCount)} اختيارات محفوظة
                          </p>
                        </div>

                        <span className="w-8 h-8 ad-cut-chip bg-[#FFF4F8] border border-[#F4D9E3] text-[#5E364A] flex items-center justify-center shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="w-4 h-4" aria-hidden="true" />
                          )}
                        </span>
                      </button>

                      {!isHusband && summary.answeredQuestions > 0 && !isConfirmingReset && (
                        <button
                          type="button"
                          onClick={() => setConfirmResetSetId(set.id)}
                          aria-label={`إعادة ضبط ${set.title}`}
                          className="min-w-[44px] min-h-[44px] ad-cut-chip bg-[#FCEEF3] text-[#5E364A] hover:text-[#D6286C] active:scale-95 flex items-center justify-center transition-[color,transform] duration-150 cursor-pointer shrink-0"
                        >
                          <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {/* Inline Two-Step Set Reset Confirmation (Wife Only) */}
                    {isConfirmingReset && (
                      <InlineConfirmBox
                        containerRef={(el) => {
                          confirmResetRefs.current[set.id] = el;
                        }}
                        variant="destructive"
                        message={`مسح جميع إجابات مستوى «${set.title}»؟`}
                        confirmLabel="تأكيد المسح"
                        cancelLabel="تراجع"
                        onConfirm={() => {
                          onResetSet(set.id);
                          setConfirmResetSetId(null);
                          setExpandedSetId((prev) => (prev === set.id ? null : prev));
                        }}
                        onCancel={() => setConfirmResetSetId(null)}
                      />
                    )}

                    <div className="h-1.5 w-full rounded-full bg-[#FCE8F0] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${summary.percent}%`,
                          backgroundColor: filteredRealm.accentHex,
                        }}
                      />
                    </div>

                    {/* Expandable Saved Answers Breakdown + Explicit Open/Continue CTA */}
                    {isExpanded && (
                      <div
                        className={`pt-2 border-t border-[#F6DCE6] flex flex-col ${
                          motionEnabled ? 'ad-anim-content-swap' : ''
                        }`}
                      >
                        <div className="divide-y divide-[#F6DCE6]">
                          {set.questions.map((q, qIdx) => {
                            const pickedIds = setAnswers[q.id] ?? [];
                            const pickedLabels = q.options
                              .filter((opt) => pickedIds.includes(opt.id))
                              .map((opt) => opt.label);

                            return (
                              <div
                                key={q.id}
                                className="py-2.5 first:pt-1.5 text-right"
                              >
                                <p className="text-[11px] font-semibold text-[#360D21] leading-snug">
                                  <span
                                    className="tabular-nums-ar ml-1"
                                    style={{ color: filteredRealm.accentHex }}
                                  >
                                    {toArabicDigits(qIdx + 1)}.
                                  </span>
                                  {q.prompt}
                                </p>
                                <p className="text-[11px] text-[#5E364A] mt-1 leading-relaxed">
                                  {pickedLabels.length > 0
                                    ? pickedLabels.join(' · ')
                                    : isHusband
                                      ? `لم تختر ${progress.partnerSnapshot.partnerName} إجابة بعد`
                                      : 'لم تُسجَّل إجابة لهذا السؤال بعد'}
                                </p>
                                {pickedLabels.length > 0 && onDiscussInChat && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      runLocked(() => {
                                        onTapFeedback?.();
                                        onDiscussInChat(
                                          `عن السؤال ${toArabicDigits(qIdx + 1)} في «${filteredRealm.title} — ${set.title}»: ${pickedLabels.join(' · ')}`
                                        );
                                      })
                                    }
                                    className="mt-2 min-h-[44px] px-3 ad-cut-chip bg-[#FFF5F8] border border-[#F1AFC8] hover:border-[#D6286C] active:scale-[0.98] inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9E194D] cursor-pointer transition-[border-color,transform] duration-150"
                                  >
                                    <MessageCircleHeart className="w-3.5 h-3.5 text-[#D6286C]" aria-hidden="true" />
                                    <span>مناقشة في الدردشة</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {onEditSet && (
                          <button
                            type="button"
                            onClick={() =>
                              runLocked(() => {
                                if (isUpdatedSyncSet) {
                                  onMarkSetSeen?.(set.id);
                                }
                                onEditSet(filteredRealm.id, set.id);
                              })
                            }
                            style={{ borderColor: filteredRealm.accentHex, color: filteredRealm.accentHex }}
                            className="mt-2 w-full min-h-[44px] ad-cut-tile bg-white border text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#FFF6F9] active:scale-[0.99] transition-[background-color,transform] duration-150 cursor-pointer"
                          >
                            <span>
                              {isHusband
                                ? 'عرض الأسئلة محددة باختياراتها'
                                : summary.isCompleted
                                  ? 'مراجعة البطاقات والقصاصات'
                                  : summary.answeredQuestions > 0
                                    ? 'استكمال الأسئلة المتبقية'
                                    : 'ابدئي هذا المستوى'}
                            </span>
                            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {hiddenUpcomingTabs.length > 0 && (
                <div className="shrink-0 ad-cut-tile bg-white/80 border border-[#F1AFC8]/80 px-3 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => setShowUpcomingModesNote((prev) => !prev)}
                    className="w-full min-h-[44px] text-[11px] font-semibold text-[#5E364A] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>
                      أنماط قادمة (قريباً): {hiddenUpcomingTabs.map((t) => t.label).join(' · ')}
                    </span>
                    {showUpcomingModesNote ? (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                  {showUpcomingModesNote && (
                    <p
                      className={`pb-1.5 text-[11px] text-[#5E364A] leading-relaxed ${
                        motionEnabled ? 'ad-anim-toast-in' : ''
                      }`}
                    >
                      ستظهر سجلات «بطاقات الجرأة» و«همسات الحوار» و«تحديات المساء» تلقائياً هنا فور تفعيلها وتوثيق أول جلسة.
                    </p>
                  )}
                </div>
              )}
              </div>
            </div>
          </>
        )}
          </>
        )}
      </div>
    </section>
  );
}
