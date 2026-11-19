import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, LayoutGrid } from 'lucide-react';
import type { GameProgress, GameRealm } from '../data/types';
import {
  formatSetsCount,
  getQuestionsViewProgress,
  getRealmProgress,
  toArabicDigits,
  type RealmProgressSummary,
} from '../game/engine';
import { useHasNativeNearby } from '../sync/usePlatformCapabilities';
import { ArtworkFrame } from './ArtworkFrame';
import { useBackOverlay } from '../utils/backNavigation';
import { useActionLock } from '../utils/useActionLock';
import {
  RoseDivider,
  RoseRingProgress,
} from './RoseFiligree';
import {
  FilterTabStrip,
  PartnerSyncBanner,
} from './SharedUI';
import {
  REALM_FILTER_OPTIONS,
  RealmDirectoryModal,
  RealmLevelSheetModal,
  RealmSetStatusModals,
  type CompletedSetNotice,
  type EmptyPartnerSetNotice,
  type InProgressSetNotice,
  type RealmFilter,
} from './realms/RealmsModals';

interface RealmsScreenProps {
  realms: GameRealm[];
  progress: GameProgress;
  initialRealmId?: string;
  autoOpenSheet?: boolean;
  updatedSetIds?: string[];
  onAutoOpenHandled?: () => void;
  onBack: () => void;
  backLabel?: string;
  onSelectRealm?: (realmId: string) => void;
  onSelectLevel: (realmId: string, setId: string) => void;
  onReplayCompletedSet?: (realmId: string, setId: string) => void;
  onReviewCompletedSet?: (realmId: string, setId: string) => void;
  onViewSetInLog?: (realmId: string, setId: string) => void;
  onOpenSyncModal?: () => void;
  onTapFeedback?: () => void;
  motionEnabled: boolean;
  transitionClassName?: string;
}

/**
 * شاشة العوالم — معرض بانورامي مقصوص + ميداليات مصغّرة حية ودليل شبكي سريع لجميع العوالم
 */
export function RealmsScreen({
  realms,
  progress,
  initialRealmId,
  autoOpenSheet = false,
  updatedSetIds = [],
  onAutoOpenHandled,
  onBack,
  backLabel = 'العودة لأنماط اللعبة',
  onSelectRealm,
  onSelectLevel,
  onReplayCompletedSet,
  onReviewCompletedSet,
  onViewSetInLog,
  onOpenSyncModal,
  onTapFeedback,
  motionEnabled,
  transitionClassName = 'ad-anim-screen-curtain',
}: RealmsScreenProps) {
  const isHusband = progress.role === 'husband';
  const hasNativeNearby = useHasNativeNearby();
  const viewProgress = useMemo(() => getQuestionsViewProgress(progress), [progress]);
  const { runLocked } = useActionLock(450);
  const [selectedRealmId, setSelectedRealmId] = useState<string>(
    () => (realms.find((r) => r.id === initialRealmId) ?? realms[0])?.id ?? ''
  );
  const [activeFilter, setActiveFilter] = useState<RealmFilter>('all');
  const [directoryFilter, setDirectoryFilter] = useState<RealmFilter>('all');
  const [showLevelSheet, setShowLevelSheet] = useState<boolean>(autoOpenSheet);
  const [showAllDirectory, setShowAllDirectory] = useState<boolean>(false);
  const [completedSetNotice, setCompletedSetNotice] = useState<CompletedSetNotice | null>(null);
  const [confirmReplayNotice, setConfirmReplayNotice] = useState<boolean>(false);
  const [inProgressSetNotice, setInProgressSetNotice] = useState<InProgressSetNotice | null>(null);
  const [confirmRestartInProgress, setConfirmRestartInProgress] = useState<boolean>(false);
  const [emptyPartnerSetNotice, setEmptyPartnerSetNotice] = useState<EmptyPartnerSetNotice | null>(null);
  const realmItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (initialRealmId && realms.some((r) => r.id === initialRealmId)) {
      setSelectedRealmId(initialRealmId);
    }
  }, [initialRealmId, realms]);

  useEffect(() => {
    if (autoOpenSheet) {
      setShowLevelSheet(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpenSheet, onAutoOpenHandled]);

  const realmSummaryMap = useMemo(() => {
    const map = new Map<string, RealmProgressSummary>();
    for (const realm of realms) {
      map.set(realm.id, getRealmProgress(viewProgress, realm));
    }
    return map;
  }, [realms, viewProgress]);

  const realmMatchesFilter = useCallback(
    (realm: GameRealm, filter: RealmFilter) => {
      const summary = realmSummaryMap.get(realm.id) ?? getRealmProgress(viewProgress, realm);
      if (filter === 'completed') return summary.isRealmCompleted;
      if (filter === 'in-progress') {
        return summary.answeredQuestions > 0 && !summary.isRealmCompleted;
      }
      if (filter === 'new') return summary.answeredQuestions === 0;
      return true;
    },
    [realmSummaryMap, viewProgress]
  );

  const filterCounts = useMemo<Record<RealmFilter, number>>(() => {
    let inProgress = 0;
    let completed = 0;
    let fresh = 0;
    for (const realm of realms) {
      const summary = realmSummaryMap.get(realm.id);
      if (!summary) continue;
      if (summary.isRealmCompleted) completed += 1;
      else if (summary.answeredQuestions > 0) inProgress += 1;
      else fresh += 1;
    }
    return {
      all: realms.length,
      'in-progress': inProgress,
      completed,
      new: fresh,
    };
  }, [realms, realmSummaryMap]);

  const filteredRealms = useMemo(
    () => realms.filter((realm) => realmMatchesFilter(realm, activeFilter)),
    [realms, realmMatchesFilter, activeFilter]
  );
  const isFilterEmpty = filteredRealms.length === 0;

  const activeRealm = useMemo(
    () =>
      filteredRealms.find((r) => r.id === selectedRealmId) ??
      filteredRealms[0] ??
      realms.find((r) => r.id === selectedRealmId) ??
      realms[0],
    [filteredRealms, realms, selectedRealmId]
  );
  const activeSummary = realmSummaryMap.get(activeRealm.id) ?? getRealmProgress(viewProgress, activeRealm);

  const directoryRealms = useMemo(
    () => realms.filter((realm) => realmMatchesFilter(realm, directoryFilter)),
    [realms, realmMatchesFilter, directoryFilter]
  );

  const handleChooseRealm = (realmId: string) => {
    setSelectedRealmId(realmId);
    onSelectRealm?.(realmId);
  };

  useEffect(() => {
    if (isFilterEmpty) return;
    const el = realmItemRefs.current[activeRealm.id];
    if (el) {
      el.scrollIntoView({
        behavior: motionEnabled ? 'smooth' : 'auto',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [activeRealm.id, activeFilter, isFilterEmpty, motionEnabled]);

  const subNoticeOpen = Boolean(
    completedSetNotice || inProgressSetNotice || emptyPartnerSetNotice
  );
  const layer1Open = showLevelSheet || showAllDirectory || subNoticeOpen;

  const closeSubNoticeToLevelSheet = () => {
    setCompletedSetNotice(null);
    setConfirmReplayNotice(false);
    setInProgressSetNotice(null);
    setConfirmRestartInProgress(false);
    setEmptyPartnerSetNotice(null);
    setShowLevelSheet(true);
  };

  const closeLayer1 = () => {
    setShowLevelSheet(false);
    setShowAllDirectory(false);
    setCompletedSetNotice(null);
    setConfirmReplayNotice(false);
    setInProgressSetNotice(null);
    setConfirmRestartInProgress(false);
    setEmptyPartnerSetNotice(null);
  };

  useBackOverlay(layer1Open, 'realms-sheet', closeLayer1);
  useBackOverlay(subNoticeOpen, 'realms-subnotice', closeSubNoticeToLevelSheet);

  useEffect(() => {
    if (!layer1Open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (subNoticeOpen) {
          closeSubNoticeToLevelSheet();
        } else {
          closeLayer1();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [layer1Open, subNoticeOpen]);

  return (
    <section
      className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${
        motionEnabled ? transitionClassName : ''
      }`}
      aria-label="استكشاف العوالم"
    >
      {/* Top Edge-to-Edge Curved Panorama Stage */}
      <div className="relative h-[37%] sm:h-[46%] min-h-[168px] shrink-0 overflow-hidden bg-[#FAD3E2]">
        {isFilterEmpty ? (
          <div className="w-full h-full bg-gradient-to-b from-[#FFE6F0] via-[#FAD0E1] to-[#F7BCD3] flex flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-white/80 border border-[#EBA8C3] flex items-center justify-center text-[#D6286C] shadow-xs">
              <LayoutGrid className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="w-24">
              <RoseDivider color="#D6286C" />
            </div>
          </div>
        ) : (
          <ArtworkFrame
            src={activeRealm.artworkSrc}
            alt={activeRealm.title}
            accentHex={activeRealm.accentHex}
            motif={activeRealm.motif}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        )}

        {/* Soft luminous rose top gradient for clean header legibility */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-22 bg-gradient-to-b from-[#FFE9F1]/95 via-[#FFE9F1]/68 to-transparent"
        />

        {/* Floating Minimal Header */}
        <header className="absolute top-0 inset-x-0 z-20 pt-safe px-3 sm:px-4 grid grid-cols-[minmax(7.5rem,1fr)_minmax(0,auto)_minmax(7.5rem,1fr)] items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onTapFeedback?.();
              onBack();
            }}
            aria-label={backLabel}
            className="justify-self-start shrink-0 min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#360D21] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shadow-sm"
          >
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>

          <h1
            key={isFilterEmpty ? 'empty-filter' : activeRealm.id}
            className={`min-w-0 text-center truncate px-1 py-0.5 leading-snug font-display-ar text-xl sm:text-[1.45rem] font-bold text-[#360D21] ${
              motionEnabled ? 'ad-anim-content-swap' : ''
            }`}
          >
            {isFilterEmpty ? 'عوالم اللعبة' : activeRealm.title}
          </h1>

          <span className="justify-self-end" aria-hidden="true" />
        </header>

        {/* Sculptural Asymmetric Curved Cutout at bottom of Panorama */}
        <svg
          viewBox="0 0 400 64"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -bottom-px inset-x-0 w-full h-11 text-[#FFE9F1]"
        >
          <path
            d="M0,64 L0,20 C115,62 260,-6 400,32 L400,64 Z"
            fill="currentColor"
          />
          <path
            d="M0,20 C115,62 260,-6 400,32"
            fill="none"
            stroke={activeRealm.accentHex}
            strokeOpacity="0.45"
            strokeWidth="1.6"
          />
        </svg>

        {/* Overlapping Arabic Crest Medallion — opens Boldness Tier modal */}
        {!isFilterEmpty && (
          <button
            type="button"
            onClick={() => {
              onTapFeedback?.();
              setShowLevelSheet(true);
            }}
            aria-label={`مؤشر تقدم ${activeRealm.title}`}
            className="absolute bottom-1.5 right-5 z-20 rounded-full bg-gradient-to-br from-white to-[#FFE6EF] p-1.5 shadow-[0_10px_24px_rgba(214,40,108,0.24)] border border-[#F1AFC8] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          >
            <RoseRingProgress
              percent={activeSummary.percent}
              size={50}
              strokeWidth={4}
              accentHex={activeRealm.accentHex}
              label={toArabicDigits(activeRealm.order)}
            />
          </button>
        )}

      </div>

      {/* Lower Luminous Porcelain Content + Visual Medallion Switcher & Primary CTA */}
      <div className="flex-1 min-h-0 flex flex-col justify-start gap-1.5 sm:gap-2 px-5 pt-0.5 pb-nav-dock overflow-y-auto ad-no-scrollbar">
        {/* Selected Realm Editorial Details + Hairline Progress (or aligned empty-filter message) */}
        {isFilterEmpty ? (
          <div
            className={`shrink-0 ad-cut-tile bg-white/88 border border-dashed border-[#E8AFC3] px-4 py-4 flex flex-col gap-1.5 shadow-xs ${
              motionEnabled ? 'ad-anim-content-swap' : ''
            }`}
          >
            <h2 className="font-display-ar text-[1.25rem] sm:text-[1.4rem] font-bold text-[#360D21] leading-[1.25]">
              لا توجد عوالم مطابقة لهذا التصنيف
            </h2>
            <p className="text-xs text-[#5E364A] leading-relaxed">
              {isHusband
                ? 'اختر تصنيفاً آخر أو اعرض جميع العوالم المتاحة لمتابعة اختيارات الشريكة.'
                : 'اختاري تصنيفاً آخر أو اعرضي جميع العوالم المتاحة للبدء أو استكمال التقدم.'}
            </p>
          </div>
        ) : (
          <div key={activeRealm.id} className={`shrink-0 ${motionEnabled ? 'ad-anim-content-swap' : ''}`}>
            <p
              className="text-xs font-bold truncate leading-tight"
              style={{ color: activeRealm.accentHex }}
            >
              {activeRealm.tagline}
            </p>
            <p className="text-xs text-[#5E364A] leading-snug mt-0.5 line-clamp-2">
              {activeRealm.description}
            </p>

            {/* Compact Selected-Realm Progress Track (BiDi-safe separator) */}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#5E364A] tabular-nums-ar shrink-0 inline-flex items-center gap-1.5">
                <span>{formatSetsCount(activeSummary.totalSets)}</span>
                <span aria-hidden="true" className="text-[#C87899]">|</span>
                <span>
                  {toArabicDigits(activeSummary.answeredQuestions)} من {toArabicDigits(activeSummary.totalQuestions)}
                </span>
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-[#FAD0E0] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${activeSummary.percent}%`,
                    backgroundColor: activeRealm.accentHex,
                  }}
                />
              </div>
              <span
                className="text-[11px] font-bold tabular-nums-ar shrink-0"
                style={{ color: activeRealm.accentHex }}
              >
                {toArabicDigits(activeSummary.percent)}٪
              </span>
            </div>

            {isHusband && progress.partnerSnapshot.lastSyncedAt === null && onOpenSyncModal && (
              <PartnerSyncBanner
                compact
                className="mt-1.5"
                partnerName={progress.partnerSnapshot.partnerName}
                onPress={() => {
                  onTapFeedback?.();
                  onOpenSyncModal();
                }}
              />
            )}
          </div>
        )}

        {/* Cohesive Bottom Control Block: >=44px Filter + Larger Realm Buttons + Unified Primary Action */}
        <div className="shrink-0 flex flex-col gap-2 sm:gap-2.5">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center justify-between gap-1.5">
              <FilterTabStrip
                className="flex-1 min-w-0"
                tabs={REALM_FILTER_OPTIONS.map((f) => ({
                  id: f.id,
                  label: f.label,
                  count: filterCounts[f.id],
                }))}
                activeId={activeFilter}
                accentHex={isFilterEmpty ? '#D6286C' : activeRealm.accentHex}
                showEdgeFade
                fadeFromClass="from-[#FFE5F0]"
                ariaLabel="تصفية العوالم"
                onChange={(filterId) => {
                  onTapFeedback?.();
                  setActiveFilter(filterId);
                  const nextList = realms.filter((realm) => realmMatchesFilter(realm, filterId));
                  if (nextList.length > 0 && !nextList.some((r) => r.id === activeRealm.id)) {
                    handleChooseRealm(nextList[0].id);
                  }
                }}
              />

              <button
                type="button"
                onClick={() => {
                  onTapFeedback?.();
                  setDirectoryFilter(activeFilter);
                  setShowAllDirectory(true);
                }}
                aria-label="عرض جميع العوالم في شبكة"
                title="دليل جميع العوالم"
                className="shrink-0 min-h-[44px] min-w-[44px] ad-cut-chip bg-white/95 border border-[#EFCBD7] hover:border-[#D6286C]/60 active:scale-95 flex items-center justify-center transition-[color,border-color,transform] duration-150 cursor-pointer shadow-xs"
              >
                <LayoutGrid
                  className="w-4 h-4"
                  style={{ color: isFilterEmpty ? '#D6286C' : activeRealm.accentHex }}
                  aria-hidden="true"
                />
              </button>
            </div>

            {!isFilterEmpty && (
              <div
                role="list"
                aria-label="قائمة العوالم"
                className="flex items-start gap-2.5 sm:gap-3 overflow-x-auto snap-x snap-mandatory ad-no-scrollbar py-0.5 scroll-px-1"
              >
                {filteredRealms.map((realm) => {
                  const isSelected = realm.id === activeRealm.id;
                  const summary = realmSummaryMap.get(realm.id) ?? getRealmProgress(viewProgress, realm);
                  const hasSyncUpdate =
                    isHusband && realm.sets.some((s) => updatedSetIds.includes(s.id));
                  return (
                    <div
                      key={realm.id}
                      ref={(node) => {
                        realmItemRefs.current[realm.id] = node;
                      }}
                      role="listitem"
                      className="shrink-0 w-[114px] sm:w-[126px] snap-start flex flex-col items-center gap-1.5"
                    >
                        <button
                        type="button"
                        onClick={() => {
                          onTapFeedback?.();
                          handleChooseRealm(realm.id);
                        }}
                        aria-label={realm.title}
                        aria-pressed={isSelected}
                        style={
                          isSelected
                            ? {
                                borderColor: realm.accentHex,
                                boxShadow: '0 10px 22px rgba(145,42,82,0.22)',
                              }
                            : undefined
                        }
                        className={`group relative w-full h-[78px] sm:h-[96px] ad-cut-tile overflow-hidden bg-[#FAD3E2] active:scale-[0.97] transition-[transform,border-color,box-shadow] duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-2'
                            : 'border border-[#EFCBD7] hover:border-[#D6286C]/70'
                        }`}
                      >
                        <ArtworkFrame
                          src={realm.artworkSrc}
                          alt={realm.title}
                          accentHex={realm.accentHex}
                          motif={realm.motif}
                          variant="thumb"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[#240716]/35 to-transparent"
                        />
                        <span className="pointer-events-none absolute top-1.5 left-1.5 min-w-[20px] h-5 px-1.5 ad-cut-chip bg-[#240716]/76 text-[10px] font-bold text-white flex items-center justify-center tabular-nums-ar shadow-xs">
                          {toArabicDigits(realm.order)}
                        </span>
                        {/* Integrated 2.5px hairline progress bar along thumbnail base */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] bg-[#240716]/35"
                        >
                          <div
                            className="h-full transition-[width] duration-300"
                            style={{
                              width: `${summary.percent}%`,
                              backgroundColor: realm.accentHex,
                            }}
                          />
                        </div>
                      </button>

                      <span
                        className={`text-[11px] sm:text-xs leading-snug text-center w-full px-0.5 flex items-center justify-center gap-1 transition-colors ${
                          isSelected ? 'font-bold text-[#360D21]' : 'font-semibold text-[#5E364A]'
                        }`}
                      >
                        {hasSyncUpdate ? (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#D6286C] shrink-0"
                            aria-label="تحديث جديد"
                          />
                        ) : summary.isRealmCompleted ? (
                          <CheckCircle2
                            className="w-3 h-3 shrink-0"
                            style={{ color: realm.accentHex }}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="line-clamp-1">{realm.title}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unified Prominent Interactive Action Bar with Royal Seal (or Filter Reset when empty) */}
          {isFilterEmpty ? (
            <button
              type="button"
              onClick={() => {
                onTapFeedback?.();
                setActiveFilter('all');
              }}
              style={{ backgroundColor: '#D6286C' }}
              className="ad-shimmer-btn shrink-0 w-full min-h-[50px] ad-cut-tile text-white font-bold text-base flex items-center justify-center gap-2 hover:brightness-95 active:scale-[0.98] transition-[transform,filter,box-shadow] duration-150 cursor-pointer shadow-[0_14px_28px_rgba(214,40,108,0.28)]"
            >
              <span>عرض جميع العوالم</span>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onTapFeedback?.();
                setShowLevelSheet(true);
              }}
              aria-label={`فتح ${activeRealm.title}`}
              style={{
                background: `linear-gradient(245deg, ${activeRealm.accentHex} 0%, #9E194D 100%)`,
                boxShadow: `0 14px 30px ${activeRealm.accentHex}3D, inset 0 1px 0 rgba(255,255,255,0.28)`,
              }}
              className="ad-shimmer-btn group shrink-0 w-full min-h-[56px] pl-3 pr-2 py-1.5 ad-cut-tile border border-white/25 text-white flex items-center justify-between gap-2.5 cursor-pointer select-none hover:brightness-105 active:scale-[0.985] transition-[transform,filter,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#360D21]"
            >
              {/* Integrated Frosted Royal Seal Emblem on the leading edge */}
              <span className="relative w-10 h-10 rounded-full bg-white/95 border border-white/80 flex items-center justify-center shrink-0 shadow-sm">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 rounded-full opacity-50"
                  style={{
                    background: `radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 74%)`,
                  }}
                />
                <svg
                  viewBox="0 0 40 40"
                  className="relative z-10 w-6 h-6 overflow-visible"
                  style={{ color: activeRealm.accentHex }}
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id={`realmSealPetal-${activeRealm.id}`} cx="42%" cy="35%" r="68%">
                      <stop offset="0%" stopColor="#FFF7FA" />
                      <stop offset="56%" stopColor="#FFA2C6" />
                      <stop offset="100%" stopColor={activeRealm.accentHex} />
                    </radialGradient>
                  </defs>
                  <circle
                    cx="20"
                    cy="20"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <g
                    style={{ transformOrigin: '20px 20px' }}
                    className="transition-transform duration-500 ease-out group-hover:rotate-45 group-hover:scale-[1.08]"
                  >
                    <path
                      d="M20 8.2 C24.6 8.2 27.2 12.6 23.4 16.6 C27.4 12.8 31.8 15.4 31.8 20 C31.8 24.6 27.4 27.2 23.4 23.4 C27.2 27.4 24.6 31.8 20 31.8 C15.4 31.8 12.8 27.4 16.6 23.4 C12.6 27.2 8.2 24.6 8.2 20 C8.2 15.4 12.6 12.8 16.6 16.6 C12.8 12.6 15.4 8.2 20 8.2Z"
                      fill={`url(#realmSealPetal-${activeRealm.id})`}
                      fillOpacity="0.62"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="3.2"
                      fill="#FFF8FB"
                      stroke="currentColor"
                      strokeWidth="1.1"
                    />
                  </g>
                </svg>
              </span>

              <span className="flex-1 min-w-0 flex flex-col items-start text-right">
                <span className="text-sm sm:text-[15px] font-bold text-white leading-tight">
                  فتح العالم
                </span>
                <span className="text-[11px] font-medium text-[#FFE6F0] leading-snug">
                  {isHusband ? 'استعراض الجرأة وإجابات الشريكة' : 'اختاري مستوى الجرأة وابدئي الآن'}
                </span>
              </span>

              <span className="shrink-0 h-9 px-2.5 sm:px-3 ad-cut-chip bg-white/22 border border-white/30 text-white text-[11.5px] sm:text-xs font-bold flex items-center gap-1 transition-[background-color,border-color] duration-150">
                <span>المستويات</span>
                <ChevronLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
              </span>
            </button>
          )}
        </div>
      </div>

      <RealmLevelSheetModal
        isOpen={showLevelSheet}
        onClose={() => setShowLevelSheet(false)}
        activeRealm={activeRealm}
        viewProgress={viewProgress}
        isHusband={isHusband}
        updatedSetIds={updatedSetIds}
        motionEnabled={motionEnabled}
        onTapFeedback={onTapFeedback}
        runLocked={runLocked}
        onSelectLevel={onSelectLevel}
        onOpenEmptyPartnerSet={(notice) => setEmptyPartnerSetNotice(notice)}
        onOpenCompletedSet={(notice) => {
          setConfirmReplayNotice(false);
          setCompletedSetNotice(notice);
        }}
        onOpenInProgressSet={(notice) => {
          setConfirmRestartInProgress(false);
          setInProgressSetNotice(notice);
        }}
      />

      <RealmDirectoryModal
        isOpen={showAllDirectory}
        onClose={() => setShowAllDirectory(false)}
        realms={realms}
        directoryRealms={directoryRealms}
        activeRealm={activeRealm}
        directoryFilter={directoryFilter}
        filterCounts={filterCounts}
        realmSummaryMap={realmSummaryMap}
        viewProgress={viewProgress}
        isHusband={isHusband}
        motionEnabled={motionEnabled}
        onTapFeedback={onTapFeedback}
        onChangeFilter={setDirectoryFilter}
        onPickRealm={(realmId) => {
          setActiveFilter(directoryFilter);
          handleChooseRealm(realmId);
          setShowAllDirectory(false);
        }}
      />

      <RealmSetStatusModals
        completedSetNotice={completedSetNotice}
        confirmReplayNotice={confirmReplayNotice}
        setConfirmReplayNotice={setConfirmReplayNotice}
        inProgressSetNotice={inProgressSetNotice}
        confirmRestartInProgress={confirmRestartInProgress}
        setConfirmRestartInProgress={setConfirmRestartInProgress}
        emptyPartnerSetNotice={emptyPartnerSetNotice}
        partnerName={progress.partnerSnapshot.partnerName}
        hasNativeNearby={hasNativeNearby}
        motionEnabled={motionEnabled}
        runLocked={runLocked}
        onCloseToLevelSheet={closeSubNoticeToLevelSheet}
        onClearCompletedNotice={() => {
          setCompletedSetNotice(null);
          setConfirmReplayNotice(false);
        }}
        onClearInProgressNotice={() => {
          setInProgressSetNotice(null);
          setConfirmRestartInProgress(false);
        }}
        onClearEmptyPartnerNotice={() => setEmptyPartnerSetNotice(null)}
        onSelectLevel={onSelectLevel}
        onReplayCompletedSet={onReplayCompletedSet}
        onReviewCompletedSet={onReviewCompletedSet}
        onViewSetInLog={onViewSetInLog}
        onOpenSyncModal={onOpenSyncModal}
      />
    </section>
  );
}
