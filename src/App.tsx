/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenId, MoodId } from './types/game';
import { ScreenHeader } from './components/ScreenHeader';
import { OrnamentalFrame } from './components/OrnamentalFrame';
import { GatewayScreen } from './screens/GatewayScreen';
import { MoodScreen } from './screens/MoodScreen';
import { DeckScreen } from './screens/DeckScreen';
import { RevealScreen } from './screens/RevealScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('gateway');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Intimacy State
  const [selectedMood, setSelectedMood] = useState<MoodId>('heritage_values');
  const [partnerAName, setPartnerAName] = useState('أنتِ');
  const [partnerBName, setPartnerBName] = useState('أنا');

  // Active Drawn Card
  const [activeCard, setActiveCard] = useState({
    category: 'همسة اعتراف',
    targetPartner: 'أنتِ',
    intensity: 2,
  });

  // Soft Web Audio API synthesized chimes for tactile feedback
  const playSensualChime = (type: 'draw' | 'unlock' | 'tap') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'unlock') {
        osc.frequency.setValueAtTime(432, ctx.currentTime); // 432Hz romantic frequency
        osc.frequency.exponentialRampToValueAtTime(864, ctx.currentTime + 0.4);
      } else if (type === 'draw') {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(528, ctx.currentTime);
      }

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio autoplay gracefully handled
    }
  };

  const handleCardSelectAndReveal = (cardInfo: {
    category: string;
    targetPartner: string;
    intensity: number;
  }) => {
    setActiveCard(cardInfo);
    playSensualChime('draw');
    setCurrentScreen('reveal');
  };

  return (
    <div className="h-dvh max-h-dvh w-full overflow-hidden flex flex-col bg-[#1f0b1b] text-[#FDF7FA] select-none transition-colors duration-500 relative">
      {/* Fixed Background Image across all screens */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <img
          src="/assets/aistudio/file_000000000ce8820784189824ef6952d4_dc97987f.png"
          alt="خلفية اللعبة الخاصة"
          className="w-full h-full object-cover object-center filter-none"
        />
        {/* Soft overlay on non-gateway screens so content remains clear while keeping the background vivid and fixed */}
        {currentScreen !== 'gateway' && (
          <div className="absolute inset-0 bg-[#160515]/60 transition-opacity duration-300" />
        )}
      </div>

      {/* Visual Effects & Top / Bottom Arabesque Filigree Ornaments */}
      <OrnamentalFrame />

      {/* Top Luxury Bar (Hidden on Gateway for pure visual presence) */}
      {currentScreen !== 'gateway' && (
        <ScreenHeader
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            playSensualChime('tap');
            setCurrentScreen(screen);
          }}
          onReset={() => {
            playSensualChime('tap');
            setCurrentScreen('gateway');
          }}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
        />
      )}

      {/* Main Single-Viewport Stage (Strictly No Scrolling) */}
      <main className="flex-1 w-full min-h-0 overflow-hidden relative flex flex-col items-center justify-center z-10">
        <AnimatePresence mode="wait">
          {currentScreen === 'gateway' && (
            <motion.div
              key="gateway"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full overflow-hidden"
            >
              <GatewayScreen
                onEnter={() => {
                  playSensualChime('tap');
                  setCurrentScreen('mood');
                }}
                onNavigate={(screen) => {
                  playSensualChime('tap');
                  setCurrentScreen(screen);
                }}
              />
            </motion.div>
          )}

          {currentScreen === 'mood' && (
            <motion.div
              key="mood"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full overflow-hidden"
            >
              <MoodScreen
                selectedMood={selectedMood}
                onSelectMood={(m) => {
                  playSensualChime('tap');
                  setSelectedMood(m);
                }}
                partnerAName={partnerAName}
                partnerBName={partnerBName}
                onUpdatePartnerNames={(a, b) => {
                  setPartnerAName(a);
                  setPartnerBName(b);
                }}
                onContinue={() => {
                  playSensualChime('tap');
                  setCurrentScreen('reveal');
                }}
              />
            </motion.div>
          )}

          {currentScreen === 'deck' && (
            <motion.div
              key="deck"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full overflow-hidden"
            >
              <DeckScreen
                mood={selectedMood}
                partnerAName={partnerAName}
                partnerBName={partnerBName}
                onSelectCardAndReveal={handleCardSelectAndReveal}
              />
            </motion.div>
          )}

          {currentScreen === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full overflow-hidden"
            >
              <RevealScreen
                partnerAName={partnerAName}
                partnerBName={partnerBName}
                category={activeCard.category}
                targetPartner={activeCard.targetPartner}
                selectedMood={selectedMood}
                onBackToMood={() => {
                  playSensualChime('tap');
                  setCurrentScreen('mood');
                }}
                onCompleteQuestions={() => {
                  playSensualChime('tap');
                  setCurrentScreen('mood');
                }}
                onNextCard={() => {
                  playSensualChime('draw');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
