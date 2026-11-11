import React from 'react';
import { Flame, Volume2, VolumeX, RotateCcw, Download } from 'lucide-react';
import { ScreenId } from '../types/game';

interface ScreenHeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onReset: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  onNavigate,
  onReset,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="w-full shrink-0 h-12 md:h-14 px-4 md:px-6 flex items-center justify-between bg-transparent border-none z-20 pointer-events-auto select-none">
      {/* Right: Quick Minimal Icon to return to Gateway */}
      <button
        onClick={() => onNavigate('gateway')}
        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-rose-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer"
        title="الرئيسية"
        aria-label="الرئيسية"
      >
        <Flame className="w-4 h-4 fill-rose-300" />
      </button>

      {/* Middle: Completely Empty */}
      <div className="flex-1" />

      {/* Left: Floating Quick Utilities (Download, Sound & Reset) */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/tanaghom-project.zip"
          download="tanaghom-project.zip"
          title="تحميل كود وملفات المشروع كاملة (ZIP)"
          className="w-8 h-8 rounded-full flex items-center justify-center text-amber-200 hover:text-white bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all active:scale-95 border border-amber-300/40 shadow-xs cursor-pointer"
          aria-label="تحميل ملف المشروع ZIP"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all active:scale-95 border border-white/30 shadow-xs cursor-pointer"
          aria-label="تبديل الصوت"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onReset}
          title="إعادة البدء"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all active:scale-95 border border-white/30 shadow-xs cursor-pointer"
          aria-label="إعادة ضبط"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
