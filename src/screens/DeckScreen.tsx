import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoodId } from '../types/game';
import { Sparkles, Flame, Heart, Shuffle, ArrowLeft } from 'lucide-react';

interface DeckScreenProps {
  mood: MoodId;
  partnerAName: string;
  partnerBName: string;
  onSelectCardAndReveal: (cardInfo: { category: string; targetPartner: string; intensity: number }) => void;
}

export const DeckScreen: React.FC<DeckScreenProps> = ({
  mood,
  partnerAName,
  partnerBName,
  onSelectCardAndReveal,
}) => {
  const [turn, setTurn] = useState<'A' | 'B'>('A');
  const [shuffling, setShuffling] = useState(false);
  const [drawnCount, setDrawnCount] = useState(1);

  const currentPartner = turn === 'A' ? partnerAName : partnerBName;

  const CATEGORIES = [
    { title: 'همسة اعتراف', desc: 'بوح عاطفي صادق يذيب المسافات بينكما', icon: <Heart className="w-4 h-4 text-rose-500" /> },
    { title: 'لمسة دافئة', desc: 'مداعبة حسية لطيفة تشعل المشاعر برقة', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { title: 'تحدي الشغف', desc: 'أمر رومانسي خاص ينفذه الشريك لك الليلة', icon: <Flame className="w-4 h-4 text-rose-600" /> },
  ];

  const currentCategory = CATEGORIES[(drawnCount - 1) % CATEGORIES.length];

  const handleShuffle = () => {
    setShuffling(true);
    setTimeout(() => {
      setShuffling(false);
      setDrawnCount((prev) => prev + 1);
      setTurn(turn === 'A' ? 'B' : 'A');
    }, 450);
  };

  const handleProceed = () => {
    onSelectCardAndReveal({
      category: currentCategory.title,
      targetPartner: currentPartner,
      intensity: mood === 'passionate' || mood === 'wild' ? 3 : 2,
    });
  };

  return (
    <div className="h-full w-full flex flex-col justify-between py-2 sm:py-3 px-3 sm:px-5 md:px-6 max-w-lg mx-auto select-none overflow-hidden relative text-white">
      {/* Top Deck HUD */}
      <div className="shrink-0 space-y-1 text-center pt-0.5">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/65 border border-amber-400/40 text-xs shadow-md">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-rose-100">دور السحب موجه إلى: <strong className="text-amber-300 font-extrabold">{currentPartner}</strong></span>
        </div>
        <div className="text-[11px] text-rose-200/80 font-medium">
          البطاقة رقم {drawnCount} في جلسة الليلة
        </div>
      </div>

      {/* Center: 3D Stack of Velvet Cards */}
      <div className="my-auto py-2 flex flex-col items-center justify-center shrink-0 relative">
        <div className="relative w-64 h-80 md:w-72 md:h-92 flex items-center justify-center cursor-pointer group" onClick={handleProceed}>
          {/* Card stack layer 3 (bottom shadow) */}
          <div className="absolute w-56 h-72 rounded-3xl bg-rose-950/60 border border-amber-400/20 rotate-6 translate-y-3 opacity-60" />
          
          {/* Card stack layer 2 (middle tilt) */}
          <div className="absolute w-60 h-76 rounded-3xl bg-rose-900/60 border border-amber-400/30 -rotate-3 translate-y-1.5 opacity-80" />

          {/* Active Top Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={drawnCount}
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{
                scale: shuffling ? 0.95 : 1,
                y: shuffling ? -15 : 0,
                opacity: 1,
                rotate: shuffling ? 8 : 0,
              }}
              exit={{ scale: 0.85, y: -40, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative w-64 h-80 md:w-68 md:h-88 rounded-3xl bg-gradient-to-b from-[#2d0f2a]/95 via-[#1a0818]/95 to-[#240a20]/95 border-2 border-amber-400/50 p-5 flex flex-col justify-between text-center select-none shadow-[0_0_35px_rgba(245,158,11,0.25)] transition-transform group-hover:scale-[1.02] backdrop-blur-xl"
            >
              {/* Card Gold Trim Pattern & Romantic Corners */}
              <div className="absolute inset-2.5 rounded-2xl border border-amber-400/25 pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between text-xs text-rose-200 z-10">
                <span className="flex items-center gap-1.5 font-bold text-amber-200">
                  {currentCategory.icon}
                  {currentCategory.title}
                </span>
                <span className="text-[10px] bg-rose-900/70 border border-rose-400/40 text-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                  سر خاص
                </span>
              </div>

              {/* Card Body Ornament */}
              <div className="my-auto space-y-3 z-10">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-950/60 border border-amber-400/40 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Flame className="w-8 h-8 fill-rose-400 text-rose-300 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="text-base md:text-lg font-extrabold text-white">
                    بطاقة اللحظة المغلقة
                  </div>
                  <div className="text-xs text-rose-200/80 max-w-[190px] mx-auto leading-relaxed">
                    {currentCategory.desc}
                  </div>
                </div>
              </div>

              {/* Card Footer Hint */}
              <div className="text-[11px] text-amber-300 font-bold z-10 bg-black/50 py-1.5 px-3 rounded-xl border border-amber-400/30">
                المسا الشاشة معاً لفتح السؤال
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Shuffle / Draw Another Button */}
        <button
          onClick={handleShuffle}
          disabled={shuffling}
          className="mt-3 text-xs text-rose-200/90 hover:text-white flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-black/40 hover:bg-black/60 border border-rose-400/30 transition-all cursor-pointer font-bold"
        >
          <Shuffle className={`w-3.5 h-3.5 text-amber-400 ${shuffling ? 'animate-spin' : ''}`} />
          <span>تبديل وسحب بطاقة أخرى</span>
        </button>
      </div>

      {/* Bottom Action Trigger */}
      <div className="shrink-0 pb-1 md:pb-2">
        <button
          onClick={handleProceed}
          className="w-full h-12 md:h-13 rounded-2xl bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 hover:from-amber-500 hover:to-rose-500 text-white font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all cursor-pointer border border-amber-300/50"
        >
          <span>فتح وقراءة السؤال الآن</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
