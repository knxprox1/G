import React from 'react';
import type { RealmMotif } from '../data/types';

interface RoseRingProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  accentHex?: string;
  label: string;
}

/**
 * حلقة تقدم هندسية وردية تعرض النسبة الفعلية بدقة بصرية عالية
 */
export function RoseRingProgress({
  percent,
  size = 54,
  strokeWidth = 4,
  accentHex = '#D6286C',
  label,
}: RoseRingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FAD0E0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accentHex}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-500"
        />
      </svg>
      <span className="absolute text-[13px] font-extrabold text-[#360D21] tabular-nums-ar leading-none">
        {label}
      </span>
    </div>
  );
}

/**
 * فاصل زخرفي بزهرة هندسية وتفاصيل جانبية متدرجة
 */
export function RoseDivider({ color = '#D6286C' }: { color?: string }) {
  return (
    <div className="flex items-center gap-2.5 w-full" aria-hidden="true">
      <span
        className="h-px flex-1"
        style={{
          backgroundImage: `linear-gradient(to left, ${color}55, transparent)`,
        }}
      />
      <svg viewBox="0 0 44 18" className="w-10 h-4 shrink-0" style={{ color }}>
        <path
          d="M2 9C7 5 11 5 15 9C11 13 7 13 2 9Z"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
        <path
          d="M42 9C37 5 33 5 29 9C33 13 37 13 42 9Z"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
        <path
          d="M22 1.5L24.6 6.4L29.5 9L24.6 11.6L22 16.5L19.4 11.6L14.5 9L19.4 6.4Z"
          fill="currentColor"
          fillOpacity="0.22"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="9" r="2.1" fill="#FFE0D4" fillOpacity="0.9" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      <span
        className="h-px flex-1"
        style={{
          backgroundImage: `linear-gradient(to right, ${color}55, transparent)`,
        }}
      />
    </div>
  );
}

/**
 * تاج قوسي نباتي يعلو البوابات القوسية في الشاشة الرئيسية
 */
export function ArchCrownOrnament({ color = '#D6286C' }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 120 26"
      className="w-24 h-6 mx-auto pointer-events-none select-none"
      style={{ color }}
      aria-hidden="true"
    >
      <path
        d="M8 22C24 22 36 14 48 11M112 22C96 22 84 14 72 11"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M28 19C33 14 40 13 45 16M92 19C87 14 80 13 75 16"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M60 2L66 11L60 20L54 11Z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="11" r="2.2" fill="currentColor" />
      <circle cx="42" cy="12" r="1.5" fill="currentColor" fillOpacity="0.65" />
      <circle cx="78" cy="12" r="1.5" fill="currentColor" fillOpacity="0.65" />
    </svg>
  );
}

/**
 * زخرفة ركنية عربية ناعمة للبطاقات والبوابات
 */
export function CornerRoseFiligree({
  position = 'top-left',
  color = '#D6286C',
  insetFrame = false,
  className = '',
}: {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  color?: string;
  insetFrame?: boolean;
  className?: string;
}) {
  const posClass = insetFrame
    ? position === 'top-right'
      ? 'top-3.5 right-3.5'
      : position === 'top-left'
        ? 'top-3.5 left-3.5 -scale-x-100'
        : position === 'bottom-right'
          ? 'bottom-3.5 right-3.5 -scale-y-100'
          : 'bottom-3.5 left-3.5 -scale-x-100 -scale-y-100'
    : position === 'top-right'
      ? 'top-1.5 right-1.5'
      : position === 'top-left'
        ? 'top-1.5 left-1.5 -scale-x-100'
        : position === 'bottom-right'
          ? 'bottom-1.5 right-1.5 -scale-y-100'
          : 'bottom-1.5 left-1.5 -scale-x-100 -scale-y-100';

  return (
    <svg
      viewBox="0 0 42 42"
      aria-hidden="true"
      style={{ color }}
      className={`pointer-events-none absolute w-5 h-5 opacity-40 ${posClass} ${className}`}
    >
      <path
        d="M38 4H16C9.4 4 4 9.4 4 16V38"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M32 9H17C12.6 9 9 12.6 9 17V32"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="0.9"
        strokeDasharray="2 3"
      />
      <path
        d="M11 6L13.5 11L11 16L8.5 11Z"
        fill="currentColor"
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="0.9"
      />
      <circle cx="11" cy="11" r="1.4" fill="currentColor" />
    </svg>
  );
}

/**
 * أيقونة الرمز الهندسي الخاص بكل عالم
 */
export function RealmMotifIcon({
  motif,
  className = 'w-4 h-4',
}: {
  motif: RealmMotif;
  className?: string;
}) {
  if (motif === 'crescent') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M14.5 4.2C10.1 4.9 6.8 8.7 6.8 13.2C6.8 17.7 10.1 21.5 14.5 22.2C11.4 22.7 8.1 21.3 6.1 18.4C4.1 15.5 4.2 11.4 6.4 8.6C8.5 5.9 11.7 4.4 14.5 4.2Z"
          fill="currentColor"
          fillOpacity="0.22"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="16.5" cy="8.5" r="1.4" fill="currentColor" />
      </svg>
    );
  }
  if (motif === 'orb') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="7.5"
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M4.5 16.5C8 8 16 16 19.5 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 4.5L14.2 9.8L19.5 12L14.2 14.2L12 19.5L9.8 14.2L4.5 12L9.8 9.8Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
    </svg>
  );
}

/**
 * أيقونة بتلة وهمسة مخصصة لهوية «ليالي الورد» بديلاً عن الأيقونات العامة
 */
export function WhisperPetalIcon({
  className = 'w-4 h-4',
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3.2C15.8 6.4 17.6 11 15.8 15.6C14.6 18.6 12 20.4 12 20.4C12 20.4 9.4 18.6 8.2 15.6C6.4 11 8.2 6.4 12 3.2Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M18.2 6.2L19.1 8.1L21 9L19.1 9.9L18.2 11.8L17.3 9.9L15.4 9L17.3 8.1Z"
        fill="currentColor"
      />
      <circle cx="6.2" cy="16.4" r="1.15" fill="currentColor" fillOpacity="0.7" />
    </svg>
  );
}

/**
 * نجمة وردية زخرفية مصغّرة للاستخدام داخل شارات التنبيه اللطيفة
 */
export function RoseStarOrnament({
  color,
  className = 'w-3.5 h-3.5',
}: {
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 18 18"
      className={`shrink-0 ${className}`}
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      <path
        d="M9 1.5L10.8 7.2L16.5 9L10.8 10.8L9 16.5L7.2 10.8L1.5 9L7.2 7.2Z"
        fill="#FFE0D4"
        fillOpacity="0.85"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
    </svg>
  );
}

/**
 * طبقة بتلات وردية ولمعان لطيف في الخلفية (تتحول/تختفي تلقائياً عند تعطيل الحركة)
 */
const PETAL_MOTES = [
  { top: '12%', right: '14%', dur: '10s', delay: '0s', size: 12, color: '#E84888' },
  { top: '24%', left: '10%', dur: '12s', delay: '1.8s', size: 10, color: '#D6286C' },
  { top: '42%', right: '7%', dur: '11s', delay: '3.2s', size: 11, color: '#F06A9E' },
  { top: '58%', left: '14%', dur: '9.5s', delay: '0.9s', size: 13, color: '#D6286C' },
  { top: '74%', right: '18%', dur: '13s', delay: '2.5s', size: 9, color: '#E84888' },
];

const SPARKLE_MOTES = [
  { top: '18%', left: '22%', dur: '4.4s', delay: '0.2s', size: 11 },
  { top: '34%', right: '18%', dur: '3.8s', delay: '1.1s', size: 9 },
  { top: '72%', left: '6%', dur: '4.8s', delay: '2.0s', size: 9 },
  { top: '68%', right: '11%', dur: '4.0s', delay: '0.7s', size: 12 },
  { top: '82%', left: '28%', dur: '5.1s', delay: '1.5s', size: 9 },
];

export function RoseAtmosphere({
  accentHex = '#D6286C',
  motionEnabled = true,
}: {
  accentHex?: string;
  motionEnabled?: boolean;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {PETAL_MOTES.map((p, idx) => (
        <svg
          key={`petal-${idx}`}
          viewBox="0 0 20 20"
          className={`absolute ${motionEnabled ? 'ad-anim-petal' : 'opacity-30'}`}
          style={
            {
              top: p.top,
              right: p.right,
              left: p.left,
              width: p.size,
              height: p.size,
              '--petal-dur': p.dur,
              '--petal-delay': p.delay,
            } as React.CSSProperties
          }
        >
          <path
            d="M10 2C14.5 5 16.5 10.5 13 15.5C10.8 18.5 7.5 18.2 5.8 15.5C3.5 11.8 5.2 5.5 10 2Z"
            fill={p.color}
            fillOpacity="0.28"
          />
        </svg>
      ))}

      {SPARKLE_MOTES.map((s, idx) => (
        <svg
          key={`sparkle-${idx}`}
          viewBox="0 0 18 18"
          className={`absolute ${motionEnabled ? 'ad-anim-twinkle' : 'opacity-25'}`}
          style={
            {
              top: s.top,
              right: s.right,
              left: s.left,
              width: s.size,
              height: s.size,
              color: accentHex,
              '--twinkle-dur': s.dur,
              '--twinkle-delay': s.delay,
            } as React.CSSProperties
          }
        >
          <path
            d="M9 1L10.8 7.2L17 9L10.8 10.8L9 17L7.2 10.8L1 9L7.2 7.2Z"
            fill="currentColor"
            fillOpacity="0.45"
          />
        </svg>
      ))}
    </div>
  );
}

/**
 * شعارات زخرفية متدرجة لمستويات الجرأة الثلاثة:
 * 0: برعم ناعم وهلال (جرأة هادئة)
 * 1: توأم بتلات ونجمة (جرأة متوسطة)
 * 2: وردة متفتحة مشعّة (جرأة عالية)
 */
export function BoldnessTierEmblem({
  tier,
  className = 'w-6 h-6',
}: {
  tier: 0 | 1 | 2;
  className?: string;
}) {
  if (tier === 0) {
    return (
      <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
        <path
          d="M14 5C17.6 8.2 19 12.2 17.4 16.2C16.3 18.8 14 20.5 14 20.5C14 20.5 11.7 18.8 10.6 16.2C9 12.2 10.4 8.2 14 5Z"
          fill="currentColor"
          fillOpacity="0.18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 15.5C9.5 16.2 11.5 18 14 21.5C16.5 18 18.5 16.2 20.5 15.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="11.5" r="1.4" fill="currentColor" />
      </svg>
    );
  }

  if (tier === 1) {
    return (
      <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
        <path
          d="M14 4.5C16.8 7.5 17.5 11.2 15.8 14.5C14.8 16.4 14 17.5 14 17.5C14 17.5 13.2 16.4 12.2 14.5C10.5 11.2 11.2 7.5 14 4.5Z"
          fill="currentColor"
          fillOpacity="0.22"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 10.5C10 10.8 12.6 13.2 13.8 17.8C10.2 17.5 7.4 14.8 6.5 10.5Z"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M21.5 10.5C18 10.8 15.4 13.2 14.2 17.8C17.8 17.5 20.6 14.8 21.5 10.5Z"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M14 20.5L15.2 22.8L17.5 24L15.2 25.2L14 27.5L12.8 25.2L10.5 24L12.8 22.8Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <path
        d="M14 2.8L16.3 9.2L22.6 7.4L18.8 12.8L25.2 14L18.8 15.2L22.6 20.6L16.3 18.8L14 25.2L11.7 18.8L5.4 20.6L9.2 15.2L2.8 14L9.2 12.8L5.4 7.4L11.7 9.2Z"
        fill="currentColor"
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="14" r="3.4" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="14" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
}

/**
 * بتلة ورد مصمّمة بتدرّجات لؤلؤية ووردية للتأثيرات التفاعلية حول الختم الملكي
 */
export function RosePetalGraphic({
  idSuffix,
  palette = 'rose',
  variant = 0,
  className = 'w-full h-full',
  rimHighlight = true,
}: {
  idSuffix: string | number;
  palette?: 'blush' | 'rose' | 'crimson';
  variant?: 0 | 1 | 2;
  className?: string;
  rimHighlight?: boolean;
}) {
  const gradId = `rf-petal-grad-${idSuffix}`;
  const stops =
    palette === 'blush'
      ? { start: '#FFF6FA', mid: '#FFA8CA', end: '#E84D88' }
      : palette === 'crimson'
        ? { start: '#FFE0EC', mid: '#F05B95', end: '#B41F5E' }
        : { start: '#FFEDF4', mid: '#FF86B4', end: '#D6286C' };

  const rimProps = rimHighlight
    ? { stroke: '#FFF7FA', strokeOpacity: 0.78, strokeWidth: 0.85 }
    : {};

  return (
    <svg
      viewBox="0 0 28 32"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradId} cx="34%" cy="26%" r="78%">
          <stop offset="0%" stopColor={stops.start} />
          <stop offset="56%" stopColor={stops.mid} />
          <stop offset="100%" stopColor={stops.end} />
        </radialGradient>
      </defs>
      {variant === 0 && (
        <>
          <path
            d="M14.5 2.5C20.5 5.4 25.2 12.2 22.8 19.6C20.9 25.4 15.8 29.5 11.2 28.8C6.6 28.1 3.4 23.2 4.3 16.6C5.1 10.6 9.3 5.2 14.5 2.5Z"
            fill={`url(#${gradId})`}
            {...rimProps}
          />
          <path
            d="M14.2 5.4C14.8 11.4 13.7 19.5 11.6 25.6"
            fill="none"
            stroke="#FFF5F9"
            strokeOpacity="0.46"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </>
      )}
      {variant === 1 && (
        <>
          <path
            d="M13.2 2.8C18.8 3.9 24.4 9.8 23.6 17.2C22.9 23.4 17.5 28.9 12.6 28.6C7.8 28.3 4.8 22.8 6.4 15.4C7.6 9.8 9.6 5.6 13.2 2.8Z"
            fill={`url(#${gradId})`}
            {...rimProps}
          />
          <path
            d="M13.6 6.2C15.1 12.5 14.4 19.8 12.8 25.2"
            fill="none"
            stroke="#FFF5F9"
            strokeOpacity="0.44"
            strokeWidth="0.85"
            strokeLinecap="round"
          />
        </>
      )}
      {variant === 2 && (
        <>
          <path
            d="M14 4.8C16.2 2.1 21.8 3.2 23.5 8.8C25.2 14.4 21.5 24.8 14.2 28.9C7.4 25.6 4.2 16.4 5.5 9.8C6.6 4.2 11.6 2.3 14 4.8Z"
            fill={`url(#${gradId})`}
            {...rimProps}
          />
          <path
            d="M14 7.2C14.4 13.4 14.2 20.1 14.1 25.8"
            fill="none"
            stroke="#FFF5F9"
            strokeOpacity="0.46"
            strokeWidth="0.85"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

const ROYAL_SEAL_BURST_PETALS: Array<{
  startX: string;
  startY: string;
  bx: string;
  by: string;
  br: string;
  size: number;
  delay: string;
  palette: 'blush' | 'rose' | 'crimson';
}> = [
  { startX: '-20px', startY: '-18px', bx: '-42px', by: '-58px', br: '-46deg', size: 14, delay: '0ms', palette: 'rose' },
  { startX: '-4px', startY: '-26px', bx: '-12px', by: '-74px', br: '-16deg', size: 15, delay: '20ms', palette: 'blush' },
  { startX: '10px', startY: '-24px', bx: '22px', by: '-70px', br: '24deg', size: 14, delay: '35ms', palette: 'crimson' },
  { startX: '24px', startY: '-12px', bx: '56px', by: '-44px', br: '62deg', size: 13, delay: '50ms', palette: 'rose' },
  { startX: '-28px', startY: '2px', bx: '-60px', by: '-22px', br: '-68deg', size: 12, delay: '45ms', palette: 'blush' },
  { startX: '26px', startY: '8px', bx: '58px', by: '-8px', br: '84deg', size: 12, delay: '65ms', palette: 'blush' },
  { startX: '-16px', startY: '18px', bx: '-36px', by: '26px', br: '-105deg', size: 11, delay: '70ms', palette: 'crimson' },
  { startX: '14px', startY: '18px', bx: '38px', by: '24px', br: '112deg', size: 11, delay: '80ms', palette: 'rose' },
];

/**
 * ختم ملكي عائم وبارز أسفل القصاصة الفنية للانتقال للسؤال التالي مع هالة وتناثر بتلات ورود
 */
export function RoyalRoseSealButton({
  label,
  accentHex = '#D6286C',
  darkMode = false,
  disabled = false,
  isBursting = false,
  burstId = 0,
  motionEnabled = true,
  onPress,
}: {
  label: string;
  accentHex?: string;
  darkMode?: boolean;
  disabled?: boolean;
  isBursting?: boolean;
  burstId?: number;
  motionEnabled?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      aria-label={label}
      className="group relative flex flex-col items-center justify-center py-0.5 px-3 select-none cursor-pointer focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div
        className={`relative w-14 h-14 flex items-center justify-center ${
          motionEnabled && !isBursting ? 'ad-seal-float' : ''
        }`}
      >
        {/* هالة وردية دافئة نابضة خلف الختم */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-2 rounded-full ${
            motionEnabled ? 'ad-seal-aura' : 'opacity-65'
          }`}
          style={{
            background: `radial-gradient(circle, rgba(255,156,196,0.62) 0%, ${accentHex}2B 54%, transparent 78%)`,
          }}
        />

        {/* بتلتان هادئتان تزيّنان جانبي الختم الملكي */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 w-3.5 h-4 rotate-[28deg] opacity-80 ${
            motionEnabled ? 'ad-anim-petal' : ''
          }`}
          style={{ '--petal-dur': '7s', '--petal-delay': '0s' } as React.CSSProperties}
        >
          <RosePetalGraphic idSuffix="seal-side-r" palette="blush" variant={0} />
        </span>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -left-4 top-1/2 -translate-y-1/2 w-3.5 h-4 -rotate-[28deg] opacity-80 ${
            motionEnabled ? 'ad-anim-petal' : ''
          }`}
          style={{ '--petal-dur': '7.6s', '--petal-delay': '1.2s' } as React.CSSProperties}
        >
          <RosePetalGraphic idSuffix="seal-side-l" palette="rose" variant={2} />
        </span>

        {/* ختم الوردة الملكية بحجمه الأصلي (56×56) مع بروز مجسّم */}
        <span
          className={`relative z-10 w-full h-full rounded-full flex items-center justify-center transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out group-focus-visible:outline-2 group-focus-visible:outline-offset-3 ${
            darkMode
              ? 'bg-gradient-to-br from-[#FFF9FB] via-[#FFE6F0] to-[#FFC2DA] ring-4 ring-[#FF88B6]/28 group-focus-visible:outline-[#FFD1E3]'
              : 'bg-gradient-to-br from-white via-[#FFF5F9] to-[#FFDBEA] ring-4 ring-white/65 group-focus-visible:outline-[#D6286C]'
          } ${
            isBursting
              ? 'scale-[1.1] border-[1.75px] shadow-[0_16px_34px_rgba(214,40,108,0.4),0_0_0_5px_rgba(255,196,220,0.65)]'
              : 'border-[1.5px] shadow-[0_14px_28px_rgba(180,26,90,0.32),0_4px_10px_rgba(214,40,108,0.2),inset_0_2px_2px_rgba(255,255,255,0.98),inset_0_-2px_5px_rgba(214,40,108,0.16)] group-hover:scale-[1.07] group-active:scale-[0.91]'
          }`}
          style={{ borderColor: accentHex }}
        >
          <svg
            viewBox="0 0 44 44"
            className="w-9 h-9 overflow-visible drop-shadow-[0_1px_1px_rgba(180,26,90,0.16)]"
            style={{ color: accentHex }}
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="royalNextSealRose" cx="40%" cy="35%" r="68%">
                <stop offset="0%" stopColor="#FFF9FB" />
                <stop offset="54%" stopColor="#FF9EC4" />
                <stop offset="100%" stopColor={accentHex} />
              </radialGradient>
            </defs>

            {/* حلقة دانتيل منقطة تدور بنعومة */}
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.48"
              strokeWidth="1.05"
              strokeDasharray="2 3"
              style={{ transformOrigin: '22px 22px' }}
              className={motionEnabled ? 'ad-seal-orbit' : ''}
            />

            {/* بتلات الوردة الملكية الثمانية */}
            <g
              style={{
                transformOrigin: '22px 22px',
                transform: isBursting ? 'rotate(90deg) scale(1.12)' : 'rotate(0deg) scale(1)',
              }}
              className="transition-transform duration-450 ease-out group-hover:scale-[1.06]"
            >
              {/* 4 بتلات خلفية مائلة ٤٥ درجة */}
              <path
                d="M22 8.8 C25.6 10.6 26.8 15 23.6 18.8 C27.4 15.6 31.8 16.8 33.6 20.4 C31.8 24.4 27.6 25.8 23.8 22.8 C26.8 26.6 25.4 30.8 21.8 33.2 C18.4 30.8 17 26.6 20 22.8 C16.2 25.8 12 24.4 10.2 20.4 C12 16.8 16.4 15.6 20.2 18.8 C17 15 18.2 10.6 22 8.8Z"
                fill="url(#royalNextSealRose)"
                fillOpacity="0.34"
                stroke="currentColor"
                strokeOpacity="0.52"
                strokeWidth="0.9"
                transform="rotate(45 22 22)"
              />
              {/* 4 بتلات رئيسية متقابلة */}
              <path
                d="M22 8.6 C26.8 8.6 29.6 13.4 25.6 17.6 C29.8 13.6 34.6 16.4 34.6 21.2 C34.6 26 29.8 28.8 25.6 24.8 C29.6 29 26.8 33.8 22 33.8 C17.2 33.8 14.4 29 18.4 24.8 C14.2 28.8 9.4 26 9.4 21.2 C9.4 16.4 14.2 13.6 18.4 17.6 C14.4 13.4 17.2 8.6 22 8.6Z"
                fill="url(#royalNextSealRose)"
                fillOpacity="0.62"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </g>

            {/* قلب الختم — سهم رقيق ثابت الاتجاه يشير للتالي داخل جوهرة الوردة */}
            <g className="transition-transform duration-300 ease-out group-hover:-translate-x-0.5">
              <circle
                cx="22"
                cy="21.4"
                r="5.6"
                fill="#FFF8FB"
                stroke="currentColor"
                strokeWidth="1.15"
              />
              <path
                d="M23.4 18.9L20.3 21.4L23.4 23.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </span>

        {/* موجات توهّج وتناثر بتلات ورود حقيقية عند الضغط على الختم */}
        {motionEnabled && burstId > 0 && (
          <div
            key={burstId}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20"
          >
            <span
              className="absolute inset-0 rounded-full border-2 ad-seal-ripple"
              style={{
                borderColor: '#FF88B6',
                boxShadow: '0 0 18px rgba(255, 136, 182, 0.72)',
              }}
            />
            <span
              className="absolute inset-1 rounded-full border border-[#FFF4ED]/95 ad-seal-ripple"
              style={{ animationDelay: '85ms' }}
            />
            {ROYAL_SEAL_BURST_PETALS.map((item, idx) => (
              <span
                key={idx}
                className="absolute top-1/2 left-1/2 ad-seal-burst-petal"
                style={
                  {
                    marginLeft: item.startX,
                    marginTop: item.startY,
                    width: item.size,
                    height: Math.round(item.size * 1.15),
                    animationDelay: item.delay,
                    '--bx': item.bx,
                    '--by': item.by,
                    '--br': item.br,
                  } as React.CSSProperties
                }
              >
                <RosePetalGraphic
                  idSuffix={`royal-next-burst-${burstId}-${idx}`}
                  palette={item.palette}
                  variant={(idx % 3) as 0 | 1 | 2}
                  rimHighlight
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ظل أرضي ناعم ووسم واضح لإجراء الختم */}
      <span
        aria-hidden="true"
        className={`pointer-events-none mt-1 w-9 h-1.5 rounded-full blur-[3px] ${
          motionEnabled && !isBursting ? 'ad-seal-shadow-float' : 'opacity-30'
        }`}
        style={{ backgroundColor: darkMode ? '#FF88B6' : accentHex }}
      />
      <span
        className={`mt-1 text-[11.5px] font-bold leading-none ${
          darkMode ? 'text-[#FFE8F1]' : 'text-[#360D21]'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

interface CenterScatterPetal {
  px: string;
  py: string;
  pr: string;
  size: number;
  dur: string;
  delay: string;
  palette: 'blush' | 'rose' | 'crimson';
  variant: 0 | 1 | 2;
}

const QISSASA_CENTER_PETALS: CenterScatterPetal[] = [
  { px: '-148px', py: '-184px', pr: '-72deg', size: 22, dur: '2.35s', delay: '0ms', palette: 'rose', variant: 0 },
  { px: '-62px', py: '-214px', pr: '-28deg', size: 18, dur: '2.45s', delay: '80ms', palette: 'blush', variant: 2 },
  { px: '52px', py: '-218px', pr: '36deg', size: 21, dur: '2.4s', delay: '50ms', palette: 'crimson', variant: 1 },
  { px: '148px', py: '-172px', pr: '78deg', size: 19, dur: '2.5s', delay: '110ms', palette: 'rose', variant: 0 },
  { px: '176px', py: '-64px', pr: '112deg', size: 17, dur: '2.3s', delay: '140ms', palette: 'blush', variant: 2 },
  { px: '172px', py: '60px', pr: '140deg', size: 21, dur: '2.55s', delay: '90ms', palette: 'rose', variant: 1 },
  { px: '132px', py: '168px', pr: '172deg', size: 18, dur: '2.45s', delay: '160ms', palette: 'crimson', variant: 0 },
  { px: '40px', py: '204px', pr: '146deg', size: 19, dur: '2.5s', delay: '130ms', palette: 'blush', variant: 2 },
  { px: '-58px', py: '200px', pr: '-152deg', size: 20, dur: '2.4s', delay: '100ms', palette: 'rose', variant: 1 },
  { px: '-144px', py: '160px', pr: '-122deg', size: 17, dur: '2.55s', delay: '170ms', palette: 'blush', variant: 0 },
  { px: '-178px', py: '48px', pr: '-100deg', size: 21, dur: '2.35s', delay: '60ms', palette: 'crimson', variant: 2 },
  { px: '-172px', py: '-70px', pr: '-62deg', size: 18, dur: '2.48s', delay: '150ms', palette: 'blush', variant: 1 },
  { px: '-94px', py: '-124px', pr: '-44deg', size: 15, dur: '2.15s', delay: '220ms', palette: 'crimson', variant: 0 },
  { px: '102px', py: '-116px', pr: '48deg', size: 16, dur: '2.2s', delay: '240ms', palette: 'blush', variant: 2 },
  { px: '104px', py: '106px', pr: '128deg', size: 15, dur: '2.25s', delay: '260ms', palette: 'rose', variant: 1 },
  { px: '-98px', py: '112px', pr: '-132deg', size: 16, dur: '2.22s', delay: '230ms', palette: 'rose', variant: 0 },
  { px: '0px', py: '-156px', pr: '18deg', size: 15, dur: '2.3s', delay: '280ms', palette: 'blush', variant: 1 },
  { px: '0px', py: '152px', pr: '-22deg', size: 15, dur: '2.35s', delay: '300ms', palette: 'crimson', variant: 2 },
];

const TRANSITION_BREEZE_PETALS: CenterScatterPetal[] = [
  { px: '-132px', py: '-138px', pr: '-52deg', size: 18, dur: '1.6s', delay: '0ms', palette: 'blush', variant: 0 },
  { px: '126px', py: '-142px', pr: '56deg', size: 17, dur: '1.68s', delay: '50ms', palette: 'rose', variant: 2 },
  { px: '154px', py: '30px', pr: '92deg', size: 16, dur: '1.58s', delay: '90ms', palette: 'blush', variant: 1 },
  { px: '-148px', py: '38px', pr: '-82deg', size: 17, dur: '1.7s', delay: '70ms', palette: 'crimson', variant: 0 },
  { px: '64px', py: '146px', pr: '136deg', size: 16, dur: '1.72s', delay: '110ms', palette: 'rose', variant: 2 },
  { px: '-70px', py: '140px', pr: '-128deg', size: 18, dur: '1.65s', delay: '80ms', palette: 'blush', variant: 1 },
  { px: '88px', py: '-64px', pr: '42deg', size: 14, dur: '1.55s', delay: '130ms', palette: 'crimson', variant: 1 },
  { px: '-92px', py: '-58px', pr: '-40deg', size: 14, dur: '1.58s', delay: '140ms', palette: 'rose', variant: 0 },
];

const CENTER_SPARKLES = [
  { px: '-82px', py: '-76px', pr: '45deg', size: 12, dur: '1.9s', delay: '80ms' },
  { px: '84px', py: '-70px', pr: '-45deg', size: 13, dur: '2.0s', delay: '140ms' },
  { px: '78px', py: '82px', pr: '60deg', size: 11, dur: '2.05s', delay: '190ms' },
  { px: '-76px', py: '86px', pr: '-60deg', size: 12, dur: '1.95s', delay: '160ms' },
];

/**
 * طبقة نثر ورد وهالة مضيئة تنبثق ببطء من وسط الشاشة بالتزامن مع ظهور القصاصة أو الانتقال الحريري
 */
export function CenterRoseScatterOverlay({
  scatterKey,
  variant = 'qissasa',
  accentHex = '#D6286C',
  zIndexClass,
}: {
  scatterKey: number;
  variant?: 'qissasa' | 'transition';
  accentHex?: string;
  zIndexClass?: string;
}) {
  if (!scatterKey) return null;

  const petals = variant === 'qissasa' ? QISSASA_CENTER_PETALS : TRANSITION_BREEZE_PETALS;
  const resolvedZ = zIndexClass ?? (variant === 'qissasa' ? 'z-[5]' : 'z-20');

  return (
    <div
      key={`${variant}-${scatterKey}`}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${resolvedZ} flex items-center justify-center overflow-hidden`}
    >
      {/* هالة وردية دافئة تتّسع ببطء من قلب الشاشة */}
      <div
        className="w-72 h-72 rounded-full ad-anim-center-aura"
        style={{
          background:
            variant === 'qissasa'
              ? `radial-gradient(circle, rgba(255,214,230,0.92) 0%, ${accentHex}33 44%, transparent 74%)`
              : `radial-gradient(circle, rgba(255,224,236,0.72) 0%, ${accentHex}22 48%, transparent 74%)`,
        }}
      />

      {/* حلقتا ضوء رقيقتان تتسعان مع تفتّح الورد */}
      {variant === 'qissasa' && (
        <>
          <span
            className="absolute w-36 h-36 rounded-full border border-[#F59EC2]/80 ad-anim-center-aura"
            style={{ animationDelay: '90ms' }}
          />
          <span
            className="absolute w-24 h-24 rounded-full border border-[#FFF5EE]/90 ad-anim-center-aura"
            style={{ animationDelay: '220ms' }}
          />
        </>
      )}

      {/* بريق نجوم لؤلؤية متناثرة من القلب */}
      {CENTER_SPARKLES.map((sp, idx) => (
        <svg
          key={`sp-${idx}`}
          viewBox="0 0 18 18"
          className="absolute ad-anim-center-petal"
          style={
            {
              width: sp.size,
              height: sp.size,
              color: accentHex,
              '--px': sp.px,
              '--py': sp.py,
              '--pr': sp.pr,
              '--p-dur': sp.dur,
              '--p-delay': sp.delay,
            } as React.CSSProperties
          }
        >
          <path
            d="M9 1L10.8 7.2L17 9L10.8 10.8L9 17L7.2 10.8L1 9L7.2 7.2Z"
            fill="#FFF7FA"
            stroke="currentColor"
            strokeOpacity="0.65"
            strokeWidth="0.7"
          />
        </svg>
      ))}

      {/* بتلات الورد المتناثرة ببطء من وسط الشاشة */}
      {petals.map((petal, idx) => (
        <span
          key={idx}
          className="absolute ad-anim-center-petal"
          style={
            {
              width: petal.size,
              height: Math.round(petal.size * 1.18),
              '--px': petal.px,
              '--py': petal.py,
              '--pr': petal.pr,
              '--p-dur': petal.dur,
              '--p-delay': petal.delay,
            } as React.CSSProperties
          }
        >
          <RosePetalGraphic
            idSuffix={`center-scatter-${scatterKey}-${idx}`}
            palette={petal.palette}
            variant={petal.variant}
            rimHighlight
          />
        </span>
      ))}
    </div>
  );
}

