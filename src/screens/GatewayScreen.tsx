import React from 'react';
import { motion } from 'motion/react';
import { Flame, ArrowLeft, Download } from 'lucide-react';
import { ScreenId } from '../types/game';
import { PrototypeNav } from '../components/PrototypeNav';

interface GatewayScreenProps {
  onEnter: () => void;
  onNavigate?: (screen: ScreenId) => void;
}

export const GatewayScreen: React.FC<GatewayScreenProps> = ({ onEnter, onNavigate }) => {
  return (
    <div className="h-full w-full relative flex flex-col justify-end p-4 md:p-8 max-w-lg mx-auto select-none overflow-hidden bg-transparent">
      {/* Subtle bottom shadow to make the Start button stand out sharply */}
      <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-0" />

      {/* Floating Project Download Button */}
      <a
        href="/tanaghom-project.zip"
        download="tanaghom-project.zip"
        className="absolute top-3 left-3 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 border border-amber-400/40 hover:border-amber-400 text-amber-200 hover:text-white text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        title="تحميل ملف وكود المشروع كامل بصيغة ZIP"
      >
        <Download className="w-3.5 h-3.5 text-amber-400" />
        <span>تحميل المشروع (ZIP)</span>
      </a>

      {/* Start Button & Bottom Navigation Strip */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="relative z-10 w-full flex flex-col items-center justify-center pb-4 sm:pb-6 gap-3 mb-1"
      >
        {/* زر ابدأ */}
        <button
          onClick={onEnter}
          className="w-44 sm:w-48 h-11 sm:h-12 rounded-full bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(236,72,153,0.75)] active:scale-95 transition-all cursor-pointer border border-rose-300/80 relative overflow-hidden group"
        >
          {/* Shimmer light sweep */}
          <div className="absolute inset-0 w-1/2 h-full bg-white/25 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000" />

          <Flame className="w-4 h-4 fill-pink-100 text-pink-100 animate-pulse" />
          <span className="tracking-wide text-white drop-shadow-sm font-semibold">ابدأ</span>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </button>

        {/* الشريط الأفقي للأيقونات السفلية - معروض في الشاشة الرئيسية فقط تحت زر ابدأ */}
        {onNavigate && (
          <div className="pt-0.5">
            <PrototypeNav currentScreen="gateway" onNavigate={onNavigate} />
          </div>
        )}
      </motion.div>
    </div>
  );
};
