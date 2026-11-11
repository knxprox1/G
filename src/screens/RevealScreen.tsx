import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowLeft, ChevronLeft, Sparkles, Heart, CheckSquare, Square, Layers } from 'lucide-react';
import { MoodId } from '../types/game';
import { getQuestionsForWorld, WorldChoiceQuestion, QuestionOption } from '../data/worldQuestions';
import { QuestionImageFrame } from '../components/QuestionImageFrame';

interface RevealScreenProps {
  partnerAName?: string;
  partnerBName?: string;
  category?: string;
  targetPartner?: string;
  selectedMood?: MoodId;
  onBackToMood?: () => void;
  onCompleteQuestions?: () => void;
  onNextCard?: () => void;
}

export const RevealScreen: React.FC<RevealScreenProps> = ({
  selectedMood = 'heritage_values',
  onBackToMood,
  onCompleteQuestions,
  onNextCard,
}) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  // Support for multiple selections (Array of IDs)
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);

  const worldQuestions: WorldChoiceQuestion[] = getQuestionsForWorld(selectedMood);
  const currentQuestion: WorldChoiceQuestion = worldQuestions[questionIndex % worldQuestions.length];
  const isLastQuestion = questionIndex >= worldQuestions.length - 1;
  const isMulti = !!currentQuestion.isMultiSelect;

  const handleSelectOption = (optionId: string) => {
    if (isMulti) {
      // Toggle logic for multiple selection
      setSelectedOptionIds((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      // Single selection replaces previous
      setSelectedOptionIds([optionId]);
    }
  };

  const handleNext = () => {
    if (selectedOptionIds.length === 0) return;

    if (isLastQuestion) {
      if (onCompleteQuestions) {
        onCompleteQuestions();
      } else if (onBackToMood) {
        onBackToMood();
      }
    } else {
      setSelectedOptionIds([]);
      setQuestionIndex((prev) => prev + 1);
      if (onNextCard) onNextCard();
    }
  };

  // Determine grid layout based on number of options
  const optionCount = currentQuestion.options.length;
  // If > 4 options, use a 2-column grid even on mobile for compact zero-scroll layout
  const isDenseGrid = optionCount > 4;

  return (
    <div className="h-full w-full flex flex-col justify-between p-1.5 sm:p-2.5 md:p-3.5 max-w-5xl mx-auto select-none overflow-hidden relative text-white">
      {/* ================= 1. SANCTUARY TOP BAR (شريط علوي أنثوي هادئ بدون أدوار) ================= */}
      <header className="shrink-0 w-full h-8 sm:h-9 flex items-center justify-between gap-2 px-1 mb-1 border-b border-white/10">
        {/* Back Button & World Title */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onBackToMood && (
            <button
              onClick={onBackToMood}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 text-rose-200 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
              title="العودة لاختيار العوالم"
              aria-label="العودة لاختيار العوالم"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 -scale-x-100" />
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 border border-white/10">
            <img
              src={currentQuestion.worldImage}
              alt=""
              className="w-4 h-4 object-contain"
            />
            <span className="text-[11px] sm:text-xs font-bold text-amber-200">
              {currentQuestion.worldShortName}
            </span>
          </div>
        </div>

        {/* Exclusive Feminine Sanctuary Badge (موجه لها فقط) */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-950/60 border border-rose-400/25 text-[11px] sm:text-xs text-rose-200">
            <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
            <span className="font-semibold">مساحتكِ الخاصة</span>
          </div>

          <div className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-[11px] sm:text-xs font-bold text-amber-300 tabular-nums">
            {questionIndex + 1} / {worldQuestions.length}
          </div>
        </div>
      </header>

      {/* ================= 2. LARGE IMAGE FRAME & QUESTION HERO (إطار الصورة البارز ونص السؤال) ================= */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 mb-1 sm:mb-2 rounded-xl sm:rounded-2xl bg-black/45 backdrop-blur-md border border-white/10 p-2 sm:p-3 flex items-center gap-2.5 sm:gap-4 shadow-sm"
        >
          {/* Prominent Large Question Image Frame (~40% from header area) */}
          <div className="w-32 h-28 sm:w-44 sm:h-36 md:w-56 md:h-40 lg:w-64 lg:h-44 shrink-0">
            <QuestionImageFrame
              imageUrl={currentQuestion.questionImage}
              title={currentQuestion.worldShortName}
              className="w-full h-full"
              allowTogglePreview={true}
            />
          </div>

          {/* Question Text and Category Title (~60% space) */}
          <div className="flex-1 min-w-0 flex flex-col justify-center text-right space-y-1 sm:space-y-1.5 pr-0.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 text-amber-300 text-[11px] sm:text-xs font-semibold">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{currentQuestion.title}</span>
              </div>

              {/* Mode indicator pill (اختيار متعدد أم فردي) */}
              {isMulti ? (
                <span className="text-[10px] bg-rose-500/20 text-rose-200 border border-rose-400/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                  <CheckSquare className="w-2.5 h-2.5 text-rose-300" />
                  <span>اختيار متعدد</span>
                </span>
              ) : (
                <span className="text-[10px] text-rose-200/60 font-medium hidden sm:inline">
                  إجابة واحدة
                </span>
              )}
            </div>

            <h2 className="text-white font-bold text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed text-right drop-shadow-xs">
              « {currentQuestion.question} »
            </h2>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ================= 3. OPTIONS PANEL (تتكيف ديناميكياً مع 4 أو 5 أو 6 خيارات وتدعم الاختيار المتعدد) ================= */}
      <div className="flex-1 min-h-0 flex flex-col justify-between my-0.5 overflow-hidden">
        {/* Subtle hint bar */}
        <div className="shrink-0 flex items-center justify-between text-[11px] text-rose-200/80 px-1 mb-1">
          <span>
            {isMulti
              ? 'يمكنكِ اختيار إجابة واحدة أو أكثر تعبر عن مشاعركِ'
              : 'اختاري الإجابة الأقرب لقلبكِ'}
          </span>
          {isMulti && selectedOptionIds.length > 0 && (
            <span className="text-amber-300 font-bold">
              تم تحديد ({selectedOptionIds.length})
            </span>
          )}
        </div>

        {/* Dynamic Grid: Stacks or splits depending on optionCount and screen size */}
        <div
          className={`flex-1 min-h-0 gap-1.5 sm:gap-2 ${
            isDenseGrid
              ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3'
              : 'grid grid-cols-1 md:grid-cols-2'
          }`}
        >
          {currentQuestion.options.map((option: QuestionOption) => {
            const isSelected = selectedOptionIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option.id)}
                className={`w-full h-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-right transition-all cursor-pointer select-none active:scale-[0.99] ${
                  isSelected
                    ? 'bg-gradient-to-r from-rose-950/85 via-purple-950/85 to-amber-950/85 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/60 font-semibold'
                    : 'bg-black/35 hover:bg-black/55 border-white/10 text-rose-100 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Option Letter (أ، ب، ج، د، هـ، و) */}
                  <span
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-black shadow-xs'
                        : 'bg-white/10 text-rose-200 border border-white/15'
                    }`}
                  >
                    {option.letter}
                  </span>

                  {/* Option Text */}
                  <span className="text-xs sm:text-sm leading-snug line-clamp-3 sm:line-clamp-none">
                    {option.text}
                  </span>
                </div>

                {/* Selection Checkmark / Box */}
                {isMulti ? (
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                      isSelected
                        ? 'bg-amber-400 border-amber-300 text-black shadow-xs'
                        : 'border-white/25 bg-black/20 text-transparent'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                ) : isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-white/20 shrink-0 opacity-40" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= 4. BOTTOM ACTION CTA (زر المتابعة بكامل العرض وبأقل حشو) ================= */}
      <footer className="shrink-0 pt-1 sm:pt-1.5">
        <button
          onClick={handleNext}
          disabled={selectedOptionIds.length === 0}
          className={`w-full h-10 sm:h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] ${
            selectedOptionIds.length > 0
              ? 'bg-gradient-to-r from-amber-500 via-rose-600 to-amber-500 text-white border border-amber-300/40 shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:brightness-110'
              : 'bg-black/40 text-rose-300/40 border border-white/10 cursor-not-allowed opacity-60'
          }`}
        >
          <span>{isLastQuestion ? 'إنهاء الجولة واختيار عالم آخر' : 'السؤال التالي'}</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
};
