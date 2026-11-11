import React from 'react';
import { motion } from 'motion/react';
import { MoodId } from '../types/game';
import { Sparkles } from 'lucide-react';

interface MoodScreenProps {
  onContinue: () => void;
  selectedMood: MoodId;
  onSelectMood: (mood: MoodId) => void;
  partnerAName?: string;
  partnerBName?: string;
  onUpdatePartnerNames?: (nameA: string, nameB: string) => void;
}

interface WorldItem {
  id: MoodId;
  name: string;
  shortName: string;
  tagline: string;
  imageSrc: string;
}

export const MoodScreen: React.FC<MoodScreenProps> = ({
  onContinue,
  selectedMood,
  onSelectMood,
}) => {
  // 20 Intimate Worlds - Perfectly Aligned with User's Psychological & Sensual Dimensions
  const WORLDS: WorldItem[] = [
    {
      id: 'heritage_values',
      name: 'المعتقدات والقيم والموروثات',
      shortName: 'القيم والموروث',
      tagline: 'الأصول العميقة والرؤية المشتركة للحياة والحميمية',
      imageSrc: '/assets/cards/twin_rings.png',
    },
    {
      id: 'knowledge_expectations',
      name: 'المعرفة والتصورات والتوقعات',
      shortName: 'الفكر والتوقع',
      tagline: 'عمق التفاهم الفكري وما ينتظره كل شريك من الآخر',
      imageSrc: '/assets/cards/mind.png',
    },
    {
      id: 'body_confidence',
      name: 'علاقتك بجسدك وثقتك بمظهرك',
      shortName: 'الثقة بالجسد',
      tagline: 'الانسجام مع الجسد والاعتزاز بالجمال والجاذبية الذاتية',
      imageSrc: '/assets/cards/goddess.png',
    },
    {
      id: 'practices_meaning',
      name: 'ماذا تعني لكِ هذه الممارسات عاطفيًا وجنسيًا؟',
      shortName: 'المعنى والرمزية',
      tagline: 'الرمزية الوجدانية والروحية للمشاعر والتقارب الجسدي',
      imageSrc: '/assets/cards/heart.png',
    },
    {
      id: 'aesthetic_attraction',
      name: 'الانجذاب الجمالي والجنسي',
      shortName: 'سحر الانجذاب',
      tagline: 'سحر الإغراء والشرارة الأولى التي تشعل الرغبة',
      imageSrc: '/assets/cards/rose.png',
    },
    {
      id: 'acceptance_conflict',
      name: 'القبول النفسي والنفور والصراع الداخلي',
      shortName: 'القبول والراحة',
      tagline: 'مساحة الأمان لمناقشة المخاوف والتناقضات والراحة النفسية',
      imageSrc: '/assets/cards/inner_conflict.png',
    },
    {
      id: 'deep_emotions',
      name: 'الانفعالات العميقة',
      shortName: 'فيض المشاعر',
      tagline: 'فيض المشاعر الصادقة والتعلق والارتباط الحميمي',
      imageSrc: '/assets/cards/potion_elixir.png',
    },
    {
      id: 'curiosity_drives',
      name: 'الفضول والعهر والدوافع',
      shortName: 'الفضول والدوافع',
      tagline: 'استكشاف الخبايا الجريئة والرغبات الدفينة بحرية وأمان',
      imageSrc: '/assets/cards/golden_key.png',
    },
    {
      id: 'fantasy_mental',
      name: 'الخيال والتمثيل الذهني',
      shortName: 'الخيال الذهني',
      tagline: 'عوالم الخيال السري والأفكار التي تثير العقل والقلب',
      imageSrc: '/assets/cards/crescent_moon.png',
    },
    {
      id: 'sensory_perception',
      name: 'الإدراك الحسي والحساسية',
      shortName: 'رقة الحواس',
      tagline: 'مداعبة الحواس الخمس، رقة اللمس ودفء الأنفاس',
      imageSrc: '/assets/cards/feather.png',
    },
    {
      id: 'physiological_response',
      name: 'الاستجابة الجسدية والعصبية والفسيولوجية',
      shortName: 'استجابة الجسد',
      tagline: 'نبضات القلب، الرعشات، ولغة الجسد التلقائية',
      imageSrc: '/assets/cards/burning_candle.png',
    },
    {
      id: 'sexual_excitation',
      name: 'الإثارة الجنسية',
      shortName: 'لهيب الإثارة',
      tagline: 'لهيب الاشتعال وسرعة دقات الشغف المشترك',
      imageSrc: '/assets/cards/flame_lantern.png',
    },
    {
      id: 'pleasure_bliss',
      name: 'المتعة والاستمتاع',
      shortName: 'المتعة والنشوة',
      tagline: 'سكر اللذة وبلوغ أسمى درجات الانسجام والنشوة',
      imageSrc: '/assets/cards/wine.png',
    },
    {
      id: 'boundaries_dynamics',
      name: 'المواقف والحدود حسب نوع التفاعل',
      shortName: 'رسم الحدود',
      tagline: 'رسم حدود الراحة والاتفاق على ما يُسعد ويُطمئن الطرفين',
      imageSrc: '/assets/cards/golden_crown.png',
    },
    {
      id: 'past_experiences',
      name: 'الخبرات السابقة والتاريخ التجريبي',
      shortName: 'الخبرات السابقة',
      tagline: 'رحلة النضج وتراكم الذكريات والتجارب التي كوّنت شخصيتك',
      imageSrc: '/assets/cards/gateway.png',
    },
    {
      id: 'consent_autonomy',
      name: 'الاستقلالية والموافقة والقدرة على التراجع',
      shortName: 'الموافقة والحرية',
      tagline: 'الحرية الكاملة في القبول أو الرفض برقي واحترام متبادل',
      imageSrc: '/assets/cards/swans_embrace.png',
    },
    {
      id: 'marital_bond_safety',
      name: 'العلاقة الزوجية والتواصل والأمان العاطفي',
      shortName: 'الأمان والتواصل',
      tagline: 'عمق الميثاق والملاذ الآمن الذي يحتضن قلبيكما دائماً',
      imageSrc: '/assets/cards/mirror.png',
    },
    {
      id: 'health_safety_comfort',
      name: 'الصحة والسلامة والألم والمخاطر',
      shortName: 'الصحة والسلامة',
      tagline: 'العناية بالسلامة الجسدية والراحة وتجنب أي ألم أو ضغط',
      imageSrc: '/assets/cards/golden_shield.png',
    },
    {
      id: 'voice_speech_dirtytalk',
      name: 'الصوت والكلام واللغة الجنسية الصريحة',
      shortName: 'لغة الهمس',
      tagline: 'لغة الهمس المثير، نبرة الصوت، والبوح الصريح المشعل للحواس',
      imageSrc: '/assets/cards/whisper_voice.png',
    },
    {
      id: 'visual_gaze_imagery',
      name: 'الجانب البصري – النظر والصور والمشاهد الفاحشة',
      shortName: 'الجانب البصري',
      tagline: 'فتنة النظرات، متعة التأمل البصري، وسحر الصور والمشاهد الجريئة',
      imageSrc: '/assets/cards/golden_eye.png',
    },
  ];

  const activeWorld = WORLDS.find((w) => w.id === selectedMood) || WORLDS[0];

  const handleSelectWorld = (worldId: MoodId) => {
    onSelectMood(worldId);
    // Smooth immediate transition directly into the world on tap
    setTimeout(() => {
      onContinue();
    }, 160);
  };

  return (
    <div className="h-full w-full flex flex-col justify-between py-2 sm:py-3 px-2 sm:px-4 md:px-6 max-w-xl mx-auto select-none overflow-hidden relative bg-transparent">
      {/* Top Active World Badge & Description */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="shrink-0 text-center pt-0.5 pb-1"
      >
        <button
          onClick={onContinue}
          className="inline-flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-amber-300/40 text-amber-200 text-xs sm:text-sm shadow-xl max-w-[96%] mx-auto cursor-pointer hover:border-amber-300/70 transition-all group"
          title="انقر للدخول"
        >
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:rotate-12 transition-transform" />
            <span className="text-white font-extrabold tracking-wide text-[13px] sm:text-[15px] line-clamp-1">
              {activeWorld.name}
            </span>
          </div>
          <span className="text-[11px] sm:text-[12.5px] text-rose-200 font-semibold line-clamp-1">
            {activeWorld.tagline}
          </span>
        </button>
      </motion.div>

      {/* 20 Worlds Grid - 4 Columns x 5 Rows Enlarged to Fill the Screen */}
      <div className="flex-1 my-auto flex items-center justify-center w-full py-1">
        <div className="grid grid-cols-4 gap-x-2.5 sm:gap-x-4 md:gap-x-6 gap-y-2.5 sm:gap-y-4 md:gap-y-5 place-items-center w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto">
          {WORLDS.map((world, idx) => {
            const isSelected = selectedMood === world.id;
            return (
              <motion.button
                key={world.id}
                onClick={() => handleSelectWorld(world.id)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: isSelected ? 1.12 : 1,
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.2, delay: idx * 0.006 }}
                title={world.name}
                className="relative flex flex-col items-center justify-center p-0 m-0 bg-transparent border-none outline-none cursor-pointer group"
              >
                {/* Golden Candlelight Aura on Selected Card */}
                {isSelected && (
                  <motion.div
                    layoutId="activeCardAura20"
                    className="absolute -top-1.5 inset-x-0 h-16 sm:h-20 md:h-22 rounded-2xl bg-radial from-amber-400/50 via-rose-500/30 to-transparent blur-md pointer-events-none"
                    transition={{ duration: 0.2 }}
                  />
                )}

                {/* Arched Luxury 3D Card Image - Enlarged */}
                <img
                  src={world.imageSrc}
                  alt={world.name}
                  className={`w-15 h-15 sm:w-18 sm:h-18 md:w-21 md:h-21 object-contain transition-all duration-200 select-none pointer-events-none ${
                    isSelected
                      ? 'drop-shadow-[0_0_20px_rgba(245,158,11,0.95)] filter brightness-125'
                      : 'opacity-85 group-hover:opacity-100 group-hover:scale-105 drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)]'
                  }`}
                  loading="eager"
                  draggable={false}
                />

                {/* Short World Name Label Below Each Card */}
                <span
                  className={`mt-1 sm:mt-1.5 text-[10.5px] sm:text-[11.5px] md:text-[12.5px] leading-tight text-center font-extrabold line-clamp-1 max-w-[84px] sm:max-w-[100px] md:max-w-[115px] transition-colors ${
                    isSelected
                      ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.95)]'
                      : 'text-rose-100/90 group-hover:text-amber-200'
                  }`}
                >
                  {world.shortName}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
