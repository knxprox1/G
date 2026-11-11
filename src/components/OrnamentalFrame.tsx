import React from 'react';
import { motion } from 'motion/react';

export const OrnamentalFrame: React.FC = () => {
  // Floating and gently swaying romantic rose petals
  const petals = [
    { id: 1, left: '12%', delay: 0, duration: 8.5, size: 20, rotateStart: 15, rotateEnd: 190, sway: 35 },
    { id: 2, left: '26%', delay: 2.2, duration: 10.5, size: 16, rotateStart: -25, rotateEnd: 150, sway: -35 },
    { id: 3, left: '48%', delay: 4.5, duration: 9.5, size: 22, rotateStart: 40, rotateEnd: -160, sway: 30 },
    { id: 4, left: '70%', delay: 1.2, duration: 11.2, size: 18, rotateStart: -15, rotateEnd: 210, sway: -40 },
    { id: 5, left: '86%', delay: 3.5, duration: 9.0, size: 19, rotateStart: 30, rotateEnd: 160, sway: 25 },
    { id: 6, left: '38%', delay: 6.0, duration: 10.8, size: 15, rotateStart: 10, rotateEnd: 230, sway: 35 },
  ];

  // Romantic starlight glimmers
  const glimmers = [
    { id: 1, top: '8%', left: '16%', delay: 0 },
    { id: 2, top: '8%', right: '16%', delay: 1.5 },
    { id: 3, top: '48%', left: '4%', delay: 2.2 },
    { id: 4, top: '48%', right: '4%', delay: 0.8 },
    { id: 5, top: '86%', left: '12%', delay: 1.8 },
    { id: 6, top: '86%', right: '12%', delay: 2.8 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {/* Soft Romantic Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-rose-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* ================= 1. TOP-CENTER FLOATING TWIN HEARTS CREST (ميدالية القلوب الرومانسية المعلقة) ================= */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <svg
          viewBox="0 0 160 80"
          className="w-36 h-20 text-rose-300 drop-shadow-[0_2px_15px_rgba(244,63,94,0.4)]"
          fill="none"
        >
          {/* Subtle Glowing Halo behind Twin Hearts */}
          <ellipse cx="80" cy="35" rx="35" ry="20" fill="rgba(244, 63, 94, 0.2)" />

          {/* Primary Rose Heart */}
          <path
            d="M80,18 C70,2 52,12 56,28 C60,40 80,55 80,55 C80,55 100,40 104,28 C108,12 90,2 80,18 Z"
            fill="rgba(225, 29, 72, 0.55)"
            stroke="rgba(254, 205, 211, 0.95)"
            strokeWidth="1.6"
          />

          {/* Secondary Entwined Rose-Gold Heart */}
          <path
            d="M72,25 C64,12 48,20 52,32 C56,42 72,52 72,52 C72,52 88,42 92,32 C96,20 80,12 72,25 Z"
            fill="rgba(251, 113, 133, 0.3)"
            stroke="rgba(253, 164, 175, 0.85)"
            strokeWidth="1.2"
          />

          {/* Small Flanking Rose Leaves */}
          <path d="M54,28 C42,26 36,36 44,42 C52,40 56,34 54,28 Z" fill="rgba(244, 114, 140, 0.5)" />
          <path d="M106,28 C118,26 124,36 116,42 C108,40 104,34 106,28 Z" fill="rgba(244, 114, 140, 0.5)" />

          {/* Little Floral Drops */}
          <circle cx="80" cy="32" r="2.5" fill="#ffffff" className="animate-pulse" />
          <circle cx="44" cy="42" r="1.8" fill="#fecdd3" />
          <circle cx="116" cy="42" r="1.8" fill="#fecdd3" />
        </svg>
      </div>

      {/* ================= 2. TOP CORNERS: CASCADING ROSE GARLANDS (عناقيد ورد متدلية من الزوايا العلوية) ================= */}
      {/* Top-Right Cascading Garland */}
      <svg
        viewBox="0 0 200 200"
        className="absolute top-0 right-0 w-32 h-32 md:w-44 md:h-44 text-rose-300 drop-shadow-[0_2px_12px_rgba(244,63,94,0.35)] pointer-events-none"
        fill="none"
      >
        {/* Curving Rose Vine wrapping the corner */}
        <path
          d="M200,20 C140,25 90,65 65,120 C50,155 45,185 45,200"
          stroke="url(#garlandRoseGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M200,45 C160,50 120,85 95,140 C85,165 80,185 80,200"
          stroke="rgba(254, 205, 211, 0.5)"
          strokeWidth="1"
          strokeDasharray="3,4"
        />

        {/* --- Delicate Hearts Threaded along the Vine Strings (قلوب على خيوط العناقيد) --- */}
        {/* Heart 1: Upper Vine Thread */}
        <g transform="translate(116, 48) rotate(-22)">
          <path
            d="M0,3 C-3.5,-1 -8.5,1.5 -7,6 C-5.5,10.5 0,15 0,15 C0,15 5.5,10.5 7,6 C8.5,1.5 3.5,-1 0,3 Z"
            fill="rgba(244, 63, 94, 0.6)"
            stroke="#fecdd3"
            strokeWidth="0.9"
          />
          <circle cx="0" cy="6" r="1.3" fill="#ffffff" />
        </g>

        {/* Heart 2: Inner Lace Thread */}
        <g transform="translate(142, 68) rotate(-38)">
          <path
            d="M0,2.5 C-2.8,-0.8 -6.5,1.2 -5.5,5 C-4.5,8.8 0,12 0,12 C0,12 4.5,8.8 5.5,5 C6.5,1.2 2.8,-0.8 0,2.5 Z"
            fill="rgba(251, 113, 133, 0.55)"
            stroke="#fecdd3"
            strokeWidth="0.8"
          />
        </g>

        {/* Heart 3: Mid Vine Thread */}
        <g transform="translate(74, 120) rotate(18)">
          <path
            d="M0,3 C-3.5,-1 -8.5,1.5 -7,6 C-5.5,10.5 0,15 0,15 C0,15 5.5,10.5 7,6 C8.5,1.5 3.5,-1 0,3 Z"
            fill="rgba(244, 63, 94, 0.6)"
            stroke="#fecdd3"
            strokeWidth="0.9"
          />
          <circle cx="0" cy="6" r="1.3" fill="#ffffff" />
        </g>

        {/* Heart 4: Lower Vine Thread */}
        <g transform="translate(48, 178) rotate(32)">
          <path
            d="M0,2.8 C-3,-0.8 -7,1.2 -6,5 C-5,8.8 0,12.5 0,12.5 C0,12.5 5,8.8 6,5 C7,1.2 3,-0.8 0,2.8 Z"
            fill="rgba(244, 63, 94, 0.55)"
            stroke="#fecdd3"
            strokeWidth="0.8"
          />
        </g>

        {/* Blooming Roses along the corner */}
        {/* Rose 1 (Main Corner Rose) */}
        <g transform="translate(145, 38)">
          <circle cx="0" cy="0" r="11" fill="rgba(225, 29, 72, 0.65)" stroke="#fecdd3" strokeWidth="1.2" />
          <path d="M-6,-3 C-2,-9 4,-9 8,-3 C6,4 -3,4 -6,-3 Z" fill="rgba(254, 205, 211, 0.8)" />
          <circle cx="0" cy="0" r="3" fill="#ffffff" />
        </g>

        {/* Rose 2 (Mid-vine Rose) */}
        <g transform="translate(88, 92)">
          <circle cx="0" cy="0" r="9" fill="rgba(225, 29, 72, 0.6)" stroke="#fecdd3" strokeWidth="1" />
          <path d="M-5,-2 C-2,-7 3,-7 6,-2 C4,3 -2,3 -5,-2 Z" fill="rgba(254, 205, 211, 0.75)" />
        </g>

        {/* Rose 3 (Lower bud) */}
        <g transform="translate(56, 155)">
          <circle cx="0" cy="0" r="7" fill="rgba(225, 29, 72, 0.5)" stroke="#fecdd3" strokeWidth="0.9" />
          <path d="M-3,-1 C-1,-5 2,-5 4,-1 C3,2 -1,2 -3,-1 Z" fill="rgba(254, 205, 211, 0.7)" />
        </g>

        {/* Delicate Tendril Leaves */}
        <path d="M128,48 C120,40 124,30 134,35 C138,40 134,46 128,48 Z" fill="rgba(244, 114, 140, 0.6)" />
        <path d="M165,30 C172,22 182,24 178,32 C172,36 166,34 165,30 Z" fill="rgba(244, 114, 140, 0.6)" />
        <path d="M75,105 C65,100 68,90 78,94 C82,98 80,104 75,105 Z" fill="rgba(244, 114, 140, 0.5)" />
      </svg>

      {/* Top-Left Cascading Garland (Symmetrical Mirror) */}
      <svg
        viewBox="0 0 200 200"
        className="absolute top-0 left-0 w-32 h-32 md:w-44 md:h-44 text-rose-300 drop-shadow-[0_2px_12px_rgba(244,63,94,0.35)] -scale-x-100 pointer-events-none"
        fill="none"
      >
        <path
          d="M200,20 C140,25 90,65 65,120 C50,155 45,185 45,200"
          stroke="url(#garlandRoseGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M200,45 C160,50 120,85 95,140 C85,165 80,185 80,200"
          stroke="rgba(254, 205, 211, 0.5)"
          strokeWidth="1"
          strokeDasharray="3,4"
        />

        {/* --- Delicate Hearts Threaded along the Vine Strings (قلوب على خيوط العناقيد) --- */}
        <g transform="translate(116, 48) rotate(-22)">
          <path
            d="M0,3 C-3.5,-1 -8.5,1.5 -7,6 C-5.5,10.5 0,15 0,15 C0,15 5.5,10.5 7,6 C8.5,1.5 3.5,-1 0,3 Z"
            fill="rgba(244, 63, 94, 0.6)"
            stroke="#fecdd3"
            strokeWidth="0.9"
          />
          <circle cx="0" cy="6" r="1.3" fill="#ffffff" />
        </g>

        <g transform="translate(142, 68) rotate(-38)">
          <path
            d="M0,2.5 C-2.8,-0.8 -6.5,1.2 -5.5,5 C-4.5,8.8 0,12 0,12 C0,12 4.5,8.8 5.5,5 C6.5,1.2 2.8,-0.8 0,2.5 Z"
            fill="rgba(251, 113, 133, 0.55)"
            stroke="#fecdd3"
            strokeWidth="0.8"
          />
        </g>

        <g transform="translate(74, 120) rotate(18)">
          <path
            d="M0,3 C-3.5,-1 -8.5,1.5 -7,6 C-5.5,10.5 0,15 0,15 C0,15 5.5,10.5 7,6 C8.5,1.5 3.5,-1 0,3 Z"
            fill="rgba(244, 63, 94, 0.6)"
            stroke="#fecdd3"
            strokeWidth="0.9"
          />
          <circle cx="0" cy="6" r="1.3" fill="#ffffff" />
        </g>

        <g transform="translate(48, 178) rotate(32)">
          <path
            d="M0,2.8 C-3,-0.8 -7,1.2 -6,5 C-5,8.8 0,12.5 0,12.5 C0,12.5 5,8.8 6,5 C7,1.2 3,-0.8 0,2.8 Z"
            fill="rgba(244, 63, 94, 0.55)"
            stroke="#fecdd3"
            strokeWidth="0.8"
          />
        </g>

        <g transform="translate(145, 38)">
          <circle cx="0" cy="0" r="11" fill="rgba(225, 29, 72, 0.65)" stroke="#fecdd3" strokeWidth="1.2" />
          <path d="M-6,-3 C-2,-9 4,-9 8,-3 C6,4 -3,4 -6,-3 Z" fill="rgba(254, 205, 211, 0.8)" />
          <circle cx="0" cy="0" r="3" fill="#ffffff" />
        </g>

        <g transform="translate(88, 92)">
          <circle cx="0" cy="0" r="9" fill="rgba(225, 29, 72, 0.6)" stroke="#fecdd3" strokeWidth="1" />
          <path d="M-5,-2 C-2,-7 3,-7 6,-2 C4,3 -2,3 -5,-2 Z" fill="rgba(254, 205, 211, 0.75)" />
        </g>

        <g transform="translate(56, 155)">
          <circle cx="0" cy="0" r="7" fill="rgba(225, 29, 72, 0.5)" stroke="#fecdd3" strokeWidth="0.9" />
          <path d="M-3,-1 C-1,-5 2,-5 4,-1 C3,2 -1,2 -3,-1 Z" fill="rgba(254, 205, 211, 0.7)" />
        </g>

        <path d="M128,48 C120,40 124,30 134,35 C138,40 134,46 128,48 Z" fill="rgba(244, 114, 140, 0.6)" />
        <path d="M165,30 C172,22 182,24 178,32 C172,36 166,34 165,30 Z" fill="rgba(244, 114, 140, 0.6)" />
        <path d="M75,105 C65,100 68,90 78,94 C82,98 80,104 75,105 Z" fill="rgba(244, 114, 140, 0.5)" />
      </svg>

      {/* ================= 3. SIDE MARGIN FLOURISHES (أغصان رومانسية رقيقة على الحواف الجانبية) ================= */}
      {/* Right Side Flourish */}
      <svg
        viewBox="0 0 60 140"
        className="absolute top-1/2 -translate-y-1/2 right-0 w-8 md:w-11 h-28 text-rose-300/60 pointer-events-none"
        fill="none"
      >
        <path d="M60,10 C35,30 25,70 30,110 C35,130 50,135 60,140" stroke="url(#garlandRoseGrad)" strokeWidth="1.4" />
        <circle cx="28" cy="70" r="5" fill="rgba(225, 29, 72, 0.55)" stroke="#fecdd3" strokeWidth="0.8" />
        <path d="M26,60 C18,55 20,45 28,50" fill="rgba(244, 114, 140, 0.5)" />
        <path d="M28,80 C20,85 22,95 30,90" fill="rgba(244, 114, 140, 0.5)" />
      </svg>

      {/* Left Side Flourish */}
      <svg
        viewBox="0 0 60 140"
        className="absolute top-1/2 -translate-y-1/2 left-0 w-8 md:w-11 h-28 text-rose-300/60 -scale-x-100 pointer-events-none"
        fill="none"
      >
        <path d="M60,10 C35,30 25,70 30,110 C35,130 50,135 60,140" stroke="url(#garlandRoseGrad)" strokeWidth="1.4" />
        <circle cx="28" cy="70" r="5" fill="rgba(225, 29, 72, 0.55)" stroke="#fecdd3" strokeWidth="0.8" />
        <path d="M26,60 C18,55 20,45 28,50" fill="rgba(244, 114, 140, 0.5)" />
        <path d="M28,80 C20,85 22,95 30,90" fill="rgba(244, 114, 140, 0.5)" />
      </svg>

      {/* ================= 4. BOTTOM CORNERS: FLORAL BOUQUET CRADLES (باقات ورد تحتضن الزوايا السفلية وتفسح للزر) ================= */}
      {/* Bottom-Right Cradle (Flanking the Start Button with Open Center) */}
      <svg
        viewBox="0 0 160 160"
        className="absolute bottom-1 right-0 w-24 h-24 md:w-32 md:h-32 text-rose-300 drop-shadow-[0_2px_10px_rgba(244,63,94,0.3)] pointer-events-none"
        fill="none"
      >
        <path
          d="M160,140 C110,140 70,115 50,75 C40,55 35,35 35,0"
          stroke="url(#garlandRoseGrad)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Hearts Threaded on Cradle Strings (قلوب على خيوط العنقود السفلي) */}
        <g transform="translate(80, 130) rotate(-15)">
          <path
            d="M0,2.5 C-2.5,-0.8 -6,1 -5,4.5 C-4,8 0,11 0,11 C0,11 4,8 5,4.5 C6,1 2.5,-0.8 0,2.5 Z"
            fill="rgba(244, 63, 94, 0.6)"
            stroke="#fecdd3"
            strokeWidth="0.8"
          />
          <circle cx="0" cy="4.5" r="1.2" fill="#ffffff" />
        </g>

        <g transform="translate(40, 45) rotate(20)">
          <path
            d="M0,2.5 C-2.5,-0.8 -6,1 -5,4.5 C-4,8 0,11 0,11 C0,11 4,8 5,4.5 C6,1 2.5,-0.8 0,2.5 Z"
            fill="rgba(244, 63, 94, 0.55)"
            stroke="#fecdd3"
            strokeWidth="0.8"
          />
        </g>

        {/* Bottom Corner Rose */}
        <g transform="translate(105, 125)">
          <circle cx="0" cy="0" r="10" fill="rgba(225, 29, 72, 0.65)" stroke="#fecdd3" strokeWidth="1.2" />
          <path d="M-5,-2 C-2,-7 3,-7 6,-2 C4,3 -2,3 -5,-2 Z" fill="rgba(254, 205, 211, 0.8)" />
          <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        </g>
        {/* Rose Bud along bottom curve */}
        <g transform="translate(62, 85)">
          <circle cx="0" cy="0" r="7.5" fill="rgba(225, 29, 72, 0.55)" stroke="#fecdd3" strokeWidth="1" />
        </g>
        {/* Gentle Heart Emblem Nestled in Corner */}
        <path
          d="M135,110 C130,102 120,105 122,112 C124,118 135,124 135,124 C135,124 146,118 148,112 C150,105 140,102 135,110 Z"
          fill="rgba(244, 63, 94, 0.45)"
          stroke="#fecdd3"
          strokeWidth="0.8"
        />
      </svg>

      {/* Bottom-Left Cradle */}
      <svg
        viewBox="0 0 160 160"
        className="absolute bottom-1 left-0 w-24 h-24 md:w-32 md:h-32 text-rose-300 drop-shadow-[0_2px_10px_rgba(244,63,94,0.35)] -scale-x-100 pointer-events-none"
        fill="none"
      >
        <path
          d="M160,140 C110,140 70,115 50,75 C40,55 35,35 35,0"
          stroke="url(#garlandRoseGrad)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Hearts Threaded on Cradle Strings */}
        <g transform="translate(80, 130) rotate(-15)">
          <path
            d="M0,2.5 C-2.5,-0.8 -6,1 -5,4.5 C-4,8 0,11 0,11 C0,11 4,8 5,4.5 C6,1 2.5,-0.8 0,2.5 Z"
            fill="rgba(244, 63, 94, 0.6)"
            stroke="#fecdd3"
            strokeWidth="0.8"
          />
          <circle cx="0" cy="4.5" r="1.2" fill="#ffffff" />
        </g>

        <g transform="translate(40, 45) rotate(20)">
          <path
            d="M0,2.5 C-2.5,-0.8 -6,1 -5,4.5 C-4,8 0,11 0,11 C0,11 4,8 5,4.5 C6,1 2.5,-0.8 0,2.5 Z"
            fill="rgba(244, 63, 94, 0.55)"
            stroke="#fecdd3"
            strokeWidth="0.8"
          />
        </g>

        <g transform="translate(105, 125)">
          <circle cx="0" cy="0" r="10" fill="rgba(225, 29, 72, 0.65)" stroke="#fecdd3" strokeWidth="1.2" />
          <path d="M-5,-2 C-2,-7 3,-7 6,-2 C4,3 -2,3 -5,-2 Z" fill="rgba(254, 205, 211, 0.8)" />
          <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        </g>
        <g transform="translate(62, 85)">
          <circle cx="0" cy="0" r="7.5" fill="rgba(225, 29, 72, 0.55)" stroke="#fecdd3" strokeWidth="1" />
        </g>
        <path
          d="M135,110 C130,102 120,105 122,112 C124,118 135,124 135,124 C135,124 146,118 148,112 C150,105 140,102 135,110 Z"
          fill="rgba(244, 63, 94, 0.45)"
          stroke="#fecdd3"
          strokeWidth="0.8"
        />
      </svg>

      {/* ================= 5. FLOATING FALLING ROSE PETALS (بتلات الورد المخملية المتساقطة) ================= */}
      {petals.map((petal) => (
        <motion.div
          key={petal.id}
          className="absolute pointer-events-none"
          style={{
            left: petal.left,
            top: '-5%',
            width: `${petal.size}px`,
            height: `${petal.size * 1.3}px`,
          }}
          animate={{
            y: ['0vh', '110vh'],
            x: ['0px', `${petal.sway}px`, '0px'],
            rotate: [petal.rotateStart, petal.rotateEnd],
            opacity: [0, 0.8, 0.9, 0],
            scale: [0.8, 1.05, 0.85],
          }}
          transition={{
            duration: petal.duration,
            repeat: Infinity,
            delay: petal.delay,
            ease: 'easeInOut',
          }}
        >
          <svg viewBox="0 0 30 40" className="w-full h-full filter drop-shadow-[0_3px_10px_rgba(225,29,72,0.5)]">
            <path
              d="M15,2 C25,2 30,12 28,26 C26,36 18,39 15,39 C12,39 4,36 2,26 C0,12 5,2 15,2 Z"
              fill="url(#velvetPetalGradVignette)"
              stroke="rgba(254, 205, 211, 0.4)"
              strokeWidth="0.9"
            />
            <path d="M15,6 C16,16 15,28 15,36" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </motion.div>
      ))}

      {/* ================= 6. GENTLE STARLIGHT GLIMMERS ================= */}
      {glimmers.map((g) => (
        <motion.div
          key={g.id}
          className="absolute text-rose-200 pointer-events-none filter drop-shadow-[0_0_6px_rgba(254,205,211,0.8)]"
          style={{ top: g.top, left: g.left, right: g.right }}
          animate={{
            scale: [0, 1.25, 0],
            opacity: [0, 0.95, 0],
            rotate: [0, 90],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            delay: g.delay,
            ease: 'easeInOut',
          }}
        >
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M10,0 L12,7 L19,10 L12,13 L10,20 L8,13 L1,10 L8,7 Z" />
          </svg>
        </motion.div>
      ))}

      {/* Common Gradients */}
      <svg className="absolute w-0 h-0 pointer-events-none">
        <defs>
          <linearGradient id="garlandRoseGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#fb7185" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fecdd3" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="velvetPetalGradVignette" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="45%" stopColor="#be123c" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
