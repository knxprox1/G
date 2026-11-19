import React, { useEffect, useState } from 'react';
import { RotateCcw, Compass, ChevronLeft, Award, BookOpen } from 'lucide-react';
import type { DeviceRole, GameRealm, QuestionSet, ScreenId } from '../data/types';
import type { RealmProgressSummary, SetProgressSummary } from '../game/engine';
import { toArabicDigits } from '../game/engine';
import { useBackOverlay } from '../utils/backNavigation';
import { useActionLock } from '../utils/useActionLock';
import { CornerRoseFiligree, RoseDivider, RoseStarOrnament } from './RoseFiligree';
import { InlineConfirmBox } from './SharedUI';

interface CompletionScreenProps {
  realm: GameRealm;
  set: QuestionSet;
  setSummary: SetProgressSummary;
  realmSummary: RealmProgressSummary;
  nextSetInRealm: QuestionSet | null;
  nextIncompleteRealm?: GameRealm | null;
  role?: DeviceRole;
  partnerName?: string;
  readOnlyReview?: boolean;
  returnScreen?: ScreenId;
  onReplaySet: () => void;
  onViewInLog: () => void;
  onStartNextSet: (setId: string) => void;
  onStartNextRealm?: (realmId: string) => void;
  onBackToRealms: () => void;
  onBackToOrigin?: () => void;
  motionEnabled: boolean;
  transitionClassName?: string;
}

export function CompletionScreen({
  realm,
  set,
  setSummary,
  realmSummary,
  nextSetInRealm,
  nextIncompleteRealm,
  role = 'wife',
  partnerName = 'الشريكة',
  readOnlyReview = false,
  returnScreen = 'realms',
  onReplaySet,
  onViewInLog,
  onStartNextSet,
  onStartNextRealm,
  onBackToRealms,
  onBackToOrigin,
  motionEnabled,
  transitionClassName = 'ad-anim-screen-curtain',
}: CompletionScreenProps) {
  const [confirmReplay, setConfirmReplay] = useState(false);
  const { runLocked: triggerOnce } = useActionLock(500);
  const isHusband = role === 'husband';
  const displayPartner = partnerName.trim() || 'الشريكة';
  const handleBackToOrigin = onBackToOrigin ?? onBackToRealms;

  useBackOverlay(confirmReplay, 'completion-confirm-replay', () => setConfirmReplay(false));

  useEffect(() => {
    if (!confirmReplay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setConfirmReplay(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmReplay]);
  const originBackLabel =
    returnScreen === 'home'
      ? 'العودة إلى الرئيسية'
      : returnScreen === 'log'
        ? 'العودة إلى السجل'
        : 'العودة إلى العوالم';

  const statusHeading = isHusband
    ? realmSummary.isRealmCompleted
      ? 'تغطية العالم مكتملة'
      : 'نهاية عرض المستوى'
    : realmSummary.isRealmCompleted
      ? 'تم إتمام العالم بالكامل'
      : readOnlyReview
        ? 'مراجعة المستوى المكتمل'
        : 'اكتمل المستوى';

  const mainTitle = isHusband
    ? realmSummary.isRealmCompleted
      ? `اكتمل استعراض جميع مستويات ${realm.title}`
      : `نهاية استعراض «${set.title}»`
    : realmSummary.isRealmCompleted
      ? `أنهيتِ جميع مستويات ${realm.title}`
      : `أتممتِ مستوى «${set.title}»`;

  const descriptionText = isHusband
    ? setSummary.isCompleted
      ? `استعرضتَ جميع اختيارات ${displayPartner} المحفوظة في هذا المستوى. يمكنك الانتقال للمستوى التالي أو الرجوع إلى السجل.`
      : `بلغتَ نهاية أسئلة «${set.title}». ما يزال يتبقّى بعض الأسئلة بانتظار مزامنة إجاباتها من جهاز ${displayPartner}.`
    : readOnlyReview
      ? 'هذه خلاصة اختياراتكِ المعتمدة في السجل لهذا المستوى. يمكنكِ مراجعة التفاصيل في السجل أو إعادة المستوى متى شئتِ.'
      : 'تم حفظ جميع اختياراتكِ في السجل بنجاح. يمكنكِ الانتقال للمرحلة التالية أو استعراض إجاباتكِ.';

  return (
    <section
      className={`flex-1 min-h-0 flex flex-col justify-between px-5 pt-safe pb-safe gap-2 overflow-hidden ${
        motionEnabled ? transitionClassName : ''
      }`}
      aria-label={isHusband ? 'ملخص استعراض المستوى' : 'إتمام المستوى'}
    >
      <header className="shrink-0 flex items-center justify-start text-xs text-[#5E364A] min-h-[44px] pr-1 pl-badge-safe">
        <span className="font-medium truncate">{realm.title}</span>
        <span className="mx-2 shrink-0 flex items-center" aria-hidden="true">
          <RoseStarOrnament color={realm.accentHex} className="w-2.5 h-2.5" />
        </span>
        <span className="font-semibold text-[#360D21] shrink-0">{set.title}</span>
      </header>

      {/* Layered Keepsake Celebration Card */}
      <div className="relative flex-1 min-h-0 my-2 flex flex-col justify-center">
        <div
          aria-hidden="true"
          className="absolute inset-x-3 top-2 bottom-2 ad-cut-card bg-[#F9C6D9] -rotate-1"
        />

        <div
          className={`relative z-10 flex-1 min-h-0 ad-cut-card bg-gradient-to-b from-[#FFFEFD] via-[#FFF9FB] to-[#FFECF3] border border-[#EBA8C3] p-4 sm:p-6 flex flex-col items-center justify-between text-center shadow-[0_24px_56px_rgba(180,34,106,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden ${
            motionEnabled ? 'ad-anim-completion-bloom' : ''
          }`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-32"
            style={{
              background: `radial-gradient(ellipse 75% 85% at 50% 0%, ${realm.accentHex}1F 0%, transparent 72%)`,
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2.5 ad-cut-tile border border-[#E89EBC]/40"
          />
          {motionEnabled && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-l from-transparent via-white/70 to-transparent ad-anim-qissasa-shimmer z-10"
            />
          )}

          <CornerRoseFiligree position="top-right" color={realm.accentHex} insetFrame className="opacity-35" />
          <CornerRoseFiligree position="bottom-left" color={realm.accentHex} insetFrame className="opacity-35" />
          <div className="relative z-10 w-full flex items-center justify-between text-xs text-[#5E364A] shrink-0">
            <span className="font-semibold" style={{ color: realm.accentHex }}>
              {statusHeading}
            </span>
            <span className="font-display-ar font-bold tabular-nums-ar">مستوى الجرأة {set.indexLabel}</span>
          </div>

          <div className="relative z-10 flex-1 min-h-0 w-full overflow-y-auto ad-no-scrollbar flex flex-col items-center justify-center text-center py-1">
            <div className="relative w-18 h-18 sm:w-22 sm:h-22 flex items-center justify-center mb-3">
              {motionEnabled && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-2 rounded-full ad-seal-aura"
                  style={{
                    background: `radial-gradient(circle, ${realm.accentHex}2E 0%, transparent 72%)`,
                  }}
                />
              )}
              <div
                className={`relative w-18 h-18 sm:w-22 sm:h-22 rounded-full border border-dashed border-[#E4B29D] bg-white/80 flex items-center justify-center ${
                  motionEnabled ? 'ad-anim-completion-crest' : ''
                }`}
              >
                <div
                  className="w-13 h-13 sm:w-15 sm:h-15 rounded-full text-white flex items-center justify-center shadow-md"
                  style={{ backgroundColor: realm.accentHex }}
                >
                  <Award className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
                </div>
              </div>
            </div>

            <h1 className="font-display-ar text-2xl sm:text-3xl font-bold text-[#360D21] text-balance leading-snug">
              {mainTitle}
            </h1>

            <div className="w-36 my-2.5">
              <RoseDivider color={realm.accentHex} />
            </div>

            <p className="text-xs sm:text-sm text-[#5E364A] max-w-[30ch] leading-relaxed">
              {descriptionText}
            </p>

            {/* Compact Realm Completion Bar */}
            <div className="w-full max-w-[230px] mt-3.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5E364A]">
                <span>{realm.title}</span>
                <span className="tabular-nums-ar font-bold" style={{ color: realm.accentHex }}>
                  {toArabicDigits(realmSummary.completedSets)} من {toArabicDigits(realmSummary.totalSets)} مستويات
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#FAD0E0] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${realmSummary.percent}%`, backgroundColor: realm.accentHex }}
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 shrink-0 w-full grid grid-cols-3 gap-2 border-t border-[#F4D9E3] pt-3.5 sm:pt-4">
            <div className="flex flex-col items-center gap-1">
              <span className="font-display-ar text-lg sm:text-xl font-bold text-[#360D21] tabular-nums-ar whitespace-nowrap">
                {toArabicDigits(setSummary.answeredQuestions)} من {toArabicDigits(setSummary.totalQuestions)}
              </span>
              <span className="text-[11px] text-[#5E364A]">
                {isHusband ? `إجابات ${displayPartner}` : 'الأسئلة المجابة'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1 border-x border-[#F4D9E3]">
              <span
                className="font-display-ar text-lg sm:text-xl font-bold tabular-nums-ar whitespace-nowrap"
                style={{ color: realm.accentHex }}
              >
                {toArabicDigits(setSummary.totalSelectionsCount)}
              </span>
              <span className="text-[11px] text-[#5E364A]">
                {isHusband ? 'إجمالي اختياراتها' : 'إجمالي الخيارات'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="font-display-ar text-lg sm:text-xl font-bold text-[#360D21] tabular-nums-ar whitespace-nowrap">
                {toArabicDigits(realmSummary.percent)}٪
              </span>
              <span className="text-[11px] text-[#5E364A]">
                {isHusband ? 'تغطية العالم' : 'تقدم العالم'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <footer className="shrink-0 flex flex-col gap-2 pt-1 pb-1">
        {!isHusband && confirmReplay ? (
          <InlineConfirmBox
            variant="destructive"
            message="هل تريدين مسح إجابات هذا المستوى وإعادته من البداية؟"
            confirmLabel="تأكيد الإعادة"
            cancelLabel="تراجع"
            onConfirm={() =>
              triggerOnce(() => {
                setConfirmReplay(false);
                onReplaySet();
              })
            }
            onCancel={() => setConfirmReplay(false)}
          />
        ) : nextSetInRealm ? (
          <>
            <button
              type="button"
              onClick={() => triggerOnce(() => onStartNextSet(nextSetInRealm.id))}
              style={{ backgroundColor: realm.accentHex }}
              className="ad-shimmer-btn w-full min-h-[48px] ad-cut-tile text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-[transform,filter,box-shadow] duration-150 cursor-pointer shadow-[0_12px_26px_rgba(214,40,108,0.3)] hover:brightness-95"
            >
              <span>المستوى التالي: {nextSetInRealm.title}</span>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>

            {isHusband ? (
              <button
                type="button"
                onClick={() => triggerOnce(onViewInLog)}
                className="w-full min-h-[44px] px-3 ad-cut-tile bg-white border border-[#EECCDA] text-[#360D21] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: realm.accentHex }} aria-hidden="true" />
                <span>عرض في السجل</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => triggerOnce(onViewInLog)}
                  className="min-h-[44px] px-3 ad-cut-tile bg-white border border-[#EECCDA] text-[#360D21] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: realm.accentHex }} aria-hidden="true" />
                  <span>عرض في السجل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmReplay(true)}
                  className="min-h-[44px] px-3 ad-cut-tile bg-white border border-[#EECCDA] text-[#360D21] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" style={{ color: realm.accentHex }} aria-hidden="true" />
                  <span>إعادة المستوى</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => triggerOnce(handleBackToOrigin)}
              className="w-full min-h-[44px] ad-cut-chip text-xs font-bold text-[#5E364A] hover:text-[#D6286C] hover:bg-white/60 active:scale-[0.98] flex items-center justify-center gap-1.5 transition-[background-color,color,transform] duration-150 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" style={{ color: realm.accentHex }} aria-hidden="true" />
              <span>{originBackLabel}</span>
            </button>
          </>
        ) : nextIncompleteRealm && onStartNextRealm ? (
          <>
            <button
              type="button"
              onClick={() => triggerOnce(() => onStartNextRealm(nextIncompleteRealm.id))}
              style={{ backgroundColor: realm.accentHex }}
              className="ad-shimmer-btn w-full min-h-[48px] ad-cut-tile text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-[transform,filter,box-shadow] duration-150 cursor-pointer shadow-[0_12px_26px_rgba(214,40,108,0.3)] hover:brightness-95"
            >
              <span className="truncate">التالي: {nextIncompleteRealm.title}</span>
              <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>

            {isHusband ? (
              <button
                type="button"
                onClick={() => triggerOnce(onViewInLog)}
                className="w-full min-h-[44px] px-3 ad-cut-tile bg-white border border-[#EECCDA] text-[#360D21] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: realm.accentHex }} aria-hidden="true" />
                <span>عرض في السجل</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => triggerOnce(onViewInLog)}
                  className="min-h-[44px] px-3 ad-cut-tile bg-white border border-[#EECCDA] text-[#360D21] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: realm.accentHex }} aria-hidden="true" />
                  <span>عرض في السجل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmReplay(true)}
                  className="min-h-[44px] px-3 ad-cut-tile bg-white border border-[#EECCDA] text-[#360D21] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" style={{ color: realm.accentHex }} aria-hidden="true" />
                  <span>إعادة المستوى</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => triggerOnce(handleBackToOrigin)}
              className="w-full min-h-[44px] ad-cut-chip text-xs font-bold text-[#5E364A] hover:text-[#D6286C] hover:bg-white/60 active:scale-[0.98] flex items-center justify-center gap-1.5 transition-[background-color,color,transform] duration-150 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" style={{ color: realm.accentHex }} aria-hidden="true" />
              <span>{returnScreen === 'realms' ? 'استكشاف جميع العوالم' : originBackLabel}</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                triggerOnce(returnScreen === 'realms' ? onBackToRealms : handleBackToOrigin)
              }
              style={{ backgroundColor: realm.accentHex }}
              className="ad-shimmer-btn w-full min-h-[50px] ad-cut-tile text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-[transform,filter,box-shadow] duration-150 cursor-pointer shadow-[0_12px_26px_rgba(214,40,108,0.3)] hover:brightness-95"
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              <span>{returnScreen === 'realms' ? 'استكشاف جميع العوالم' : originBackLabel}</span>
            </button>

            {isHusband ? (
              <button
                type="button"
                onClick={() => triggerOnce(onViewInLog)}
                className="w-full min-h-[44px] ad-cut-tile bg-white border border-[#EECCDA] text-[#360D21] text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" style={{ color: realm.accentHex }} aria-hidden="true" />
                <span>عرض في السجل</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => triggerOnce(onViewInLog)}
                  className="min-h-[44px] ad-cut-tile bg-white border border-[#EECCDA] text-[#360D21] text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" style={{ color: realm.accentHex }} aria-hidden="true" />
                  <span>عرض في السجل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmReplay(true)}
                  className="min-h-[44px] ad-cut-tile bg-white border border-[#EECCDA] text-[#360D21] text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#D6286C] active:scale-[0.98] transition-[border-color,transform] duration-150 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" style={{ color: realm.accentHex }} aria-hidden="true" />
                  <span>إعادة المستوى</span>
                </button>
              </div>
            )}

            {returnScreen !== 'realms' && (
              <button
                type="button"
                onClick={() => triggerOnce(onBackToRealms)}
                className="w-full min-h-[44px] ad-cut-chip text-xs font-bold text-[#5E364A] hover:text-[#D6286C] hover:bg-white/60 active:scale-[0.98] flex items-center justify-center gap-1.5 transition-[background-color,color,transform] duration-150 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" style={{ color: realm.accentHex }} aria-hidden="true" />
                <span>استكشاف جميع العوالم</span>
              </button>
            )}
          </>
        )}
      </footer>
    </section>
  );
}
