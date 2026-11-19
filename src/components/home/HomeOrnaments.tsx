import React, { useEffect, useRef, useState } from 'react';
import { RoseStarOrnament } from '../RoseFiligree';

interface FallingPetalSpec {
  id: number;
  left: string;
  size: number;
  dur: string;
  delay: string;
  opacity: number;
  anim: 'ad-home-petal-a' | 'ad-home-petal-b' | 'ad-home-petal-c';
  palette: 'blush' | 'rose' | 'crimson';
  variant: 0 | 1 | 2;
  layer: 'mid' | 'edge';
}

const HOME_FALLING_PETALS: FallingPetalSpec[] = [
  { id: 1, left: '2.5%', size: 17, dur: '9.4s', delay: '-1.3s', opacity: 0.78, anim: 'ad-home-petal-a', palette: 'rose', variant: 0, layer: 'edge' },
  { id: 2, left: '92.5%', size: 18, dur: '10.2s', delay: '-2.2s', opacity: 0.76, anim: 'ad-home-petal-b', palette: 'rose', variant: 2, layer: 'edge' },
  { id: 3, left: '4.5%', size: 14, dur: '11.8s', delay: '-6.5s', opacity: 0.62, anim: 'ad-home-petal-c', palette: 'blush', variant: 1, layer: 'edge' },
  { id: 4, left: '90.5%', size: 15, dur: '12.2s', delay: '-8.9s', opacity: 0.64, anim: 'ad-home-petal-a', palette: 'blush', variant: 0, layer: 'edge' },
  { id: 5, left: '16%', size: 16, dur: '10.6s', delay: '-3.8s', opacity: 0.68, anim: 'ad-home-petal-b', palette: 'blush', variant: 2, layer: 'mid' },
  { id: 6, left: '27%', size: 19, dur: '9.6s', delay: '-1.9s', opacity: 0.72, anim: 'ad-home-petal-c', palette: 'rose', variant: 0, layer: 'mid' },
  { id: 7, left: '38%', size: 15, dur: '12.1s', delay: '-7.4s', opacity: 0.6, anim: 'ad-home-petal-a', palette: 'crimson', variant: 1, layer: 'mid' },
  { id: 8, left: '49%', size: 17, dur: '8.9s', delay: '-4.2s', opacity: 0.66, anim: 'ad-home-petal-b', palette: 'blush', variant: 2, layer: 'mid' },
  { id: 9, left: '61%', size: 14, dur: '11.1s', delay: '-5.6s', opacity: 0.62, anim: 'ad-home-petal-c', palette: 'rose', variant: 1, layer: 'mid' },
  { id: 10, left: '72%', size: 18, dur: '9.3s', delay: '-0.7s', opacity: 0.7, anim: 'ad-home-petal-a', palette: 'rose', variant: 0, layer: 'mid' },
  { id: 11, left: '82%', size: 15, dur: '11.6s', delay: '-9.4s', opacity: 0.65, anim: 'ad-home-petal-b', palette: 'crimson', variant: 2, layer: 'mid' },
  { id: 12, left: '54%', size: 13, dur: '12.9s', delay: '-10.5s', opacity: 0.56, anim: 'ad-home-petal-c', palette: 'blush', variant: 1, layer: 'mid' },
];

const STATIC_HOME_PETALS = [
  { top: '44px', left: '12%', size: 16, rotate: '-20deg', palette: 'rose' as const, variant: 0 as const },
  { top: '52px', right: '13%', size: 15, rotate: '26deg', palette: 'blush' as const, variant: 2 as const },
  { top: '148px', left: '6%', size: 14, rotate: '-36deg', palette: 'crimson' as const, variant: 1 as const },
  { top: '176px', right: '7%', size: 16, rotate: '18deg', palette: 'rose' as const, variant: 0 as const },
];

function HomeRosePetalGraphic({
  idSuffix,
  palette,
  variant,
  className = 'w-full h-full',
  rimHighlight = false,
}: {
  idSuffix: string | number;
  palette: 'blush' | 'rose' | 'crimson';
  variant: 0 | 1 | 2;
  className?: string;
  rimHighlight?: boolean;
}) {
  const gradId = `home-petal-grad-${idSuffix}`;
  const stops =
    palette === 'blush'
      ? { start: '#FFF4F8', mid: '#FFA9CC', end: '#E84D88' }
      : palette === 'crimson'
        ? { start: '#FFDCEB', mid: '#F05B95', end: '#B41F5E' }
        : { start: '#FFEBF2', mid: '#FF88B6', end: '#D6286C' };

  const rimProps = rimHighlight
    ? { stroke: '#FFF7FA', strokeOpacity: 0.78, strokeWidth: 0.9 }
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
            strokeOpacity="0.48"
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
            strokeOpacity="0.45"
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

/**
 * تاج زخرفي وردي علوي بلفائف أرابيسك عضوية وتدرجات ذهب وردي ولؤلؤ حريري
 */
export function HomeTopCanopy() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden"
    >
      <svg
        viewBox="0 0 390 56"
        preserveAspectRatio="xMidYMin slice"
        className="w-full h-[56px] drop-shadow-[0_1px_5px_rgba(32,6,18,0.52)]"
      >
        <defs>
          <linearGradient id="homeRoseGoldStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFC9DE" stopOpacity="0.62" />
            <stop offset="22%" stopColor="#FFF7EE" stopOpacity="0.88" />
            <stop offset="50%" stopColor="#FFE0D4" stopOpacity="0.98" />
            <stop offset="78%" stopColor="#FFF7EE" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#FFC9DE" stopOpacity="0.62" />
          </linearGradient>

          <linearGradient id="homeArabesqueSoft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF8FB" stopOpacity="0.46" />
            <stop offset="55%" stopColor="#FFC8DE" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FFE5D8" stopOpacity="0.18" />
          </linearGradient>

          <radialGradient id="homeRosetteFill" cx="42%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFF9FB" stopOpacity="0.96" />
            <stop offset="55%" stopColor="#FFB7D2" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#E24A86" stopOpacity="0.58" />
          </radialGradient>

          <radialGradient id="homePearlDrop" cx="38%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="52%" stopColor="#FFF2EA" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#F8BFD5" stopOpacity="0.84" />
          </radialGradient>
        </defs>

        <path
          d="M18 6.5 Q62 14 107 7.5 Q151 2 195 11 Q239 2 283 7.5 Q328 14 372 6.5"
          fill="none"
          stroke="url(#homeRoseGoldStroke)"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <path
          d="M52 5.5 Q88 10.5 126 5.5 M264 5.5 Q302 10.5 338 5.5"
          fill="none"
          stroke="#FFF4EB"
          strokeOpacity="0.46"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="1.8 3.6"
        />

        <g opacity="0.92">
          <path
            d="M20 6.5 C40 6 58 10.5 72 17.5 C84 23 97 20 97 13 C97 8.5 90 7.5 87 11 C85 14 88 16.5 91 15.5"
            fill="none"
            stroke="url(#homeRoseGoldStroke)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path
            d="M52 9.5 C44 13.5 38 19 34 23.5 C43 22.5 51 18.5 56 12 Z"
            fill="url(#homeArabesqueSoft)"
            stroke="#FFF2EC"
            strokeOpacity="0.62"
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
          <path
            d="M33 8.5 C30 4.5 35 2.5 39 5.5 C43 2.5 48 4.5 45 8.5 C42 12.5 36 12.5 33 8.5Z"
            fill="url(#homeRosetteFill)"
            stroke="#FFF4EE"
            strokeOpacity="0.72"
            strokeWidth="0.75"
          />
          <circle cx="39" cy="8" r="1.4" fill="url(#homePearlDrop)" />
          <circle cx="64" cy="16" r="1.35" fill="url(#homePearlDrop)" opacity="0.85" />
          <circle cx="107" cy="10" r="1.15" fill="#FFF3EE" fillOpacity="0.76" />
        </g>

        <g opacity="0.92">
          <path
            d="M370 6.5 C350 6 332 10.5 318 17.5 C306 23 293 20 293 13 C293 8.5 300 7.5 303 11 C305 14 302 16.5 299 15.5"
            fill="none"
            stroke="url(#homeRoseGoldStroke)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path
            d="M338 9.5 C346 13.5 352 19 356 23.5 C347 22.5 339 18.5 334 12 Z"
            fill="url(#homeArabesqueSoft)"
            stroke="#FFF2EC"
            strokeOpacity="0.62"
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
          <path
            d="M357 8.5 C360 4.5 355 2.5 351 5.5 C347 2.5 342 4.5 345 8.5 C348 12.5 354 12.5 357 8.5Z"
            fill="url(#homeRosetteFill)"
            stroke="#FFF4EE"
            strokeOpacity="0.72"
            strokeWidth="0.75"
          />
          <circle cx="351" cy="8" r="1.4" fill="url(#homePearlDrop)" />
          <circle cx="326" cy="16" r="1.35" fill="url(#homePearlDrop)" opacity="0.85" />
          <circle cx="283" cy="10" r="1.15" fill="#FFF3EE" fillOpacity="0.76" />
        </g>

        <g transform="translate(195, 11)">
          <path
            d="M-126 2 C-84 18 -41 17 0 7.5 C41 17 84 18 126 2"
            fill="none"
            stroke="url(#homeRoseGoldStroke)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M-102 6 C-68 18 -34 17.5 0 11 C34 17.5 68 18 102 6"
            fill="none"
            stroke="#FFF4EC"
            strokeOpacity="0.46"
            strokeWidth="0.85"
            strokeLinecap="round"
            strokeDasharray="2 3.5"
          />
          <path
            d="M-32 12 C-25 6 -15 5.5 -9 10.5 C-15 14.5 -24 15 -32 12Z"
            fill="url(#homeArabesqueSoft)"
            stroke="#FFF1EB"
            strokeOpacity="0.74"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          <path
            d="M32 12 C25 6 15 5.5 9 10.5 C15 14.5 24 15 32 12Z"
            fill="url(#homeArabesqueSoft)"
            stroke="#FFF1EB"
            strokeOpacity="0.74"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          <path
            d="M-42 13.5 C-47 17 -54 16 -54 11.5 C-54 8.5 -49 8.5 -48 11"
            fill="none"
            stroke="url(#homeRoseGoldStroke)"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          <path
            d="M42 13.5 C47 17 54 16 54 11.5 C54 8.5 49 8.5 48 11"
            fill="none"
            stroke="url(#homeRoseGoldStroke)"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          <g transform="translate(0, 15.5)">
            <path
              d="M0 -6.4 C3.2 -6.4 5 -3.4 2.6 -0.7 C5.5 -2.6 7.8 0.2 5.1 3 C3.2 5.1 0.8 4 0 2.1 C-0.8 4 -3.2 5.1 -5.1 3 C-7.8 0.2 -5.5 -2.6 -2.6 -0.7 C-5 -3.4 -3.2 -6.4 0 -6.4Z"
              fill="url(#homeRosetteFill)"
              stroke="#FFF6F0"
              strokeOpacity="0.92"
              strokeWidth="0.95"
              strokeLinejoin="round"
            />
            <circle cx="0" cy="-0.9" r="2.1" fill="url(#homePearlDrop)" />
          </g>
          <line
            x1="0"
            y1="20.5"
            x2="0"
            y2="24.5"
            stroke="#FFF2EA"
            strokeOpacity="0.75"
            strokeWidth="0.95"
            strokeLinecap="round"
          />
          <path
            d="M0 24.4 C2.4 27.2 3 29.8 0 32 C-3 29.8 -2.4 27.2 0 24.4Z"
            fill="url(#homePearlDrop)"
            stroke="#FFF9F4"
            strokeOpacity="0.95"
            strokeWidth="0.85"
          />
          <circle cx="-68" cy="13.5" r="1.5" fill="url(#homePearlDrop)" opacity="0.9" />
          <circle cx="68" cy="13.5" r="1.5" fill="url(#homePearlDrop)" opacity="0.9" />
          <circle cx="-96" cy="8.8" r="1.2" fill="#FFF3EC" fillOpacity="0.74" />
          <circle cx="96" cy="8.8" r="1.2" fill="#FFF3EC" fillOpacity="0.74" />
        </g>
      </svg>
    </div>
  );
}

/**
 * طبقة بتلات الورد الناعمة المتساقطة من أعلى الشاشة الرئيسية
 */
export function HomeFallingPetals({
  motionEnabled,
  layer,
}: {
  motionEnabled: boolean;
  layer: 'mid' | 'edge';
}) {
  if (!motionEnabled) {
    if (layer === 'edge') return null;
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      >
        {STATIC_HOME_PETALS.map((p, idx) => (
          <div
            key={`static-home-petal-${idx}`}
            className="absolute opacity-60"
            style={{
              top: p.top,
              left: p.left,
              right: p.right,
              width: p.size,
              height: Math.round(p.size * 1.15),
              transform: `rotate(${p.rotate})`,
            }}
          >
            <HomeRosePetalGraphic
              idSuffix={`static-${idx}`}
              palette={p.palette}
              variant={p.variant}
            />
          </div>
        ))}
      </div>
    );
  }

  const petals = HOME_FALLING_PETALS.filter((p) => p.layer === layer);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${
        layer === 'edge' ? 'z-30' : 'z-[12]'
      }`}
    >
      {petals.map((p) => (
        <div
          key={p.id}
          className={`absolute top-0 ${p.anim}`}
          style={
            {
              left: p.left,
              width: p.size,
              height: Math.round(p.size * 1.15),
              '--petal-dur': p.dur,
              '--petal-delay': p.delay,
              '--petal-opacity': p.opacity,
            } as React.CSSProperties
          }
        >
          <HomeRosePetalGraphic idSuffix={p.id} palette={p.palette} variant={p.variant} />
        </div>
      ))}
    </div>
  );
}

/**
 * شارة وردية نباتية متناغمة مع الزخارف العلوية تتوّج اسم «ليالي الورد» في الشاشة الرئيسية
 */
export function HomeBrandCrest() {
  return (
    <div className="flex flex-col items-center text-center select-none">
      <svg viewBox="0 0 120 38" className="w-28 h-9 mb-0.5" aria-hidden="true">
        <defs>
          <radialGradient id="homeCrestRosette" cx="40%" cy="35%" r="68%">
            <stop offset="0%" stopColor="#FFF7FA" />
            <stop offset="52%" stopColor="#FF96BE" />
            <stop offset="100%" stopColor="#D6286C" />
          </radialGradient>
          <linearGradient id="homeCrestStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D6286C" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#D6286C" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#D6286C" stopOpacity="0.28" />
          </linearGradient>
        </defs>

        <path
          d="M16 31 C26 17 42 12 60 12 C78 12 94 17 104 31"
          fill="none"
          stroke="url(#homeCrestStroke)"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path
          d="M27 32 C34 21 46 17 60 17 C74 17 86 21 93 32"
          fill="none"
          stroke="#D6286C"
          strokeOpacity="0.36"
          strokeWidth="0.95"
          strokeLinecap="round"
          strokeDasharray="2 3.2"
        />

        <path
          d="M16 31 C12 30 11 25.5 15 24.5 C18 23.8 19.5 26.8 17.5 28"
          fill="none"
          stroke="#D6286C"
          strokeOpacity="0.62"
          strokeWidth="1.05"
          strokeLinecap="round"
        />
        <path
          d="M104 31 C108 30 109 25.5 105 24.5 C102 23.8 100.5 26.8 102.5 28"
          fill="none"
          stroke="#D6286C"
          strokeOpacity="0.62"
          strokeWidth="1.05"
          strokeLinecap="round"
        />

        <path
          d="M36 20 C39 14.5 46.5 13 51 16.5 C46.5 20.2 40.5 21 36 20Z"
          fill="#FF98C0"
          fillOpacity="0.28"
          stroke="#D6286C"
          strokeOpacity="0.68"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M84 20 C81 14.5 73.5 13 69 16.5 C73.5 20.2 79.5 21 84 20Z"
          fill="#FF98C0"
          fillOpacity="0.28"
          stroke="#D6286C"
          strokeOpacity="0.68"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        <g transform="translate(60, 12.5)">
          <path
            d="M0 -7.5 C3.8 -7.5 6 -4 3 -0.8 C6.4 -3.1 9.2 0.2 6 3.5 C3.7 6 0.9 4.7 0 2.4 C-0.9 4.7 -3.7 6 -6 3.5 C-9.2 0.2 -6.4 -3.1 -3 -0.8 C-6 -4 -3.8 -7.5 0 -7.5Z"
            fill="url(#homeCrestRosette)"
            stroke="#AE1752"
            strokeOpacity="0.72"
            strokeWidth="0.95"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="-1" r="2.1" fill="#FFF4EC" stroke="#E4B29D" strokeWidth="0.45" />
        </g>

        <circle cx="27" cy="31.5" r="1.45" fill="#D6286C" fillOpacity="0.52" />
        <circle cx="93" cy="31.5" r="1.45" fill="#D6286C" fillOpacity="0.52" />
      </svg>

      <h1 className="font-display-ar text-[2.65rem] leading-[1.24] font-bold text-[#360D21]">
        ليالي الورد
      </h1>
    </div>
  );
}

/**
 * فاصل وردي نباتي رقيق ينسجم مع التاج العلوي في الشاشة الرئيسية
 */
export function HomeFloralDivider() {
  return (
    <div className="flex items-center gap-2.5 w-full" aria-hidden="true">
      <span
        className="h-px flex-1"
        style={{
          backgroundImage: 'linear-gradient(to left, rgba(214,40,108,0.42), transparent)',
        }}
      />
      <svg viewBox="0 0 48 18" className="w-11 h-4 shrink-0 text-[#D6286C]">
        <path
          d="M3 9 C8.5 5 13 5 16.5 9 C13 13 8.5 13 3 9Z"
          fill="#FF98C0"
          fillOpacity="0.22"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="0.95"
          strokeLinejoin="round"
        />
        <path
          d="M45 9 C39.5 5 35 5 31.5 9 C35 13 39.5 13 45 9Z"
          fill="#FF98C0"
          fillOpacity="0.22"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="0.95"
          strokeLinejoin="round"
        />
        <path
          d="M24 2.8 C26.6 2.8 28 5.2 26 7.4 C28.4 5.9 30.4 8.2 28.2 10.6 C26.6 12.2 24.7 11.4 24 9.8 C23.3 11.4 21.4 12.2 19.8 10.6 C17.6 8.2 19.6 5.9 22 7.4 C20 5.2 21.4 2.8 24 2.8Z"
          fill="#FF8AB6"
          fillOpacity="0.45"
          stroke="currentColor"
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="7.8" r="1.45" fill="#FFF7FA" stroke="currentColor" strokeWidth="0.7" />
      </svg>
      <span
        className="h-px flex-1"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(214,40,108,0.42), transparent)',
        }}
      />
    </div>
  );
}

const SEAL_BURST_PARTICLES = [
  { startX: '-16px', startY: '-20px', bx: '-14px', by: '-56px', br: '-35deg', size: 12, delay: '0ms', palette: 'rose' as const },
  { startX: '4px', startY: '-26px', bx: '14px', by: '-64px', br: '22deg', size: 14, delay: '25ms', palette: 'blush' as const },
  { startX: '22px', startY: '-16px', bx: '44px', by: '-48px', br: '56deg', size: 12, delay: '45ms', palette: 'crimson' as const },
  { startX: '24px', startY: '6px', bx: '54px', by: '-16px', br: '84deg', size: 11, delay: '70ms', palette: 'rose' as const },
  { startX: '14px', startY: '-22px', bx: '28px', by: '-34px', br: '-14deg', size: 10, delay: '35ms', palette: 'blush' as const },
];

/**
 * الختم الملكي التفاعلي — يستجيب للّمس والتحويم بنبض هالة، دوران بتلات، وموجة بتلات وردية متناثرة
 */
export function HomeRoyalSeal({
  motionEnabled,
  onSealTap,
}: {
  motionEnabled: boolean;
  onSealTap?: () => void;
}) {
  const [tapCount, setTapCount] = useState(0);
  const [burstId, setBurstId] = useState(0);
  const [showSealNote, setShowSealNote] = useState(false);
  const burstTimerRef = useRef<number | null>(null);
  const noteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
      if (noteTimerRef.current !== null) {
        window.clearTimeout(noteTimerRef.current);
      }
    };
  }, []);

  const handleSealPress = () => {
    onSealTap?.();
    setTapCount((prev) => prev + 1);
    setShowSealNote(true);
    if (noteTimerRef.current !== null) {
      window.clearTimeout(noteTimerRef.current);
    }
    noteTimerRef.current = window.setTimeout(() => {
      setShowSealNote(false);
      noteTimerRef.current = null;
    }, 2200);

    if (!motionEnabled) return;

    const nextId = Date.now();
    setBurstId(nextId);
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
    }
    burstTimerRef.current = window.setTimeout(() => {
      setBurstId(0);
      burstTimerRef.current = null;
    }, 980);
  };

  const isRoyalGlow = tapCount % 2 === 1;

  return (
    <div className="z-30 absolute -top-[54px] left-6 w-14 h-14">
      {showSealNote && (
        <span
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 ad-cut-chip bg-white/95 border border-[#E4B29D] text-[11px] font-bold text-[#9E194D] shadow-sm inline-flex items-center gap-1 ${
            motionEnabled ? 'ad-anim-toast-in' : ''
          }`}
        >
          <span>لمسة وردية</span>
          <RoseStarOrnament className="w-3.5 h-3.5 text-[#D6286C]" />
        </span>
      )}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-1.5 rounded-full bg-[radial-gradient(circle,rgba(255,152,192,0.52)_0%,rgba(214,40,108,0.18)_52%,transparent_76%)] ${
          motionEnabled ? 'ad-seal-aura' : 'opacity-50'
        }`}
      />

      <button
        type="button"
        onClick={handleSealPress}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
          }
        }}
        aria-label="ختم ليالي الورد التفاعلي — لمسة وردية احتفالية"
        title="لمسة وردية احتفالية"
        aria-pressed={isRoyalGlow}
        className={`group relative z-10 w-full h-full rounded-full bg-gradient-to-br from-white via-[#FFF4F8] to-[#FFE2ED] flex items-center justify-center cursor-pointer select-none transition-[transform,border-color,box-shadow] duration-300 ease-out hover:scale-[1.07] active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6286C] ${
          isRoyalGlow
            ? 'border-[1.5px] border-[#D6286C] shadow-[0_12px_30px_rgba(214,40,108,0.34),0_0_0_3px_rgba(255,224,212,0.72)]'
            : 'border border-[#E4B29D] shadow-[0_10px_26px_rgba(196,30,96,0.22)] hover:shadow-[0_14px_30px_rgba(214,40,108,0.3)]'
        }`}
      >
        <svg viewBox="0 0 40 40" className="w-8 h-8 text-[#D6286C] overflow-visible">
          <defs>
            <radialGradient id="homeSealPetal" cx="42%" cy="35%" r="68%">
              <stop offset="0%" stopColor="#FFF7FA" />
              <stop offset="56%" stopColor="#FFA2C6" />
              <stop offset="100%" stopColor="#D6286C" />
            </radialGradient>
          </defs>

          <circle
            cx="20"
            cy="20"
            r="15.5"
            fill="none"
            stroke="currentColor"
            strokeOpacity={isRoyalGlow ? 0.68 : 0.42}
            strokeWidth="1"
            strokeDasharray="2 3"
            className={motionEnabled ? 'ad-seal-orbit' : ''}
          />

          <g
            style={{
              transformOrigin: '20px 20px',
              transform: `rotate(${tapCount * 90}deg) scale(${isRoyalGlow ? 1.06 : 1})`,
            }}
            className="transition-transform duration-500 ease-out group-hover:scale-[1.08]"
          >
            <path
              d="M20 8.2 C24.6 8.2 27.2 12.6 23.4 16.6 C27.4 12.8 31.8 15.4 31.8 20 C31.8 24.6 27.4 27.2 23.4 23.4 C27.2 27.4 24.6 31.8 20 31.8 C15.4 31.8 12.8 27.4 16.6 23.4 C12.6 27.2 8.2 24.6 8.2 20 C8.2 15.4 12.6 12.8 16.6 16.6 C12.8 12.6 15.4 8.2 20 8.2Z"
              fill="url(#homeSealPetal)"
              fillOpacity={isRoyalGlow ? 0.68 : 0.48}
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <circle
              cx="20"
              cy="20"
              r="3.2"
              fill={isRoyalGlow ? '#FFF2EA' : '#FFF8FB'}
              stroke="currentColor"
              strokeWidth="1.1"
            />
          </g>
        </svg>
      </button>

      {motionEnabled && burstId > 0 && (
        <div
          key={burstId}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
        >
          <span className="absolute inset-0 rounded-full border-2 border-[#FF8BB8] shadow-[0_0_16px_rgba(255,139,184,0.65)] ad-seal-ripple" />
          <span
            className="absolute inset-1 rounded-full border border-[#FFF3EB]/90 ad-seal-ripple"
            style={{ animationDelay: '90ms' }}
          />
          {SEAL_BURST_PARTICLES.map((item, idx) => (
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
              <HomeRosePetalGraphic
                idSuffix={`seal-burst-${burstId}-${idx}`}
                palette={item.palette}
                variant={(idx % 3) as 0 | 1 | 2}
                rimHighlight
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function HomeSilkDrapeDivider() {
  return (
    <svg
      viewBox="0 0 400 72"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute z-[14] -bottom-px inset-x-0 w-full h-14 text-[#FFEAF1]"
    >
      <defs>
        <linearGradient id="homeSilkBackVeil" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFCDE0" stopOpacity="0.48" />
          <stop offset="50%" stopColor="#FFE1EC" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#FFCDE0" stopOpacity="0.48" />
        </linearGradient>
        <linearGradient id="homeSilkEdgeStroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E46B9C" stopOpacity="0.48" />
          <stop offset="30%" stopColor="#D6286C" stopOpacity="0.66" />
          <stop offset="50%" stopColor="#C41E60" stopOpacity="0.78" />
          <stop offset="70%" stopColor="#D6286C" stopOpacity="0.66" />
          <stop offset="100%" stopColor="#E46B9C" stopOpacity="0.48" />
        </linearGradient>
        <linearGradient id="homeSilkInnerSheen" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFF7FA" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#FFF7FA" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      <path d="M0,72 L0,18 Q200,58 400,18 L400,72 Z" fill="url(#homeSilkBackVeil)" />
      <path
        d="M0,18 Q200,58 400,18"
        fill="none"
        stroke="#FFF4F8"
        strokeOpacity="0.54"
        strokeWidth="1"
      />
      <path d="M0,72 L0,26 Q200,66 400,26 L400,72 Z" fill="currentColor" />
      <path
        d="M0,27.5 Q200,67.5 400,27.5"
        fill="none"
        stroke="url(#homeSilkInnerSheen)"
        strokeWidth="1.4"
      />
      <path
        d="M0,26 Q200,66 400,26"
        fill="none"
        stroke="url(#homeSilkEdgeStroke)"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
      <path
        d="M28,34 Q200,71 372,34"
        fill="none"
        stroke="#D6286C"
        strokeOpacity="0.25"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeDasharray="1.8 4.4"
      />
    </svg>
  );
}
