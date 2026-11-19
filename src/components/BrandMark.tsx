import React from 'react';

export function BrandMark() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 select-none">
      <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="#D6286C" fillOpacity="0.1" stroke="#D6286C" strokeOpacity="0.35" strokeWidth="1" />
        <path
          d="M16 5L22 16L16 27L10 16Z"
          fill="#D6286C"
          fillOpacity="0.2"
          stroke="#D6286C"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M9 16C12 13.5 20 13.5 23 16"
          fill="none"
          stroke="#D6286C"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
        <circle cx="16" cy="16" r="2.3" fill="#D6286C" />
        <circle cx="16" cy="16" r="0.9" fill="#FFE0D4" />
      </svg>
      <span className="font-display-ar text-[1.2rem] sm:text-[1.35rem] leading-[1.3] font-bold whitespace-nowrap text-[#360D21]">
        ليالي الورد
      </span>
    </div>
  );
}
