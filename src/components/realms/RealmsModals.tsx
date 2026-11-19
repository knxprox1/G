import React, { useEffect, useState } from 'react';
import { Bluetooth, BookOpen, CheckCircle2, ChevronLeft, Cloud, Play, RotateCcw, X } from 'lucide-react';
import type { GameProgress, GameRealm, QuestionSet } from '../../data/types';
import {
  getNextUnansweredQuestionIndex,
  getRealmProgress,
  getSetProgress,
  toArabicDigits,
  type RealmProgressSummary,
  type SetProgressSummary,
} from '../../game/engine';
import { ArtworkFrame } from '../ArtworkFrame';
import {
  BoldnessTierEmblem,
  CornerRoseFiligree,
  RoseDivider,
  RoseRingProgress,
} from '../RoseFiligree';
import { FilterTabStrip, InlineConfirmBox, RoseModalShell } from '../SharedUI';

export type RealmFilter = 'all' | 'in-progress' | 'completed' | 'new';

export const REALM_FILTER_OPTIONS: { id: RealmFilter; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'in-progress', label: 'قيد التقدم' },
  { id: 'completed', label: 'مكتملة' },
  { id: 'new', label: 'جديدة' },
];

export interface CompletedSetNotice {
  realm: GameRealm;
  set: QuestionSet;
  summary: SetProgressSummary;
}

export interface InProgressSetNotice {
  realm: GameRealm;
  set: QuestionSet;
  summary: SetProgressSummary;
  nextQuestionNumber: number;
}

export interface EmptyPartnerSetNotice {
  realm: GameRealm;
  set: QuestionSet;
}

export function RealmLevelSheetModal({
  isOpen,
  onClose,
  activeRealm,
  viewProgress,
  isHusband,
  updatedSetIds,
  motionEnabled,
  onTapFeedback,
  runLocked,
  onSelectLevel,
  onOpenEmptyPartnerSet,
  onOpenCompletedSet,
  onOpenInProgressSet,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeRealm: GameRealm;
  viewProgress: GameProgress;
  isHusband: boolean;
  updatedSetIds: string[];
  motionEnabled: boolean;
  onTapFeedback?: () => void;
  runLocked: (fn: () => void) => void;
  onSelectLevel: (realmId: string, setId: string) => void;
  onOpenEmptyPartnerSet: (notice: EmptyPartnerSetNotice) => void;
  onOpenCompletedSet: (notice: CompletedSetNotice) => void;
  onOpenInProgressSet: (notice: InProgressSetNotice) => void;
}) {
  return (
    <RoseModalShell
      isOpen={isOpen}
      onClose={onClose}
      presentation="sheet"
      ariaLabelledBy="boldness-sheet-title"
      motionEnabled={motionEnabled}
      accentHex={activeRealm.accentHex}
      insetFrame={false}
      scrollableBody
      cardPaddingClass="p-0"
    >
      <div className="flex-1 min-h-0 max-h-[84dvh] overflow-y-auto ad-no-scrollbar px-4 sm:px-5 pt-3.5 pb-4 flex flex-col gap-2.5">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 shadow-[0_4px_12px_rgba(180,34,106,0.18)] bg-[#FAD3E2]"
              style={{ borderColor: activeRealm.accentHex }}
            >
              <ArtworkFrame
                src={activeRealm.artworkSrc}
                alt={activeRealm.title}
                accentHex={activeRealm.accentHex}
                motif={activeRealm.motif}
                variant="thumb"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#5E364A] flex items-center gap-1.5 truncate">
                <span style={{ color: activeRealm.accentHex }}>{activeRealm.title}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums-ar">العالم {toArabicDigits(activeRealm.order)}</span>
              </p>
              <h3
                id="boldness-sheet-title"
                className="font-display-ar text-xl font-bold text-[#360D21] leading-snug"
              >
                {isHusband ? 'استعرض مستوى الجرأة' : 'اختاري مستوى الجرأة'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة مستويات الجرأة"
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#5E364A] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shrink-0 shadow-sm"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="relative z-10">
          <RoseDivider color={activeRealm.accentHex} />
        </div>

        <div className="relative z-10 grid grid-cols-1 auto-rows-fr gap-2">
          {activeRealm.sets.map((set, idx) => {
            const tierIndex = Math.min(idx, 2) as 0 | 1 | 2;
            const isVelvetTier = tierIndex === 2;
            const isMidTier = tierIndex === 1;
            const summary = getSetProgress(viewProgress, set);

            const tierTone =
              tierIndex === 0
                ? 'بداية ناعمة'
                : tierIndex === 1
                  ? 'صراحة متوازنة'
                  : 'عميقة بلا حواجز';

            const statusLabel = isHusband
              ? summary.status === 'completed'
                ? 'تمت إجابتها'
                : summary.status === 'in-progress'
                  ? `جزئي ${toArabicDigits(summary.answeredQuestions)} من ${toArabicDigits(summary.totalQuestions)}`
                  : 'لم تُجب بعد'
              : summary.status === 'completed'
                ? 'مكتمل'
                : summary.status === 'in-progress'
                  ? `استكمال ${toArabicDigits(summary.answeredQuestions)} من ${toArabicDigits(summary.totalQuestions)}`
                  : 'ابدئي';

            const cardSurfaceClass = isVelvetTier
              ? 'bg-gradient-to-br from-[#470E27] via-[#7E1642] to-[#B51F5B] border border-[#DF5B8E]/65 hover:border-[#FFD1E3] shadow-[0_10px_24px_rgba(71,14,39,0.26)]'
              : isMidTier
                ? 'bg-gradient-to-br from-[#FFD1E3] via-[#FAACC9] to-[#F285B0] border border-[#DE7BA3] hover:border-[#A81853] shadow-[0_8px_20px_rgba(214,40,108,0.18)]'
                : 'bg-gradient-to-br from-white via-[#FFF9FB] to-[#FFEFF5] border border-[#F2C9D8] hover:border-[#D6286C] shadow-[0_4px_14px_rgba(180,34,106,0.05)]';

            return (
              <button
                key={set.id}
                type="button"
                onClick={() => {
                  if (isHusband) {
                    if (summary.answeredQuestions === 0) {
                      onTapFeedback?.();
                      onClose();
                      onOpenEmptyPartnerSet({ realm: activeRealm, set });
                      return;
                    }
                    runLocked(() => {
                      onClose();
                      onSelectLevel(activeRealm.id, set.id);
                    });
                    return;
                  }
                  if (summary.isCompleted) {
                    onTapFeedback?.();
                    onClose();
                    onOpenCompletedSet({ realm: activeRealm, set, summary });
                    return;
                  }
                  if (summary.status === 'in-progress') {
                    onTapFeedback?.();
                    onClose();
                    const nextIdx = getNextUnansweredQuestionIndex(
                      viewProgress.answersBySet[set.id],
                      set
                    );
                    onOpenInProgressSet({
                      realm: activeRealm,
                      set,
                      summary,
                      nextQuestionNumber: nextIdx + 1,
                    });
                    return;
                  }
                  runLocked(() => {
                    onClose();
                    onSelectLevel(activeRealm.id, set.id);
                  });
                }}
                style={motionEnabled ? { animationDelay: `${idx * 35}ms` } : undefined}
                className={`group relative overflow-hidden w-full min-h-[64px] px-3 py-2 ad-cut-tile text-right flex items-center justify-between gap-2.5 active:scale-[0.985] transition-[transform,border-color,box-shadow] duration-150 cursor-pointer ${
                  motionEnabled ? 'ad-anim-content-swap' : ''
                } ${cardSurfaceClass}`}
              >
                {isVelvetTier && (
                  <CornerRoseFiligree
                    position="bottom-left"
                    color="#FFD6E6"
                    className="opacity-20"
                  />
                )}

                <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`w-9 h-9 ad-cut-chip flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                      isVelvetTier
                        ? 'bg-white/14 border border-white/25 text-[#FFE6F0]'
                        : isMidTier
                          ? 'bg-white/82 border border-white/90 text-[#92144A] shadow-xs'
                          : 'bg-[#FCEBF1] border border-[#F4C6D7]'
                    }`}
                    style={!isVelvetTier && !isMidTier ? { color: activeRealm.accentHex } : undefined}
                  >
                    {summary.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <BoldnessTierEmblem tier={tierIndex} className="w-5 h-5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[13.5px] font-bold leading-tight truncate ${
                          isVelvetTier
                            ? 'text-white'
                            : isMidTier
                              ? 'text-[#2B0818]'
                              : 'text-[#360D21]'
                        }`}
                      >
                        {set.title}
                      </span>

                      <span
                        aria-hidden="true"
                        className="inline-flex items-center gap-1 shrink-0"
                      >
                        {[0, 1, 2].map((step) => {
                          const filled = step <= tierIndex;
                          return (
                            <span
                              key={step}
                              className={`w-1.5 h-1.5 rotate-45 rounded-[1px] transition-colors ${
                                isVelvetTier
                                  ? filled
                                    ? 'bg-[#FFE2EE]'
                                    : 'border border-white/40'
                                  : isMidTier
                                    ? filled
                                      ? 'bg-[#8F1147]'
                                      : 'border border-[#8F1147]/45'
                                    : filled
                                      ? ''
                                      : 'border border-[#DDA8BD]'
                              }`}
                              style={
                                !isVelvetTier && !isMidTier && filled
                                  ? { backgroundColor: activeRealm.accentHex }
                                  : undefined
                              }
                            />
                          );
                        })}
                      </span>
                    </div>

                    <p
                      className={`text-[11px] leading-snug mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 tabular-nums-ar ${
                        isVelvetTier
                          ? 'text-[#FFDCE9]'
                          : isMidTier
                            ? 'text-[#4B142E]'
                            : 'text-[#5E364A]'
                      }`}
                    >
                      <span className="shrink-0">{tierTone}</span>
                      <span aria-hidden="true" className="shrink-0">·</span>
                      <span className="shrink-0">{toArabicDigits(set.questions.length)} أسئلة</span>
                      <span aria-hidden="true" className="shrink-0">·</span>
                      <span
                        className={
                          isHusband && updatedSetIds.includes(set.id)
                            ? isVelvetTier
                              ? 'text-[#FFE2B8] font-bold'
                              : 'text-[#B41957] font-bold'
                            : undefined
                        }
                      >
                        {isHusband && updatedSetIds.includes(set.id)
                          ? `تحديث جديد · ${statusLabel}`
                          : statusLabel}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-1 shrink-0">
                  <span
                    className={`text-xs font-bold tabular-nums-ar ${
                      isVelvetTier
                        ? 'text-white'
                        : isMidTier
                          ? 'text-[#7A0E3D]'
                          : ''
                    }`}
                    style={!isVelvetTier && !isMidTier ? { color: activeRealm.accentHex } : undefined}
                  >
                    {toArabicDigits(summary.percent)}٪
                  </span>
                  <ChevronLeft
                    className={`w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5 ${
                      isVelvetTier
                        ? 'text-[#FFE6F0]'
                        : isMidTier
                          ? 'text-[#610D32]'
                          : 'text-[#7B3556]'
                    }`}
                    aria-hidden="true"
                  />
                </div>

                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-[2.5px] ${
                    isVelvetTier
                      ? 'bg-white/15'
                      : isMidTier
                        ? 'bg-white/35'
                        : 'bg-[#F5D2E0]/75'
                  }`}
                >
                  <div
                    className="h-full transition-[width] duration-500"
                    style={{
                      width: `${summary.percent}%`,
                      backgroundColor: isVelvetTier
                        ? '#FFE2EE'
                        : isMidTier
                          ? '#8F1147'
                          : activeRealm.accentHex,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </RoseModalShell>
  );
}

export function RealmDirectoryModal({
  isOpen,
  onClose,
  realms,
  directoryRealms,
  activeRealm,
  directoryFilter,
  filterCounts,
  realmSummaryMap,
  viewProgress,
  isHusband,
  motionEnabled,
  onTapFeedback,
  onChangeFilter,
  onPickRealm,
}: {
  isOpen: boolean;
  onClose: () => void;
  realms: GameRealm[];
  directoryRealms: GameRealm[];
  activeRealm: GameRealm;
  directoryFilter: RealmFilter;
  filterCounts: Record<RealmFilter, number>;
  realmSummaryMap: Map<string, RealmProgressSummary>;
  viewProgress: GameProgress;
  isHusband: boolean;
  motionEnabled: boolean;
  onTapFeedback?: () => void;
  onChangeFilter: (filter: RealmFilter) => void;
  onPickRealm: (realmId: string) => void;
}) {
  return (
    <RoseModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="دليل العوالم الكامل"
      motionEnabled={motionEnabled}
      accentHex={activeRealm.accentHex}
      insetFrame={false}
      scrollableBody
      cardPaddingClass="p-0"
    >
      <div className="flex-1 min-h-0 max-h-[82dvh] p-4 flex flex-col gap-3 overflow-hidden">
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display-ar text-xl font-bold text-[#360D21]">
              جميع العوالم ({toArabicDigits(realms.length)})
            </h3>
            <p className="text-[11px] text-[#5E364A]">
              {isHusband ? 'اختر أي عالم للانتقال إليه مباشرة' : 'اختاري أي عالم للانتقال إليه مباشرة'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق دليل العوالم"
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#5E364A] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shrink-0 shadow-sm"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <FilterTabStrip
          keyPrefix="dir-filter"
          ariaLabel="تصفية دليل العوالم"
          tabs={REALM_FILTER_OPTIONS.map((filter) => ({
            id: filter.id,
            label: filter.label,
            count: filterCounts[filter.id],
          }))}
          activeId={directoryFilter}
          onChange={(id) => {
            onTapFeedback?.();
            onChangeFilter(id);
          }}
          className="shrink-0"
        />

        <div className="relative flex-1 min-h-0 flex flex-col">
          {directoryRealms.length === 0 ? (
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center gap-2.5 py-6 px-3">
              <p className="text-xs font-bold text-[#360D21]">
                لا توجد عوالم ضمن هذا التصنيف حالياً
              </p>
              <button
                type="button"
                onClick={() => {
                  onTapFeedback?.();
                  onChangeFilter('all');
                }}
                className="min-h-[44px] px-3.5 ad-cut-chip bg-[#FCEEF3] text-[#8E184B] text-xs font-bold cursor-pointer hover:bg-[#FADCE7] active:scale-[0.97] transition-[background-color,transform] duration-150"
              >
                عرض جميع العوالم
              </button>
            </div>
          ) : (
            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto ad-no-scrollbar grid grid-cols-2 gap-2 py-0.5 pb-5">
              {directoryRealms.map((realm) => {
                const summary = realmSummaryMap.get(realm.id) ?? getRealmProgress(viewProgress, realm);
                const isSelected = realm.id === activeRealm.id;
                return (
                  <button
                    key={realm.id}
                    type="button"
                    onClick={() => onPickRealm(realm.id)}
                    style={
                      isSelected
                        ? { borderColor: realm.accentHex, backgroundColor: '#FFF0F6' }
                        : undefined
                    }
                    className={`relative min-h-[60px] p-2.5 ad-cut-tile border text-right flex flex-col justify-between gap-1 active:scale-[0.98] transition-[transform,border-color,background-color] duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-2 shadow-sm'
                        : 'bg-white/95 border-[#EFCBD7] hover:border-[#D6286C]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold tabular-nums-ar">
                      <span style={{ color: realm.accentHex }}>
                        العالم {toArabicDigits(realm.order)}
                      </span>
                      {summary.isRealmCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: realm.accentHex }} aria-hidden="true" />
                      ) : (
                        <span className="text-[#5E364A]">{toArabicDigits(summary.percent)}٪</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#360D21] leading-snug line-clamp-1">
                      {realm.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-6 bg-gradient-to-t from-[#FFE8F1] to-transparent"
          />
        </div>
      </div>
    </RoseModalShell>
  );
}

export function RealmSetStatusModals({
  completedSetNotice,
  confirmReplayNotice,
  setConfirmReplayNotice,
  inProgressSetNotice,
  confirmRestartInProgress,
  setConfirmRestartInProgress,
  emptyPartnerSetNotice,
  partnerName,
  hasNativeNearby,
  motionEnabled,
  runLocked,
  onCloseToLevelSheet,
  onClearCompletedNotice,
  onClearInProgressNotice,
  onClearEmptyPartnerNotice,
  onSelectLevel,
  onReplayCompletedSet,
  onReviewCompletedSet,
  onViewSetInLog,
  onOpenSyncModal,
}: {
  completedSetNotice: CompletedSetNotice | null;
  confirmReplayNotice: boolean;
  setConfirmReplayNotice: (val: boolean) => void;
  inProgressSetNotice: InProgressSetNotice | null;
  confirmRestartInProgress: boolean;
  setConfirmRestartInProgress: (val: boolean) => void;
  emptyPartnerSetNotice: EmptyPartnerSetNotice | null;
  partnerName: string;
  hasNativeNearby: boolean;
  motionEnabled: boolean;
  runLocked: (fn: () => void) => void;
  onCloseToLevelSheet: () => void;
  onClearCompletedNotice: () => void;
  onClearInProgressNotice: () => void;
  onClearEmptyPartnerNotice: () => void;
  onSelectLevel: (realmId: string, setId: string) => void;
  onReplayCompletedSet?: (realmId: string, setId: string) => void;
  onReviewCompletedSet?: (realmId: string, setId: string) => void;
  onViewSetInLog?: (realmId: string, setId: string) => void;
  onOpenSyncModal?: () => void;
}) {
  const [cachedCompleted, setCachedCompleted] = useState<CompletedSetNotice | null>(completedSetNotice);
  const [cachedInProgress, setCachedInProgress] = useState<InProgressSetNotice | null>(inProgressSetNotice);
  const [cachedEmptyPartner, setCachedEmptyPartner] = useState<EmptyPartnerSetNotice | null>(emptyPartnerSetNotice);

  useEffect(() => {
    if (completedSetNotice) setCachedCompleted(completedSetNotice);
  }, [completedSetNotice]);

  useEffect(() => {
    if (inProgressSetNotice) setCachedInProgress(inProgressSetNotice);
  }, [inProgressSetNotice]);

  useEffect(() => {
    if (emptyPartnerSetNotice) setCachedEmptyPartner(emptyPartnerSetNotice);
  }, [emptyPartnerSetNotice]);

  const activeCompleted = completedSetNotice ?? cachedCompleted;
  const activeInProgress = inProgressSetNotice ?? cachedInProgress;
  const activeEmptyPartner = emptyPartnerSetNotice ?? cachedEmptyPartner;

  return (
    <>
      {activeCompleted && (
        <RoseModalShell
          isOpen={Boolean(completedSetNotice)}
          onClose={onCloseToLevelSheet}
          ariaLabelledBy="completed-level-notice-title"
          maxWidthClass="max-w-[346px]"
          motionEnabled={motionEnabled}
          accentHex={activeCompleted.realm.accentHex}
          insetFrame
          cardPaddingClass="px-5 py-5"
        >
          <div className="relative flex flex-col items-center text-center gap-3">
            <button
              type="button"
              onClick={onCloseToLevelSheet}
              aria-label="العودة لمستويات الجرأة"
              className="absolute top-0 left-0 z-20 min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#5E364A] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shadow-sm"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="w-14 h-14 rounded-full border border-dashed border-[#E6A4BC] bg-white/80 flex items-center justify-center mt-1">
              <div
                className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-md"
                style={{ backgroundColor: activeCompleted.realm.accentHex }}
              >
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] font-semibold text-[#5E364A] flex items-center gap-1.5">
                <span style={{ color: activeCompleted.realm.accentHex }}>
                  {activeCompleted.realm.title}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeCompleted.set.title}</span>
              </p>
              <h3
                id="completed-level-notice-title"
                className="font-display-ar text-xl sm:text-2xl font-bold text-[#360D21] leading-snug"
              >
                هذا المستوى مكتمل بالفعل
              </h3>
            </div>

            <div className="w-28">
              <RoseDivider color={activeCompleted.realm.accentHex} />
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="text-xs sm:text-[13px] text-[#5E364A] leading-relaxed max-w-[30ch] tabular-nums-ar">
                تمت الإجابة على جميع أسئلة هذا المستوى وحفظ اختياراتكِ في السجل.
              </p>
              <p className="text-[11px] font-semibold text-[#5E364A] tabular-nums-ar">
                {toArabicDigits(activeCompleted.summary.answeredQuestions)} من{' '}
                {toArabicDigits(activeCompleted.summary.totalQuestions)} أسئلة ·{' '}
                {toArabicDigits(activeCompleted.summary.totalSelectionsCount)} اختيارات محفوظة
              </p>
            </div>

            {confirmReplayNotice ? (
              <InlineConfirmBox
                variant="primary"
                accentColor={activeCompleted.realm.accentHex}
                className="w-full"
                message={
                  <>
                    سيتم مسح إجابات «{activeCompleted.set.title}» السابقة للبدء من السؤال الأول. هل تريدين المتابعة؟
                  </>
                }
                confirmLabel="تأكيد الإعادة"
                cancelLabel="تراجع"
                onConfirm={() => {
                  const target = activeCompleted;
                  runLocked(() => {
                    onClearCompletedNotice();
                    onReplayCompletedSet?.(target.realm.id, target.set.id);
                  });
                }}
                onCancel={() => setConfirmReplayNotice(false)}
              />
            ) : (
              <div className="w-full pt-1 flex flex-col gap-2">
                {onReviewCompletedSet && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeCompleted;
                      runLocked(() => {
                        onClearCompletedNotice();
                        onReviewCompletedSet(target.realm.id, target.set.id);
                      });
                    }}
                    style={{ backgroundColor: activeCompleted.realm.accentHex }}
                    className="w-full min-h-[46px] px-4 ad-cut-tile text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:brightness-95 active:scale-[0.985] transition-[transform,filter,box-shadow] duration-150 shadow-[0_10px_24px_rgba(214,40,108,0.26)]"
                  >
                    <Play className="w-4 h-4 shrink-0 fill-current" aria-hidden="true" />
                    <span>مراجعة البطاقات والقصاصات</span>
                  </button>
                )}

                {onViewSetInLog && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeCompleted;
                      runLocked(() => {
                        onClearCompletedNotice();
                        onViewSetInLog(target.realm.id, target.set.id);
                      });
                    }}
                    style={!onReviewCompletedSet ? { backgroundColor: activeCompleted.realm.accentHex } : undefined}
                    className={
                      onReviewCompletedSet
                        ? 'w-full min-h-[44px] px-4 ad-cut-tile bg-white/95 border border-[#EECCDA] text-[#360D21] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150'
                        : 'w-full min-h-[46px] px-4 ad-cut-tile text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:brightness-95 active:scale-[0.985] transition-[transform,filter,box-shadow] duration-150 shadow-[0_10px_24px_rgba(214,40,108,0.26)]'
                    }
                  >
                    <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>عرض الإجابات في السجل</span>
                  </button>
                )}

                {onReplayCompletedSet && (
                  <button
                    type="button"
                    onClick={() => setConfirmReplayNotice(true)}
                    className="w-full min-h-[44px] px-4 ad-cut-tile bg-[#FCEEF3] border border-[#F1AFC8] text-[#8E184B] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-[#FADCE7] active:scale-[0.98] transition-[background-color,transform] duration-150"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>إعادة لعب المستوى من جديد</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onCloseToLevelSheet}
                  className="w-full min-h-[44px] px-4 ad-cut-tile bg-white/95 border border-[#EFCBD7] text-[#5E364A] text-xs font-semibold cursor-pointer hover:text-[#360D21] hover:border-[#D6286C]/60 active:scale-[0.98] transition-[color,border-color,transform] duration-150"
                >
                  اختيار مستوى آخر
                </button>
              </div>
            )}
          </div>
        </RoseModalShell>
      )}

      {activeInProgress && (
        <RoseModalShell
          isOpen={Boolean(inProgressSetNotice)}
          onClose={onCloseToLevelSheet}
          ariaLabelledBy="inprogress-level-notice-title"
          maxWidthClass="max-w-[346px]"
          motionEnabled={motionEnabled}
          accentHex={activeInProgress.realm.accentHex}
          insetFrame
          cardPaddingClass="px-5 py-5"
        >
          <div className="relative flex flex-col items-center text-center gap-3">
            <button
              type="button"
              onClick={onCloseToLevelSheet}
              aria-label="العودة لمستويات الجرأة"
              className="absolute top-0 left-0 z-20 min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#5E364A] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shadow-sm"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="mt-1">
              <RoseRingProgress
                percent={activeInProgress.summary.percent}
                size={58}
                strokeWidth={4.5}
                accentHex={activeInProgress.realm.accentHex}
                label={`${toArabicDigits(activeInProgress.summary.percent)}٪`}
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] font-semibold text-[#5E364A] flex items-center gap-1.5">
                <span style={{ color: activeInProgress.realm.accentHex }}>
                  {activeInProgress.realm.title}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeInProgress.set.title}</span>
              </p>
              <h3
                id="inprogress-level-notice-title"
                className="font-display-ar text-xl sm:text-2xl font-bold text-[#360D21] leading-snug"
              >
                لديكِ تقدّم محفوظ في هذا المستوى
              </h3>
            </div>

            <div className="w-28">
              <RoseDivider color={activeInProgress.realm.accentHex} />
            </div>

            <div className="w-full flex flex-col items-center gap-1.5">
              <p className="text-xs sm:text-[13px] text-[#5E364A] leading-relaxed max-w-[30ch] tabular-nums-ar">
                أجبتِ على {toArabicDigits(activeInProgress.summary.answeredQuestions)} من{' '}
                {toArabicDigits(activeInProgress.summary.totalQuestions)} أسئلة. هل تفضلين
                الاستمرار أم البدء من جديد؟
              </p>
              <div className="w-full max-w-[240px] h-1.5 rounded-full bg-[#FAD0E0] overflow-hidden mt-0.5">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${activeInProgress.summary.percent}%`,
                    backgroundColor: activeInProgress.realm.accentHex,
                  }}
                />
              </div>
            </div>

            {confirmRestartInProgress ? (
              <InlineConfirmBox
                variant="primary"
                accentColor={activeInProgress.realm.accentHex}
                className="w-full"
                message={
                  <>
                    سيتم مسح الإجابات السابقة في «{activeInProgress.set.title}» والبدء من السؤال الأول. هل تريدين المتابعة؟
                  </>
                }
                confirmLabel="تأكيد البدء من جديد"
                cancelLabel="تراجع"
                onConfirm={() => {
                  const target = activeInProgress;
                  runLocked(() => {
                    onClearInProgressNotice();
                    onReplayCompletedSet?.(target.realm.id, target.set.id);
                  });
                }}
                onCancel={() => setConfirmRestartInProgress(false)}
              />
            ) : (
              <div className="w-full pt-1 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = activeInProgress;
                    runLocked(() => {
                      onClearInProgressNotice();
                      onSelectLevel(target.realm.id, target.set.id);
                    });
                  }}
                  style={{ backgroundColor: activeInProgress.realm.accentHex }}
                  className="ad-shimmer-btn w-full min-h-[46px] px-4 ad-cut-tile text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:brightness-95 active:scale-[0.985] transition-[transform,filter,box-shadow] duration-150 shadow-[0_10px_24px_rgba(214,40,108,0.26)] tabular-nums-ar"
                >
                  <Play className="w-3.5 h-3.5 shrink-0 fill-current" aria-hidden="true" />
                  <span>
                    الاستمرار من السؤال {toArabicDigits(activeInProgress.nextQuestionNumber)}
                  </span>
                </button>

                {onReplayCompletedSet && (
                  <button
                    type="button"
                    onClick={() => setConfirmRestartInProgress(true)}
                    className="w-full min-h-[44px] px-4 ad-cut-tile bg-[#FCEEF3] border border-[#F1AFC8] text-[#8E184B] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-[#FADCE7] active:scale-[0.98] transition-[background-color,transform] duration-150"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>البدء من جديد</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onCloseToLevelSheet}
                  className="w-full min-h-[44px] px-4 ad-cut-tile bg-white/95 border border-[#EFCBD7] text-[#5E364A] text-xs font-semibold cursor-pointer hover:text-[#360D21] hover:border-[#D6286C]/60 active:scale-[0.98] transition-[color,border-color,transform] duration-150"
                >
                  اختيار مستوى آخر
                </button>
              </div>
            )}
          </div>
        </RoseModalShell>
      )}

      {activeEmptyPartner && (
        <RoseModalShell
          isOpen={Boolean(emptyPartnerSetNotice)}
          onClose={onCloseToLevelSheet}
          ariaLabelledBy="empty-partner-set-title"
          maxWidthClass="max-w-[346px]"
          motionEnabled={motionEnabled}
          accentHex={activeEmptyPartner.realm.accentHex}
          insetFrame
          cardPaddingClass="px-5 py-5"
        >
          <div className="relative flex flex-col items-center text-center gap-3">
            <button
              type="button"
              onClick={onCloseToLevelSheet}
              aria-label="العودة لمستويات الجرأة"
              className="absolute top-0 left-0 z-20 min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#5E364A] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shadow-sm"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#FCEEF3] border border-[#F1AFC8] flex items-center justify-center text-[#D6286C] mt-1">
              {hasNativeNearby ? (
                <Bluetooth className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Cloud className="w-5 h-5" aria-hidden="true" />
              )}
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] font-semibold text-[#5E364A] flex items-center gap-1.5">
                <span style={{ color: activeEmptyPartner.realm.accentHex }}>
                  {activeEmptyPartner.realm.title}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeEmptyPartner.set.title}</span>
              </p>
              <h3
                id="empty-partner-set-title"
                className="font-display-ar text-xl font-bold text-[#360D21] leading-snug"
              >
                لا توجد إجابات متزامنة بعد
              </h3>
            </div>

            <div className="w-28">
              <RoseDivider color={activeEmptyPartner.realm.accentHex} />
            </div>

            <p className="text-xs sm:text-[13px] text-[#5E364A] leading-relaxed max-w-[30ch]">
              لم تُسجَّل إجابات من {partnerName} في «{activeEmptyPartner.set.title}» حتى الآن.
            </p>

            <div className="w-full pt-1 flex flex-col gap-2">
              {onOpenSyncModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClearEmptyPartnerNotice();
                    onOpenSyncModal();
                  }}
                  style={{ backgroundColor: activeEmptyPartner.realm.accentHex }}
                  className="w-full min-h-[46px] px-4 ad-cut-tile text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:brightness-95 active:scale-[0.985] transition-[transform,filter] duration-150 shadow-[0_10px_24px_rgba(214,40,108,0.26)]"
                >
                  {hasNativeNearby ? (
                    <Bluetooth className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Cloud className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>إدارة المزامنة مع الشريكة</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const target = activeEmptyPartner;
                  runLocked(() => {
                    onClearEmptyPartnerNotice();
                    onSelectLevel(target.realm.id, target.set.id);
                  });
                }}
                className="w-full min-h-[44px] px-4 ad-cut-tile bg-white/95 border border-[#EECCDA] text-[#360D21] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150"
              >
                <BookOpen className="w-4 h-4 shrink-0 text-[#D6286C]" aria-hidden="true" />
                <span>استعراض الأسئلة على أي حال</span>
              </button>

              <button
                type="button"
                onClick={onCloseToLevelSheet}
                className="w-full min-h-[44px] px-4 ad-cut-tile bg-[#FCEEF3] border border-[#F1AFC8] text-[#7B1E48] text-xs font-semibold cursor-pointer hover:bg-[#FADCE7] active:scale-[0.98] transition-[background-color,transform] duration-150"
              >
                العودة لمستويات الجرأة
              </button>
            </div>
          </div>
        </RoseModalShell>
      )}
    </>
  );
}
