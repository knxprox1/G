import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Sparkles, Eye } from 'lucide-react';

interface QuestionImageFrameProps {
  /** Optional URL of the question image */
  imageUrl?: string;
  /** Alt text */
  altText?: string;
  /** World or question title */
  title?: string;
  /** Additional styling */
  className?: string;
  /** Allow toggle for testing placeholder vs sample image */
  allowTogglePreview?: boolean;
}

/**
 * إطار صورة كبير وواضح ومخصص للصورة التعبيرية للسؤال.
 * مصمم بدون حشوات مفرطة ليكون مساحة العرض بارزة وملء الإطار بالكامل.
 */
export const QuestionImageFrame: React.FC<QuestionImageFrameProps> = ({
  imageUrl,
  altText = 'صورة السؤال',
  title,
  className = '',
  allowTogglePreview = true,
}) => {
  const [showDemo, setShowDemo] = React.useState(false);

  // Sample image for preview demonstration if toggled
  const sampleImage = '/assets/cards/golden_eye.png';
  const activeImage = imageUrl || (showDemo ? sampleImage : undefined);

  return (
    <div
      onClick={allowTogglePreview ? () => setShowDemo(!showDemo) : undefined}
      title={allowTogglePreview ? 'انقر للتبديل بين الإطار الفارغ ومعاينة صورة تجريبية' : undefined}
      className={`relative rounded-xl sm:rounded-2xl border border-amber-400/35 bg-black/50 backdrop-blur-md overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-amber-400/60 group select-none shadow-md ${className}`}
    >
      <AnimatePresence mode="wait">
        {activeImage ? (
          <motion.div
            key="image"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative flex items-center justify-center overflow-hidden"
          >
            <img
              src={activeImage}
              alt={altText}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            {title && (
              <span className="absolute bottom-2 right-2 text-[11px] sm:text-xs text-amber-200 font-bold px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs border border-amber-400/20">
                {title}
              </span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col items-center justify-center p-2 text-center relative"
          >
            {/* Subtle inner hairline placement border */}
            <div className="absolute inset-1.5 sm:inset-2 rounded-lg sm:rounded-xl border border-dashed border-amber-400/25 pointer-events-none" />

            <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-1 text-amber-300 group-hover:scale-105 transition-all shadow-inner">
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <span className="text-xs sm:text-sm text-amber-200 font-extrabold leading-tight">
              إطار صورة السؤال
            </span>
            <span className="text-[10px] sm:text-xs text-rose-200/75 mt-0.5 leading-tight font-medium">
              مساحة مخصصة للعمل الفني
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discreet preview tag on hover */}
      {allowTogglePreview && (
        <div className="absolute top-1.5 left-1.5 opacity-70 group-hover:opacity-100 transition-opacity bg-black/75 border border-amber-400/25 rounded px-1.5 py-0.5 text-[9px] text-amber-200 pointer-events-none shadow-xs">
          {showDemo ? 'إطار فارغ' : 'معاينة تجريبية'}
        </div>
      )}
    </div>
  );
};
