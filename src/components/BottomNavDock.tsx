import React, { useRef } from 'react';
import { Home, BookOpen, UserCog, MessageCircleHeart } from 'lucide-react';
import type { ScreenId } from '../data/types';
import { toArabicDigits } from '../game/engine';

function ModesNavIcon({
  className = 'w-[20px] h-[20px]',
  style,
  'aria-hidden': ariaHidden = true,
}: {
  className?: string;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden={ariaHidden}
    >
      <rect x="6" y="4" width="12" height="15" rx="3" strokeWidth="1.85" />
      <path d="M9.5 3.5H16.5C18.16 3.5 19.5 4.84 19.5 6.5V16.5" strokeOpacity="0.45" strokeWidth="1.5" />
      <path
        d="M12 8.2L13.3 10.7L15.8 12L13.3 13.3L12 15.8L10.7 13.3L8.2 12L10.7 10.7Z"
        fill="currentColor"
        fillOpacity="0.22"
        strokeWidth="1.4"
      />
    </svg>
  );
}

interface BottomNavDockProps {
  activeScreen: ScreenId;
  accentHex?: string;
  unreadChatCount?: number;
  motionEnabled?: boolean;
  onGoHome: () => void;
  onOpenModes: () => void;
  onOpenChat: () => void;
  onOpenLog: () => void;
  onOpenProfile: () => void;
}

/**
 * شريط التنقل السفلي الفاخر والمزخرف بهوية «ليالي الورد»
 * — مضغوط، ملتصق بقاعدة الشاشة، اسم كل تبويب أسفل أيقونته، وبدون مؤشر الخط التقليدي
 */
export function BottomNavDock({
  activeScreen,
  accentHex = '#D6286C',
  unreadChatCount = 0,
  motionEnabled = true,
  onGoHome,
  onOpenModes,
  onOpenChat,
  onOpenLog,
  onOpenProfile,
}: BottomNavDockProps) {
  const lastNavTapRef = useRef(0);

  const handleThrottledNav = (action: () => void) => {
    const now = Date.now();
    if (now - lastNavTapRef.current < 220) return;
    lastNavTapRef.current = now;
    action();
  };

  const items: Array<{
    id: 'home' | 'modes' | 'chat' | 'log' | 'profile';
    label: string;
    ariaLabel?: string;
    isActive: boolean;
    badge?: number;
    onClick: () => void;
    Icon: React.ComponentType<{
      className?: string;
      style?: React.CSSProperties;
      'aria-hidden'?: boolean;
    }>;
  }> = [
    {
      id: 'home',
      label: 'الرئيسية',
      isActive: activeScreen === 'home',
      onClick: onGoHome,
      Icon: Home,
    },
    {
      id: 'modes',
      label: 'الأنماط',
      isActive: activeScreen === 'modes' || activeScreen === 'realms',
      onClick: onOpenModes,
      Icon: ModesNavIcon,
    },
    {
      id: 'chat',
      label: 'الدردشة',
      isActive: activeScreen === 'chat',
      badge: unreadChatCount,
      onClick: onOpenChat,
      Icon: MessageCircleHeart,
    },
    {
      id: 'log',
      label: 'السجل',
      isActive: activeScreen === 'log',
      onClick: onOpenLog,
      Icon: BookOpen,
    },
    {
      id: 'profile',
      label: 'ملفي',
      ariaLabel: 'الملف الشخصي',
      isActive: activeScreen === 'profile',
      onClick: onOpenProfile,
      Icon: UserCog,
    },
  ];

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="relative shrink-0 w-full bg-gradient-to-b from-[#FFEAF2] via-[#FFDFEC] to-[#FFD2E3] shadow-[0_-10px_28px_rgba(214,40,108,0.14),inset_0_1px_0_rgba(255,255,255,0.82)] px-3 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
    >
      {/* Full-Width Continuous Sculpted Arabesque Canopy Rim (Zero Dots) */}
      <svg
        viewBox="0 0 390 22"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute -top-[14px] inset-x-0 w-full h-[20px] drop-shadow-[0_1px_4px_rgba(214,40,108,0.18)]"
        style={{ color: accentHex }}
      >
        <defs>
          <linearGradient id="navRimStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accentHex} stopOpacity="0.28" />
            <stop offset="22%" stopColor={accentHex} stopOpacity="0.62" />
            <stop offset="50%" stopColor={accentHex} stopOpacity="0.9" />
            <stop offset="78%" stopColor={accentHex} stopOpacity="0.62" />
            <stop offset="100%" stopColor={accentHex} stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="navRimPearl" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#FFF9FC" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Silky Undulating Fill Extension Blending Seamlessly Into Bar */}
        <path
          d="M0,22 L0,12 Q48,15 98,11.5 Q146,8 195,12 Q244,8 292,11.5 Q342,15 390,12 L390,22 Z"
          fill="#FFEAF2"
        />

        {/* Flowing Double-Strand Arabesque Top Lines */}
        <path
          d="M0,12 Q48,15 98,11.5 Q146,8 195,12 Q244,8 292,11.5 Q342,15 390,12"
          fill="none"
          stroke="url(#navRimStroke)"
          strokeWidth="1.3"
        />
        <path
          d="M18,14.5 Q62,17.5 112,14 Q154,11 195,14.5 Q236,11 278,14 Q328,17.5 372,14.5"
          fill="none"
          stroke="url(#navRimPearl)"
          strokeWidth="0.95"
        />

        {/* Symmetrical Sweeping Arabesque Wings & Curled Scroll Tendrils Around Center */}
        <path
          d="M126,11.5 C144,10.5 156,9 170,5.5 C163,11.8 148,13.5 126,11.5Z"
          fill="#FFE4EF"
          stroke="currentColor"
          strokeOpacity="0.58"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        <path
          d="M264,11.5 C246,10.5 234,9 220,5.5 C227,11.8 242,13.5 264,11.5Z"
          fill="#FFE4EF"
          stroke="currentColor"
          strokeOpacity="0.58"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        <path
          d="M168,9 C171.5,4.2 178,3.6 182.5,7.2 M222,9 C218.5,4.2 212,3.6 207.5,7.2"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.65"
          strokeWidth="0.95"
          strokeLinecap="round"
        />

        {/* Flanking Delicate Crescent Leaves Along Rim */}
        <path
          d="M72,12.5 C78,8.5 87,8 93,11.5 C86,14 78,14.5 72,12.5Z M318,12.5 C312,8.5 303,8 297,11.5 C304,14 312,14.5 318,12.5Z"
          fill="#FFD8E7"
          stroke="currentColor"
          strokeOpacity="0.52"
          strokeWidth="0.85"
          strokeLinejoin="round"
        />

        {/* Central Sculpted 5-Petal Crown Rose */}
        <path
          d="M195,1.8 C198.2,1.8 199.7,4.7 197.3,7.2 C200.2,5.5 202.6,8.2 200,11 C198.1,13 195.9,11.9 195,9.9 C194.1,11.9 191.9,13 190,11 C187.4,8.2 189.8,5.5 192.7,7.2 C190.3,4.7 191.8,1.8 195,1.8Z"
          fill="#FFD1E3"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <circle cx="195" cy="7.4" r="1.8" fill="#FFF9FC" stroke="currentColor" strokeWidth="0.85" />
      </svg>

      {/* Subtle Rose Petal Lattice Texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 ad-petal-lattice opacity-35"
      />

      {/* Full-Width Architectural Guilloché Curves & Corner Arabesque Vines */}
      <svg
        viewBox="0 0 390 68"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full opacity-45"
        style={{ color: accentHex }}
      >
        {/* Silky Overlapping Arch Guilloché Waves Framing the Bar */}
        <path
          d="M-10,68 Q95,24 195,58 Q295,24 400,68"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
        <path
          d="M35,68 Q195,18 355,68"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="0.9"
        />

        {/* Right-Side Sweeping Botanical Rose Vine */}
        <g>
          <path
            d="M388,6 C375,8 366,16 363,29 C371,24 380,16 388,6Z"
            fill="currentColor"
            fillOpacity="0.14"
            stroke="currentColor"
            strokeOpacity="0.55"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M384,21 C376,25 371,33 370,45 C364,40 356,39 349,44 C356,50 364,51 371,46"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.48"
            strokeWidth="0.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M377,54 C372,49 364,50 361,56 C367,60 374,59 377,54Z"
            fill="#FFF7FA"
            fillOpacity="0.65"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="0.85"
          />
        </g>

        {/* Left-Side Symmetrical Sweeping Botanical Rose Vine */}
        <g transform="translate(390,0) scale(-1,1)">
          <path
            d="M388,6 C375,8 366,16 363,29 C371,24 380,16 388,6Z"
            fill="currentColor"
            fillOpacity="0.14"
            stroke="currentColor"
            strokeOpacity="0.55"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M384,21 C376,25 371,33 370,45 C364,40 356,39 349,44 C356,50 364,51 371,46"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.48"
            strokeWidth="0.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M377,54 C372,49 364,50 361,56 C367,60 374,59 377,54Z"
            fill="#FFF7FA"
            fillOpacity="0.65"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="0.85"
          />
        </g>

        {/* Delicate Bottom-Seam Sprouting Lotus Tendrils Between Tabs */}
        {[78, 156, 234, 312].map((cx) => (
          <g key={cx} transform={`translate(${cx}, 66)`}>
            <path
              d="M0,0 C-3,-6 -8,-9 -12,-7 C-8,-3 -4,-1 0,0Z M0,0 C3,-6 8,-9 12,-7 C8,-3 4,-1 0,0Z"
              fill="#FFF8FB"
              fillOpacity="0.58"
              stroke="currentColor"
              strokeOpacity="0.42"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            <path
              d="M0,-2 C-2,-8 0,-12 0,-12 C0,-12 2,-8 0,-2Z"
              fill="currentColor"
              fillOpacity="0.28"
            />
          </g>
        ))}
      </svg>

      {/* 5 Clean Tab Buttons — Unified Bar Color, Floral Brooch Effect Strictly on Active Icon */}
      <div className="relative z-10 grid grid-cols-5 gap-0.5">
        {items.map(({ id, label, ariaLabel, isActive, badge, onClick, Icon }) => {
          const isExactTab =
            (id === 'home' && activeScreen === 'home') ||
            (id === 'modes' && activeScreen === 'modes') ||
            (id === 'chat' && activeScreen === 'chat') ||
            (id === 'log' && activeScreen === 'log') ||
            (id === 'profile' && activeScreen === 'profile');

          return (
            <button
              key={id}
              type="button"
              onClick={isExactTab ? undefined : () => handleThrottledNav(onClick)}
              aria-label={ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative min-h-[48px] py-0.5 px-0.5 ad-cut-chip flex flex-col items-center justify-center gap-[3px] whitespace-nowrap transition-[color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#360D21] ${
                isActive
                  ? 'text-[#360D21] font-bold'
                  : 'text-[#6A2B49] hover:text-[#360D21] font-medium'
              } ${isExactTab ? 'cursor-default' : 'cursor-pointer active:scale-[0.95]'}`}
            >
              {/* Icon Container with Active-Only Floral Mandala Brooch Halo */}
              <span className="relative flex items-center justify-center w-9 h-7">
                {isActive && (
                  <>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute -inset-1 rounded-full ${
                        motionEnabled ? 'ad-anim-toast-in' : ''
                      }`}
                      style={{
                        background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${accentHex}26 54%, transparent 76%)`,
                      }}
                    />
                    <svg
                      viewBox="0 0 36 36"
                      aria-hidden="true"
                      className={`pointer-events-none absolute w-[30px] h-[30px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80 ${
                        motionEnabled ? 'ad-anim-brooch-in' : ''
                      }`}
                      style={{ color: accentHex }}
                    >
                      {/* Delicate 4-Petal Floral Brooch Framing the Active Icon */}
                      <path
                        d="M18,2 C21.2,7.5 23,11 18,18 C13,11 14.8,7.5 18,2Z M18,34 C21.2,28.5 23,25 18,18 C13,25 14.8,28.5 18,34Z M2,18 C7.5,14.8 11,13 18,18 C11,23 7.5,21.2 2,18Z M34,18 C28.5,14.8 25,13 18,18 C25,23 28.5,21.2 34,18Z"
                        fill="#FFF8FB"
                        fillOpacity="0.65"
                        stroke="currentColor"
                        strokeOpacity="0.34"
                        strokeWidth="0.75"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="12.5"
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.22"
                        strokeWidth="0.7"
                      />
                    </svg>
                  </>
                )}
                <Icon
                  className={`relative z-10 w-[20px] h-[20px] shrink-0 transition-[transform,color] duration-200 ${
                    isActive
                      ? 'scale-[1.1] stroke-[2.35] drop-shadow-[0_2px_5px_rgba(214,40,108,0.28)]'
                      : 'stroke-[1.85] text-[#7D3A5B] group-hover:text-[#360D21]'
                  }`}
                  style={isActive ? { color: accentHex } : undefined}
                  aria-hidden
                />
                {typeof badge === 'number' && badge > 0 && !isActive && (
                  <span
                    aria-label={`${toArabicDigits(badge)} رسائل جديدة`}
                    className="absolute -top-0.5 -left-0.5 z-20 min-w-[17px] h-[17px] px-1 rounded-full bg-[#D6286C] text-white text-[10.5px] font-bold flex items-center justify-center shadow-xs tabular-nums-ar"
                  >
                    {badge > 9 ? '٩+' : toArabicDigits(badge)}
                  </span>
                )}
              </span>

              <span className="relative z-10 text-[11px] leading-none tracking-tight">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
