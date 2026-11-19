import React, { useEffect, useState } from 'react';
import { CheckCircle2, LayoutGrid, X } from 'lucide-react';
import type { QuestionSet } from '../../data/types';
import { toArabicDigits } from '../../game/engine';
import { RoseDivider } from '../RoseFiligree';
import { RoseModalShell } from '../SharedUI';

export type PendingNavAction =
  | { type: 'exit' }
  | { type: 'skip'; targetIndex: number }
  | { type: 'jump'; index: number }
  | { type: 'external'; onConfirmLeave: () => void };

function formatUnsavedCountPhrase(count: number): string {
  if (count <= 1) return 'خيار واحد';
  if (count === 2) return 'خيارين';
  if (count <= 10) return `${toArabicDigits(count)} خيارات`;
  return `${toArabicDigits(count)} خياراً`;
}

export function QuestionProgressModal({
  isOpen,
  onClose,
  set,
  effectiveSavedAnswers,
  questionIndex,
  hasActiveQissasa,
  answeredCount,
  totalQuestions,
  isPartnerView,
  isSelfReview,
  isReadOnly,
  partnerName,
  isVelvet,
  highlightHex,
  buttonAccentHex,
  motionEnabled,
  onJumpToQuestion,
}: {
  isOpen: boolean;
  onClose: () => void;
  set: QuestionSet;
  effectiveSavedAnswers: Record<string, string[]>;
  questionIndex: number;
  hasActiveQissasa: boolean;
  answeredCount: number;
  totalQuestions: number;
  isPartnerView: boolean;
  isSelfReview: boolean;
  isReadOnly: boolean;
  partnerName?: string;
  isVelvet: boolean;
  highlightHex: string;
  buttonAccentHex: string;
  motionEnabled: boolean;
  onJumpToQuestion: (index: number) => void;
}) {
  return (
    <RoseModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="خريطة تقدم المستوى"
      motionEnabled={motionEnabled}
      darkVelvet={isVelvet}
      accentHex={highlightHex}
      insetFrame={false}
      scrollableBody
      cardPaddingClass="p-0"
    >
      <div className="flex-1 min-h-0 max-h-[82dvh] overflow-y-auto ad-no-scrollbar p-5 flex flex-col gap-3.5">
        <div className="relative z-10 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
                isVelvet
                  ? 'bg-[#4E112C] border-[#DF5B8E]/55'
                  : 'bg-white border-[#E88FB2]'
              }`}
              style={{ color: highlightHex }}
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3
                className={`font-display-ar text-xl font-bold leading-snug ${
                  isVelvet ? 'text-white' : 'text-[#360D21]'
                }`}
              >
                التقدم داخل المستوى
              </h3>
              <p
                className={`text-[11px] mt-0.5 tabular-nums-ar truncate ${
                  isVelvet ? 'text-[#F6C4D7]' : 'text-[#5E364A]'
                }`}
              >
                {isPartnerView
                  ? `${set.title} · اختيارات ${partnerName ?? 'الشريكة'} (${toArabicDigits(answeredCount)} من ${toArabicDigits(totalQuestions)})`
                  : isSelfReview
                    ? `${set.title} · مراجعة إجاباتكِ (${toArabicDigits(answeredCount)} من ${toArabicDigits(totalQuestions)})`
                    : `${set.title} · ${toArabicDigits(answeredCount)} من ${toArabicDigits(totalQuestions)} محفوظة في السجل`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة التقدم"
            className={`min-w-[44px] min-h-[44px] rounded-full border flex items-center justify-center cursor-pointer active:scale-95 transition-[color,background-color,transform] duration-150 shrink-0 shadow-sm ${
              isVelvet
                ? 'bg-[#4A1029] border-[#DF5B8E]/45 text-[#FFDCE9] hover:text-white'
                : 'bg-white border-[#EFCBD7] text-[#5E364A] hover:text-[#D6286C] hover:bg-[#FCECF1]'
            }`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="relative z-10">
          <RoseDivider color={highlightHex} />
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-2">
          {set.questions.map((q, idx) => {
            const isAnswered = (effectiveSavedAnswers[q.id]?.length ?? 0) > 0;
            const isCurrent = !hasActiveQissasa && idx === questionIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onJumpToQuestion(idx)}
                style={
                  isCurrent
                    ? { backgroundColor: buttonAccentHex, borderColor: buttonAccentHex }
                    : undefined
                }
                className={`min-h-[50px] px-3 py-2 ad-cut-tile border text-right flex items-center justify-between gap-1.5 active:scale-[0.97] transition-[background-color,border-color,transform] duration-150 cursor-pointer ${
                  isCurrent
                    ? 'text-white shadow-sm'
                    : isVelvet
                      ? isAnswered
                        ? 'bg-[#561332] border-[#DF5B8E]/50 text-[#FFE8F1] hover:border-[#FF9BC4]'
                        : 'bg-[#2E0819] border-[#DF5B8E]/35 text-[#FFDCE9] hover:border-[#FF9BC4]'
                      : isAnswered
                        ? 'bg-[#FCECF1]/85 border-[#E8AFC3] text-[#5E364A] hover:border-[#D6286C]'
                        : 'bg-white/95 border-[#F2D5DF] text-[#5E364A] hover:border-[#D6286C]/60'
                }`}
              >
                <span className="text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
                  {isAnswered && (
                    <CheckCircle2
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: isCurrent ? '#FFFFFF' : highlightHex }}
                      aria-hidden="true"
                    />
                  )}
                  <span>السؤال {toArabicDigits(idx + 1)}</span>
                </span>
                <span className="text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                  {isCurrent
                    ? 'الحالي'
                    : isAnswered
                      ? isReadOnly
                        ? isPartnerView
                          ? 'مُجاب'
                          : 'مراجعة'
                        : 'في السجل · تعديل'
                      : isPartnerView
                        ? 'لم يُجب'
                        : 'متبقي'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`relative z-10 w-full min-h-[46px] ad-cut-tile text-sm font-semibold cursor-pointer active:scale-[0.98] transition-[transform,opacity] duration-150 ${
            isVelvet ? 'bg-white text-[#360D21]' : 'bg-[#360D21] text-white'
          }`}
        >
          {hasActiveQissasa ? 'العودة للقصاصة الفنية' : 'العودة للسؤال الحالي'}
        </button>
      </div>
    </RoseModalShell>
  );
}

export function UnsavedSelectionModal({
  pendingNavAction,
  selectedCount,
  canConfirm,
  isVelvet,
  highlightHex,
  buttonAccentHex,
  motionEnabled,
  onConfirmAndProceed,
  onProceedWithoutSaving,
  onCancel,
}: {
  pendingNavAction: PendingNavAction | null;
  selectedCount: number;
  canConfirm: boolean;
  isVelvet: boolean;
  highlightHex: string;
  buttonAccentHex: string;
  motionEnabled: boolean;
  onConfirmAndProceed: (action: PendingNavAction) => void;
  onProceedWithoutSaving: (action: PendingNavAction) => void;
  onCancel: () => void;
}) {
  const [cachedAction, setCachedAction] = useState<PendingNavAction | null>(pendingNavAction);

  useEffect(() => {
    if (pendingNavAction) setCachedAction(pendingNavAction);
  }, [pendingNavAction]);

  const activeAction = pendingNavAction ?? cachedAction;
  if (!activeAction) return null;

  return (
    <RoseModalShell
      isOpen={Boolean(pendingNavAction)}
      onClose={onCancel}
      ariaLabel="تأكيد الانتقال من السؤال"
      maxWidthClass="max-w-[338px]"
      motionEnabled={motionEnabled}
      darkVelvet={isVelvet}
      accentHex={highlightHex}
      insetFrame={false}
      cardPaddingClass="p-5"
    >
      <div className="flex flex-col gap-3 text-center">
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-full grid grid-cols-[44px_minmax(0,1fr)_44px] items-center">
            <span aria-hidden="true" />
            <h3
              className={`font-display-ar text-xl font-bold ${
                isVelvet ? 'text-white' : 'text-[#360D21]'
              }`}
            >
              اختيار غير مؤكّد
            </h3>
            <button
              type="button"
              onClick={onCancel}
              aria-label="إغلاق نافذة التأكيد"
              className={`min-w-[44px] min-h-[44px] rounded-full border flex items-center justify-center cursor-pointer active:scale-95 transition-[color,transform] duration-150 justify-self-end shadow-sm ${
                isVelvet
                  ? 'bg-[#4A1029] border-[#DF5B8E]/45 text-[#FFDCE9] hover:text-white'
                  : 'bg-white border-[#EFCBD7] text-[#5E364A] hover:text-[#D6286C]'
              }`}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="w-28">
            <RoseDivider color={highlightHex} />
          </div>
          <p className={`text-xs leading-relaxed ${isVelvet ? 'text-[#F6C4D7]' : 'text-[#5E364A]'}`}>
            قمتِ بتحديد {formatUnsavedCountPhrase(selectedCount)} في هذا السؤال دون الضغط على «اعتماد الإجابة». ماذا تفضّلين؟
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-2 pt-1">
          {canConfirm && (
            <button
              type="button"
              onClick={() => onConfirmAndProceed(activeAction)}
              style={{ backgroundColor: buttonAccentHex }}
              className="w-full min-h-[44px] ad-cut-tile text-white text-xs font-bold cursor-pointer hover:brightness-95 active:scale-[0.98] transition-[transform,filter] duration-150"
            >
              {activeAction.type === 'exit'
                ? 'اعتماد الإجابة والخروج'
                : activeAction.type === 'external'
                  ? 'اعتماد الإجابة والمتابعة'
                  : 'اعتماد الإجابة وعرض القصاصة'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onProceedWithoutSaving(activeAction)}
            className={`w-full min-h-[44px] ad-cut-tile text-xs font-bold cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 ${
              isVelvet
                ? 'bg-[#561332] text-[#FFDCE9] hover:bg-[#6E1840]'
                : 'bg-[#FCEEF3] text-[#B92859] hover:bg-[#FADCE7]'
            }`}
          >
            {activeAction.type === 'exit'
              ? 'خروج دون حفظ الاختيار'
              : 'المتابعة دون حفظ الاختيار'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`w-full min-h-[44px] ad-cut-tile border text-xs font-semibold cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 ${
              isVelvet
                ? 'bg-[#2E0819] border-[#DF5B8E]/45 text-white'
                : 'bg-white border-[#EFCBD7] text-[#360D21]'
            }`}
          >
            تراجع
          </button>
        </div>
      </div>
    </RoseModalShell>
  );
}
