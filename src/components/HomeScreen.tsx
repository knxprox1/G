import React from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { HOME_ARTWORK_SRC } from '../data/gameData';
import type { DeviceRole } from '../data/types';
import type { ResumeTarget } from '../game/engine';
import { useHasNativeNearby } from '../sync/usePlatformCapabilities';
import { useActionLock } from '../utils/useActionLock';
import { usePrefersReducedMotion } from '../utils/usePrefersReducedMotion';
import { ArtworkFrame } from './ArtworkFrame';
import {
  HomeBrandCrest,
  HomeFallingPetals,
  HomeFloralDivider,
  HomeRoyalSeal,
  HomeSilkDrapeDivider,
  HomeTopCanopy,
} from './home/HomeOrnaments';

interface HomeScreenProps {
  role?: DeviceRole;
  partnerName?: string;
  hasPartnerSync?: boolean;
  resumeTarget?: ResumeTarget | null;
  onStart: () => void;
  onResume?: () => void;
  onSealTap?: () => void;
  motionEnabled: boolean;
  transitionClassName?: string;
}

/**
 * الشاشة الرئيسية — بوابة حريرية وردية متوّجة بزخارف علوية، بتلات ورد متساقطة، وختم وردي متناغم
 */
export function HomeScreen({
  role = 'wife',
  partnerName = 'الشريكة',
  hasPartnerSync = true,
  resumeTarget = null,
  onStart,
  onResume,
  onSealTap,
  motionEnabled,
  transitionClassName = 'ad-anim-screen-curtain',
}: HomeScreenProps) {
  const hasNativeNearby = useHasNativeNearby();
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveMotion = motionEnabled && !prefersReducedMotion;
  const { runLocked } = useActionLock(450);

  return (
    <section
      className={`relative flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${
        effectiveMotion ? transitionClassName : ''
      }`}
      aria-label="الشاشة الرئيسية"
    >
      {/* Top 62%: Full-Bleed Candlelit Rose-Quartz Silk Artwork with Sculpted Curved Cutout */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-[#FAD3E2]">
        <ArtworkFrame
          src={HOME_ARTWORK_SRC}
          alt="أقواس الكوارتز الوردي وحرير الورود"
          accentHex="#D6286C"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover object-center scale-[1.03]"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#2A0817]/16 to-transparent"
        />

        <HomeTopCanopy />
        <HomeFallingPetals motionEnabled={effectiveMotion} layer="mid" />
        <HomeSilkDrapeDivider />
      </div>

      {/* Bottom 36%: Seamless Velvety Rose-Silk Editorial Stage */}
      <div
        className={`relative z-20 shrink-0 px-6 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-0 flex flex-col items-center text-center gap-2 bg-gradient-to-b from-[#FFEAF1] via-[#FFE4EE] to-[#FFD8E7] ${
          effectiveMotion ? 'ad-anim-fade-up' : ''
        }`}
      >
        <HomeRoyalSeal motionEnabled={effectiveMotion} onSealTap={onSealTap} />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-10 bottom-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_46%,rgba(255,255,255,0.42)_0%,transparent_72%)]"
        />

        <div className="relative z-10 flex flex-col items-center text-center gap-1.5 w-full">
          <HomeBrandCrest />

          <div className="w-40">
            <HomeFloralDivider />
          </div>

          <p className="max-w-[30ch] text-[13px] sm:text-sm leading-relaxed text-[#5E364A] font-medium">
            {role === 'husband'
              ? hasPartnerSync
                ? `نسخة الزوج — استعراض اختيارات ${partnerName} المتزامنة محلياً في نمط الأسئلة مع الأنماط القادمة.`
                : hasNativeNearby
                  ? 'نسخة الزوج — اقترن بجهاز الشريكة قريباً أو عبر السحابة لاستعراض اختياراتها في نمط الأسئلة مع الأنماط القادمة.'
                  : 'نسخة الزوج — اربط حسابك سحابياً مع جهاز الشريكة لاستعراض اختياراتها في نمط الأسئلة مع الأنماط القادمة.'
              : 'تجربة تفاعلية دافئة بأنماط وعوالم وردية متنوعة — تُحفظ اختياراتكِ على هذا الجهاز فقط وبخصوصية تامة.'}
          </p>

          <button
            type="button"
            data-start="true"
            onClick={() => runLocked(onStart)}
            className="group ad-shimmer-btn relative w-full min-h-[52px] ad-cut-tile bg-gradient-to-l from-[#D6286C] via-[#C62161] to-[#AE1752] text-white font-bold text-base flex items-center justify-center px-14 ring-1 ring-inset ring-white/25 shadow-[0_14px_34px_rgba(186,29,88,0.34),inset_0_1px_0_rgba(255,255,255,0.28)] active:scale-[0.98] transition-[transform,filter,box-shadow] duration-150 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#360D21] cursor-pointer"
          >
            <span>{role === 'husband' ? 'ابدأ الاستعراض' : 'ابدئي التجربة'}</span>
            <span className="absolute left-3 w-9 h-9 ad-cut-chip bg-white text-[#D6286C] flex items-center justify-center transition-transform duration-150 group-hover:-translate-x-1 shadow-sm">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </span>
          </button>

          {resumeTarget && onResume && (
            <button
              type="button"
              onClick={() => runLocked(onResume)}
              className="w-full min-h-[44px] px-3.5 ad-cut-tile bg-white/92 border border-[#E4B29D]/85 hover:border-[#D6286C] text-[12px] font-bold text-[#6B1D42] flex items-center justify-center gap-2 cursor-pointer transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] shadow-xs"
            >
              <Play className="w-3.5 h-3.5 text-[#D6286C] shrink-0" aria-hidden="true" />
              <span className="truncate">
                استكمال: {resumeTarget.realm.title} · {resumeTarget.set.title}
              </span>
            </button>
          )}
        </div>
      </div>

      <HomeFallingPetals motionEnabled={effectiveMotion} layer="edge" />
    </section>
  );
}
