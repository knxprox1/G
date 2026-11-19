import React from 'react';
import { Check, MessageCircleHeart } from 'lucide-react';
import type { GameQuestion, GameRealm } from '../../data/types';
import { toArabicDigits } from '../../game/engine';
import type { AnswerQissasa } from '../../game/reflection';
import { CornerRoseFiligree, RealmMotifIcon, RoseDivider } from '../RoseFiligree';

function getPromptSizeClass(prompt: string): string {
  const len = prompt.length;
  if (len > 120) return 'text-[1.02rem] sm:text-[1.12rem] leading-[1.58]';
  if (len > 85) return 'text-[1.12rem] sm:text-[1.22rem] leading-[1.58]';
  if (len > 50) return 'text-[1.22rem] sm:text-[1.34rem] leading-[1.55]';
  return 'text-[1.32rem] sm:text-[1.45rem] leading-[1.5]';
}

export function QuestionCardFace({
  question,
  questionNumber,
  accentHex,
  tier = 0,
  isCompactStack,
  showDeckShadow,
  partnerMeta,
}: {
  question: GameQuestion;
  questionNumber: number;
  accentHex: string;
  tier?: 0 | 1 | 2;
  isCompactStack: boolean;
  showDeckShadow?: boolean;
  partnerMeta?: { partnerName: string; hasAnswered: boolean };
}) {
  const isVelvet = tier === 2;
  const isDusk = tier === 1;
  const highlightHex = isVelvet ? '#FF8CB8' : accentHex;

  return (
    <div className="relative shrink-0">
      {showDeckShadow && (
        <div
          aria-hidden="true"
          className={`absolute inset-x-2 top-1.5 -bottom-1.5 ad-cut-card -rotate-1 ${
            isVelvet ? 'bg-[#5A1332]/75' : isDusk ? 'bg-[#EE9FC0]' : 'bg-[#F9C6D9]'
          }`}
        />
      )}

      <div
        className={`relative z-10 ad-cut-card border flex flex-col overflow-hidden ${
          isVelvet
            ? 'bg-gradient-to-b from-[#3E0D23] via-[#32091C] to-[#260615] border-[#DF5B8E]/45 shadow-[0_18px_44px_rgba(0,0,0,0.45)]'
            : isDusk
              ? 'bg-gradient-to-b from-[#FFFDFD] via-[#FFF4F8] to-[#FFE6F0] border-[#E498B8] shadow-[0_16px_38px_rgba(166,28,87,0.16)]'
              : 'bg-gradient-to-b from-white via-[#FFF9FB] to-[#FFF2F6] border-[#F1AFC8] shadow-[0_16px_38px_rgba(214,40,108,0.14)]'
        } ${isCompactStack ? 'px-4 py-3.5 gap-2.5' : 'px-4 py-4 sm:p-5 gap-3'}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20"
          style={{
            background: isVelvet
              ? 'radial-gradient(ellipse 75% 85% at 50% 0%, rgba(255,140,184,0.18) 0%, transparent 74%)'
              : `radial-gradient(ellipse 75% 85% at 50% 0%, ${accentHex}14 0%, transparent 74%)`,
          }}
        />
        <CornerRoseFiligree
          position="bottom-left"
          color={highlightHex}
          className="w-8 h-8 opacity-25"
        />

        <div className="relative z-10 flex items-center justify-between text-[11px] font-semibold">
          <span style={{ color: highlightHex }}>
            السؤال {toArabicDigits(questionNumber)}
          </span>
          <span className={isVelvet ? 'text-[#F6B8D0]' : 'text-[#5E364A]'}>
            {partnerMeta
              ? partnerMeta.hasAnswered
                ? `اختيار ${partnerMeta.partnerName}`
                : `بانتظار إجابة ${partnerMeta.partnerName}`
              : question.allowMultiple
                ? typeof question.maxSelect === 'number' && question.maxSelect > 1
                  ? `اختيار متعدد · حتى ${toArabicDigits(question.maxSelect)} خيارات`
                  : question.minSelect > 1
                    ? `اختيار متعدد · ${toArabicDigits(question.minSelect)} خيارات فأكثر`
                    : 'اختيار متعدد · حددي إجابة أو أكثر'
                : 'اختيار واحد محدد'}
          </span>
        </div>

        {partnerMeta && (
          <p
            className={`relative z-10 text-[11px] font-semibold leading-snug -mb-1 ${
              isVelvet ? 'text-[#FF9AC2]' : 'text-[#8E2252]'
            }`}
          >
            السؤال الموجّه إلى {partnerMeta.partnerName}:
          </p>
        )}

        <h2
          className={`relative z-10 font-sans font-bold ${
            isVelvet ? 'text-[#FFF7FA]' : 'text-[#360D21]'
          } ${getPromptSizeClass(question.prompt)}`}
        >
          {question.prompt}
        </h2>

        <div className="relative z-10">
          <RoseDivider color={highlightHex} />
        </div>
      </div>
    </div>
  );
}

export function QissasaNoteCard({
  data,
  realm,
  tier = 0,
  motionEnabled,
  isEntering,
  partnerName,
  onDiscussInChat,
}: {
  data: AnswerQissasa;
  realm: GameRealm;
  tier?: 0 | 1 | 2;
  motionEnabled: boolean;
  isEntering?: boolean;
  partnerName?: string;
  onDiscussInChat?: () => void;
}) {
  const isVelvet = tier === 2;
  const isDusk = tier === 1;
  const highlightHex = isVelvet ? '#FF8CB8' : realm.accentHex;

  return (
    <div className="relative w-full py-1.5">
      <div
        aria-hidden="true"
        className={`absolute inset-x-3 top-2.5 -bottom-1 ad-cut-card -rotate-1 ${
          isVelvet
            ? 'bg-gradient-to-br from-[#6D133B] via-[#530D2B] to-[#3B081E] opacity-90'
            : 'bg-gradient-to-br from-[#F7B7CF] via-[#F296BA] to-[#E677A4] opacity-85'
        }`}
      />

      <div
        className={`relative z-10 ad-cut-card border px-5 pt-5 pb-5 sm:px-7 sm:py-6 flex flex-col items-center text-center gap-3 overflow-hidden ${
          isVelvet
            ? 'bg-gradient-to-b from-[#3B0C21] via-[#2F0819] to-[#230512] border-[#DF5B8E]/50 shadow-[0_24px_56px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,214,230,0.12)]'
            : isDusk
              ? 'bg-gradient-to-b from-[#FFFDFC] via-[#FFF4F8] to-[#FFE1EC] border-[#DF8BAE] shadow-[0_24px_56px_rgba(148,22,74,0.2),inset_0_1px_0_rgba(255,255,255,0.95)]'
              : 'bg-gradient-to-b from-[#FFFEFD] via-[#FFF9FB] to-[#FFECF3] border-[#E9A7C2] shadow-[0_24px_56px_rgba(148,22,74,0.18),inset_0_1px_0_rgba(255,255,255,0.95)]'
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: isVelvet
              ? 'radial-gradient(ellipse 75% 85% at 50% 0%, rgba(255,140,184,0.22) 0%, transparent 72%)'
              : `radial-gradient(ellipse 75% 85% at 50% 0%, ${realm.accentHex}1F 0%, transparent 72%)`,
          }}
        />

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-2.5 ad-cut-tile border ${
            isVelvet ? 'border-[#FF9BC4]/25' : 'border-[#E89EBC]/45'
          }`}
        />

        {motionEnabled && isEntering && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-l from-transparent ${
              isVelvet ? 'via-white/18' : 'via-white/75'
            } to-transparent ad-anim-qissasa-shimmer z-20`}
          />
        )}

        <CornerRoseFiligree position="top-right" color={highlightHex} insetFrame className="opacity-30" />
        <CornerRoseFiligree position="bottom-left" color={highlightHex} insetFrame className="opacity-30" />

        <div className="relative z-10 w-full flex items-center justify-center gap-3 pt-0.5">
          <span
            aria-hidden="true"
            className={`h-px flex-1 bg-gradient-to-l to-transparent ${
              isVelvet ? 'from-[#FF8CB8]/55' : 'from-[#E293B3]/70'
            }`}
          />
          <div
            className={`relative w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${
              isVelvet
                ? 'bg-[#2B0717] border-[#DF5B8E]/60 shadow-[0_8px_20px_rgba(0,0,0,0.4)]'
                : 'bg-white border-[#E79EBB] shadow-[0_8px_20px_rgba(180,34,106,0.16)]'
            } ${motionEnabled && isEntering ? 'ad-anim-qissasa-crest' : ''}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-1 rounded-full border border-dashed ${
                isVelvet ? 'border-[#FF9BC4]/55' : 'border-[#E6A4BC]/75'
              }`}
            />
            <span style={{ color: highlightHex }}>
              <RealmMotifIcon motif={realm.motif} className="w-5 h-5" />
            </span>
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -left-0.5 w-[18px] h-[18px] rounded-full text-white border border-white flex items-center justify-center shadow-xs"
              style={{ backgroundColor: isVelvet ? '#E2387D' : realm.accentHex }}
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          </div>
          <span
            aria-hidden="true"
            className={`h-px flex-1 bg-gradient-to-r to-transparent ${
              isVelvet ? 'from-[#FF8CB8]/55' : 'from-[#E293B3]/70'
            }`}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-1 px-2">
          <span
            className="text-[11px] font-bold tracking-wide"
            style={{ color: highlightHex }}
          >
            {data.confirmationBadge}
          </span>
          <h3
            className={`font-display-ar text-[1.45rem] sm:text-[1.68rem] font-bold leading-snug text-balance max-w-[22ch] ${
              isVelvet ? 'text-[#FFF8FA]' : 'text-[#360D21]'
            }`}
          >
            {data.headline}
          </h3>
        </div>

        <div className="relative z-10 w-full flex flex-col items-center">
          <span
            aria-hidden="true"
            className={`w-full h-px bg-gradient-to-r from-transparent to-transparent ${
              isVelvet ? 'via-[#FF8CB8]/45' : 'via-[#E593B4]/65'
            }`}
          />
          <div
            className={`w-full py-2.5 px-3 bg-gradient-to-r from-transparent to-transparent flex flex-col items-center gap-1 ${
              isVelvet ? 'via-[#541130]/78' : 'via-[#FFE8F1]/80'
            }`}
          >
            <span className={`text-[11px] font-semibold ${isVelvet ? 'text-[#F6B8D0]' : 'text-[#7B3556]'}`}>
              {partnerName ? `اختيار ${partnerName}` : 'اختياركِ'} · السؤال {toArabicDigits(data.questionNumber)}
            </span>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {data.selectedOptions.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  {data.selectedOptions.map((opt) => (
                    <span
                      key={opt.id}
                      className="w-[18px] h-[18px] rounded-full text-[11px] font-bold text-white flex items-center justify-center"
                      style={{ backgroundColor: isVelvet ? '#E2387D' : realm.accentHex }}
                    >
                      {opt.marker}
                    </span>
                  ))}
                </span>
              )}
              <p
                className={`text-[13px] sm:text-sm font-bold leading-relaxed text-balance ${
                  isVelvet ? 'text-white' : 'text-[#2B0818]'
                }`}
              >
                {data.choiceEcho}
              </p>
            </div>
          </div>
          <span
            aria-hidden="true"
            className={`w-full h-px bg-gradient-to-r from-transparent to-transparent ${
              isVelvet ? 'via-[#FF8CB8]/45' : 'via-[#E593B4]/65'
            }`}
          />
        </div>

        <p
          className={`relative z-10 text-[13px] sm:text-[14px] leading-[1.86] font-medium max-w-[31ch] px-1 ${
            isVelvet ? 'text-[#FCEAF1]' : 'text-[#45172E]'
          }`}
        >
          {data.diagnosticText}
        </p>

        <div className="relative z-10 w-28 pt-0.5">
          <RoseDivider color={highlightHex} />
        </div>

        {onDiscussInChat && (
          <button
            type="button"
            onClick={onDiscussInChat}
            className={`relative z-10 min-h-[44px] px-4 ad-cut-chip border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[border-color,transform] duration-150 ${
              isVelvet
                ? 'bg-[#541130]/90 border-[#DF5B8E]/45 text-[#FFDCE9] hover:border-[#FF9BC4]'
                : 'bg-white/95 border-[#EFCBD7] text-[#7B1E48] hover:border-[#D6286C]'
            }`}
          >
            <MessageCircleHeart className="w-3.5 h-3.5 shrink-0" style={{ color: highlightHex }} aria-hidden="true" />
            <span>مناقشة في الدردشة</span>
          </button>
        )}
      </div>
    </div>
  );
}
