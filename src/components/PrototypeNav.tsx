import React from 'react';
import { ScreenId } from '../types/game';
import { Flame, Sparkles, Layers, Fingerprint } from 'lucide-react';

interface PrototypeNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

const SCREENS: { id: ScreenId; icon: React.ReactNode; label: string }[] = [
  { id: 'gateway', icon: <Flame className="w-4 h-4" />, label: 'المدخل' },
  { id: 'mood', icon: <Sparkles className="w-4 h-4" />, label: 'المزاج' },
  { id: 'deck', icon: <Layers className="w-4 h-4" />, label: 'البطاقات' },
  { id: 'reveal', icon: <Fingerprint className="w-4 h-4" />, label: 'كشف السر' },
];

export const PrototypeNav: React.FC<PrototypeNavProps> = ({ currentScreen, onNavigate }) => {
  return (
    <nav className="shrink-0 flex items-center justify-center z-20 pointer-events-auto bg-transparent border-none select-none">
      {/* الشريط الأفقي للأيقونات السفلية */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/20 shadow-lg">
        {SCREENS.map((screen) => {
          const isActive = currentScreen === screen.id;
          return (
            <button
              key={screen.id}
              onClick={() => onNavigate(screen.id)}
              aria-label={screen.label}
              title={screen.label}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                isActive
                  ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.7)] scale-105 font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/15'
              }`}
            >
              {screen.icon}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
