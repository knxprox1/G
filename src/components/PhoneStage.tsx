import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { RoseAtmosphere } from './RoseFiligree';

const PhoneModalContainerContext = createContext<HTMLDivElement | null>(null);

/**
 * بوابة لعرض النوافذ المنبثقة فوق كامل شاشة الهاتف (بما في ذلك شريط التنقل السفلي)
 */
export function PhoneModalPortal({ children }: { children: React.ReactNode }) {
  const container = useContext(PhoneModalContainerContext);
  if (!container) {
    return <>{children}</>;
  }
  return createPortal(children, container);
}

interface PhoneStageProps {
  children: React.ReactNode;
  accentHex?: string;
  motionEnabled?: boolean;
  animationsPaused?: boolean;
  suppressAtmosphere?: boolean;
}

/**
 * إطار العرض الحصري للهاتف (Mobile-Only Portrait Stage)
 * ساحة حريرية وردية غنية بالزخارف والنقوش النباتية دون أي تمرير.
 */
export function PhoneStage({
  children,
  accentHex = '#D6286C',
  motionEnabled = true,
  animationsPaused = false,
  suppressAtmosphere = false,
}: PhoneStageProps) {
  const [modalContainer, setModalContainer] = useState<HTMLDivElement | null>(null);

  return (
    <div
      className={`relative h-[100dvh] w-full overflow-hidden bg-[#F3AEC8] flex items-center justify-center ${
        animationsPaused ? 'ad-paused-animations' : ''
      } ${!motionEnabled ? 'ad-motion-off' : ''}`}
    >
      {/* Lush rose-garden & warm champagne ambient backdrop on desktop viewports */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden sm:block transition-[background] duration-500"
        style={{
          background: `radial-gradient(circle at 50% 22%, ${accentHex}40 0%, #F7BDD3 44%, #EC97B8 78%, #DF82A6 100%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden sm:block ad-petal-lattice opacity-35"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden sm:block"
        style={{
          background:
            'radial-gradient(ellipse 46% 62% at 50% 50%, rgba(255, 224, 212, 0.32) 0%, transparent 72%)',
        }}
      />

      {/* Decorative ambient desktop atelier rosette arcs & subtle rose-gold flourishes */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:block w-[530px] h-[530px] rounded-full border border-[#FFF4EC]/50 shadow-[0_0_90px_rgba(255,224,212,0.28)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:block w-[640px] h-[640px] rounded-full border border-dashed border-[#FFE0D4]/45"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block w-[760px] h-[760px] rounded-full border border-white/25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-6 hidden md:block rounded-[36px] border border-[#FFF4EC]/24"
      >
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rotate-45 border border-[#FFF4EC]/65 bg-[#FFE0D4]/30" />
        <span className="absolute -top-1.5 -left-1.5 w-3 h-3 rotate-45 border border-[#FFF4EC]/65 bg-[#FFE0D4]/30" />
        <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rotate-45 border border-[#FFF4EC]/65 bg-[#FFE0D4]/30" />
        <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rotate-45 border border-[#FFF4EC]/65 bg-[#FFE0D4]/30" />
      </div>

      {/* Portrait Mobile Canvas */}
      <main className="relative flex flex-col w-full h-[100dvh] sm:w-[402px] sm:h-[min(852px,94dvh)] sm:rounded-[40px] sm:border sm:border-[#D6286C]/28 sm:ring-1 sm:ring-[#FFE0D4]/55 ad-rose-silk-bg overflow-hidden shadow-[0_30px_90px_rgba(122,22,62,0.26)]">
        {/* Top & bottom delicate concentric rose-arch filigree rings strictly clipped */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[390px] h-[390px] rounded-full border border-[#D6286C]/12" />
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[278px] h-[278px] rounded-full border border-dashed border-[#D6286C]/12" />
          <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full border border-[#D6286C]/10" />
        </div>

        {/* Subtle botanical lattice weave */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 ad-petal-lattice opacity-75" />

        {/* Ambient floating petals & shimmer motes */}
        {!suppressAtmosphere && (
          <RoseAtmosphere accentHex={accentHex} motionEnabled={motionEnabled} />
        )}

        {/* Screen content strictly contained with zero scroll */}
        <PhoneModalContainerContext.Provider value={modalContainer}>
          <div className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden">
            {children}
          </div>
        </PhoneModalContainerContext.Provider>

        {/* Full-Stage Modal Portal Layer (covers both active screen and BottomNavDock) */}
        <div
          ref={setModalContainer}
          className="pointer-events-none absolute inset-0 z-50 [&>*]:pointer-events-auto"
        />
      </main>
    </div>
  );
}
