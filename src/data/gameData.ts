import type { GameMode, GameRealm, QuestionSet, RealmMotif } from './types';

export const HOME_ARTWORK_SRC = '/src/assets/images/rose_splash_palace_1794517205403.webp';

export const GAME_MODES: GameMode[] = [
  {
    id: 'mode-questions',
    romanNumeral: 'I',
    title: 'نمط الأسئلة',
    tagline: 'رحلة استكشافية عبر ٢٠ عالماً من الأسئلة والمحاور الخاصة',
    accentHex: '#D6286C',
    artworkSrc: '/src/assets/images/mode_questions_1794585739937.webp',
    motif: 'crescent',
    isAvailable: true,
    statusLabel: 'النمط المتاح الآن',
    ctaLabel: 'فتح النمط',
  },
  {
    id: 'mode-cards',
    romanNumeral: 'II',
    title: 'بطاقات الجرأة',
    tagline: 'تجربة سحب بطاقات متدرجة النبرة — تُفتح قريباً',
    accentHex: '#B4226A',
    artworkSrc: '/src/assets/images/mode_cards_1794585740687.webp',
    motif: 'orb',
    isAvailable: false,
    statusLabel: 'قريباً',
    ctaLabel: 'قريباً',
  },
  {
    id: 'mode-dialogue',
    romanNumeral: 'III',
    title: 'همسات الحوار',
    tagline: 'جلسات نقاش هادئة ومواضيع مفتوحة — تُفتح قريباً',
    accentHex: '#C42264',
    artworkSrc: '/src/assets/images/mode_dialogue_1794585741196.webp',
    motif: 'ribbon',
    isAvailable: false,
    statusLabel: 'قريباً',
    ctaLabel: 'قريباً',
  },
  {
    id: 'mode-challenges',
    romanNumeral: 'IV',
    title: 'تحديات المساء',
    tagline: 'مواقف ولحظات تفاعلية بإيقاع متوازن — تُفتح قريباً',
    accentHex: '#A61C57',
    artworkSrc: '/src/assets/images/mode_challenges_1794585741047.webp',
    motif: 'crescent',
    isAvailable: false,
    statusLabel: 'قريباً',
    ctaLabel: 'قريباً',
  },
];

interface RealmSeed {
  id: string;
  romanNumeral: string;
  title: string;
  tagline: string;
  description: string;
  accentHex: string;
  secondaryHex: string;
  artworkSrc: string;
  motif: RealmMotif;
  setsCount?: number;
}


const PALETTES = [
  { accentHex: '#D6286C', secondaryHex: '#FFDCE9' },
  { accentHex: '#C42264', secondaryHex: '#FFD7E6' },
  { accentHex: '#B4226A', secondaryHex: '#FAD4E8' },
  { accentHex: '#BA1D58', secondaryHex: '#FFD4E3' },
  { accentHex: '#A61C57', secondaryHex: '#F9D3E5' },
] as const;

const MOTIFS: RealmMotif[] = ['crescent', 'orb', 'ribbon'];

const REALM_SEEDS: RealmSeed[] = [
  {
    id: 'realm-01-beliefs',
    romanNumeral: 'I',
    title: 'القيم والمعتقدات',
    tagline: 'المعتقدات والقيم والموروثات التي تشكّل نظرتكِ',
    description:
      'مساحة تمهيدية لاستكشاف المعتقدات والقيم والموروثات التي تحكم نظرتكِ للعلاقة والحدود الخاصة.',
    accentHex: PALETTES[0].accentHex,
    secondaryHex: PALETTES[0].secondaryHex,
    artworkSrc: '/src/assets/images/w01_values_heritage_1794580103725.webp',
    motif: MOTIFS[0],
  },
  {
    id: 'realm-02-knowledge',
    romanNumeral: 'II',
    title: 'المعرفة والتوقعات',
    tagline: 'المعرفة والتصورات المسبقة وما تتوقعينه',
    description:
      'جولة تستعرض حصيلتكِ المعرفية والتصورات والتوقعات الشخصية حول التجربة والتفاعل الحميم.',
    accentHex: PALETTES[1].accentHex,
    secondaryHex: PALETTES[1].secondaryHex,
    artworkSrc: '/src/assets/images/w02_knowledge_expectations_1794580104922.webp',
    motif: MOTIFS[1],
  },
  {
    id: 'realm-03-body',
    romanNumeral: 'III',
    title: 'علاقتكِ بجسدكِ',
    tagline: 'علاقتكِ بجسدكِ وثقتكِ بمظهركِ وتقبّلكِ له',
    description:
      'مساحة هادئة لفهم علاقتكِ بجسدكِ ومستوى ثقتكِ بمظهركِ وتأثير ذلك على راحتكِ النفسية.',
    accentHex: PALETTES[2].accentHex,
    secondaryHex: PALETTES[2].secondaryHex,
    artworkSrc: '/src/assets/images/w03_body_confidence_1794580104255.webp',
    motif: MOTIFS[2],
  },
  {
    id: 'realm-04-meaning',
    romanNumeral: 'IV',
    title: 'المعنى العاطفي',
    tagline: 'ماذا تعني لكِ هذه الممارسات عاطفياً وجنسياً؟',
    description:
      'أسئلة تركّز على المعاني العاطفية والجنسية التي ترتبط لديكِ بكل ممارسة أو لحظة تقارب.',
    accentHex: PALETTES[3].accentHex,
    secondaryHex: PALETTES[3].secondaryHex,
    artworkSrc: '/src/assets/images/w04_emotional_meaning_1794580105702.webp',
    motif: MOTIFS[0],
  },
  {
    id: 'realm-05-attraction',
    romanNumeral: 'V',
    title: 'الانجذاب والجمال',
    tagline: 'ملامح الانجذاب الجمالي والجنسي لديكِ',
    description:
      'استكشاف ما يشدّكِ جمالياً وجنسياً في التفاصيل والمظهر والحضور بينكما.',
    accentHex: PALETTES[4].accentHex,
    secondaryHex: PALETTES[4].secondaryHex,
    artworkSrc: '/src/assets/images/w05_aesthetic_attraction_1794580105005.webp',
    motif: MOTIFS[1],
  },
  {
    id: 'realm-06-acceptance',
    romanNumeral: 'VI',
    title: 'القبول والصراع',
    tagline: 'القبول النفسي والنفور والصراع الداخلي',
    description:
      'التعرف على مساحات القبول النفسي مقابل مواضع التردد أو النفور والصراع الداخلي.',
    accentHex: PALETTES[0].accentHex,
    secondaryHex: PALETTES[0].secondaryHex,
    artworkSrc: '/src/assets/images/w06_inner_conflict_1794580105332.webp',
    motif: MOTIFS[2],
  },
  {
    id: 'realm-07-emotions',
    romanNumeral: 'VII',
    title: 'الانفعالات العميقة',
    tagline: 'المشاعر والانفعالات العميقة المصاحبة للتقارب',
    description:
      'قراءة صريحة للانفعالات العميقة التي تتحرك داخلكِ قبل اللقاء وأثناءه وبعده.',
    accentHex: PALETTES[1].accentHex,
    secondaryHex: PALETTES[1].secondaryHex,
    artworkSrc: '/src/assets/images/w07_deep_emotions_1794580106132.webp',
    motif: MOTIFS[0],
  },
  {
    id: 'realm-08-curiosity',
    romanNumeral: 'VIII',
    title: 'الفضول والدوافع',
    tagline: 'الفضول والعهر والدوافع الخاصة التي تحرّككِ',
    description:
      'مساحة جريئة لاستكشاف الفضول والعهر والدوافع النفسية والشخصية دون تحفّظ.',
    accentHex: PALETTES[2].accentHex,
    secondaryHex: PALETTES[2].secondaryHex,
    artworkSrc: '/src/assets/images/w08_curiosity_desire_1794580106777.webp',
    motif: MOTIFS[1],
  },
  {
    id: 'realm-09-fantasy',
    romanNumeral: 'IX',
    title: 'الخيال الذهني',
    tagline: 'عالم الخيال والتمثيل الذهني والصور الداخلية',
    description:
      'اكتشاف مسارات الخيال والتمثيل الذهني والسيناريوهات التي تثير فضولكِ الذهني.',
    accentHex: PALETTES[3].accentHex,
    secondaryHex: PALETTES[3].secondaryHex,
    artworkSrc: '/src/assets/images/w09_mental_fantasy_1794580104886.webp',
    motif: MOTIFS[2],
  },
  {
    id: 'realm-10-sensory',
    romanNumeral: 'X',
    title: 'الإدراك الحسي',
    tagline: 'الإدراك الحسي والحساسية للمؤثرات واللمس',
    description:
      'فهم درجة حساسيتكِ الحسية وتأثر حواسكِ المختلفة بالإضاءة واللمس والإيقاع.',
    accentHex: PALETTES[4].accentHex,
    secondaryHex: PALETTES[4].secondaryHex,
    artworkSrc: '/src/assets/images/w10_sensory_perception_1794580106824.webp',
    motif: MOTIFS[0],
  },
  {
    id: 'realm-11-physiological',
    romanNumeral: 'XI',
    title: 'الاستجابة الجسدية',
    tagline: 'الاستجابة الجسدية والعصبية والفسيولوجية',
    description:
      'ملاحظة ردود الفعل الجسدية والعصبية والفسيولوجية وتوقيت استجابة جسمكِ للمؤثرات.',
    accentHex: PALETTES[0].accentHex,
    secondaryHex: PALETTES[0].secondaryHex,
    artworkSrc: '/src/assets/images/w11_physical_response_1794580108070.webp',
    motif: MOTIFS[1],
  },
  {
    id: 'realm-12-arousal',
    romanNumeral: 'XII',
    title: 'الإثارة الجنسية',
    tagline: 'مفاتيح الإثارة الجنسية وتصاعد الرغبة',
    description:
      'تحديد المحفزات المباشرة للإثارة الجنسية وما يرفع منسوب التفاعل والرغبة لديكِ.',
    accentHex: PALETTES[1].accentHex,
    secondaryHex: PALETTES[1].secondaryHex,
    artworkSrc: '/src/assets/images/w12_sexual_arousal_1794580108498.webp',
    motif: MOTIFS[2],
  },
  {
    id: 'realm-13-pleasure',
    romanNumeral: 'XIII',
    title: 'المتعة والاستمتاع',
    tagline: 'مصادر المتعة وعمق الاستمتاع الحقيقي',
    description:
      'استكشاف ما يمنحكِ أعلى درجات المتعة والاستمتاع وما يكمل التجربة بنجاح.',
    accentHex: PALETTES[2].accentHex,
    secondaryHex: PALETTES[2].secondaryHex,
    artworkSrc: '/src/assets/images/w13_pleasure_bliss_1794580108545.webp',
    motif: MOTIFS[0],
  },
  {
    id: 'realm-14-boundaries',
    romanNumeral: 'XIV',
    title: 'المواقف والحدود',
    tagline: 'المواقف والحدود حسب نوع كل تفاعل',
    description:
      'توضيح مواقفكِ وحدودكِ بدقة وفق طبيعة كل تفاعل ومستواه بينكما.',
    accentHex: PALETTES[3].accentHex,
    secondaryHex: PALETTES[3].secondaryHex,
    artworkSrc: '/src/assets/images/w14_boundaries_clean_1794580155913.webp',
    motif: MOTIFS[1],
  },
  {
    id: 'realm-15-history',
    romanNumeral: 'XV',
    title: 'الخبرات السابقة',
    tagline: 'الخبرات السابقة والتاريخ التجريبي الشخصي',
    description:
      'التأمل في أثر الخبرات السابقة والتاريخ التجريبي على تفضيلاتكِ الحالية.',
    accentHex: PALETTES[4].accentHex,
    secondaryHex: PALETTES[4].secondaryHex,
    artworkSrc: '/src/assets/images/w15_past_experiences_1794580108792.webp',
    motif: MOTIFS[2],
  },
  {
    id: 'realm-16-consent',
    romanNumeral: 'XVI',
    title: 'الموافقة والتراجع',
    tagline: 'الاستقلالية والموافقة والقدرة على التراجع',
    description:
      'تأكيد مساحتكِ الحرة في القبول والموافقة الواعية وحقكِ الكامل في التوقف أو التراجع.',
    accentHex: PALETTES[0].accentHex,
    secondaryHex: PALETTES[0].secondaryHex,
    artworkSrc: '/src/assets/images/w16_autonomy_consent_1794580109676.webp',
    motif: MOTIFS[0],
  },
  {
    id: 'realm-17-marriage',
    romanNumeral: 'XVII',
    title: 'التواصل والأمان',
    tagline: 'العلاقة الزوجية والتواصل والأمان العاطفي',
    description:
      'تقييم جودة الحوار والأمان العاطفي داخل العلاقة الزوجية وأثرهما على الصراحة.',
    accentHex: PALETTES[1].accentHex,
    secondaryHex: PALETTES[1].secondaryHex,
    artworkSrc: '/src/assets/images/w17_marital_trust_1794580110199.webp',
    motif: MOTIFS[1],
  },
  {
    id: 'realm-18-health',
    romanNumeral: 'XVIII',
    title: 'الصحة والسلامة',
    tagline: 'الصحة والسلامة والانتباه للألم والمخاطر',
    description:
      'مراعاة جوانب الصحة والسلامة والراحة البدنية وتجنب أي ألم أو مخاطر غير مرغوبة.',
    accentHex: PALETTES[2].accentHex,
    secondaryHex: PALETTES[2].secondaryHex,
    artworkSrc: '/src/assets/images/w18_health_safety_1794580109574.webp',
    motif: MOTIFS[2],
  },
  {
    id: 'realm-19-voice',
    romanNumeral: 'XIX',
    title: 'الصوت والكلام',
    tagline: 'الصوت والكلام واللغة الجنسية الصريحة',
    description:
      'استكشاف أثر النبرة والكلام واللغة الجنسية الصريحة في بناء الأجواء أو كسر التوتر.',
    accentHex: PALETTES[3].accentHex,
    secondaryHex: PALETTES[3].secondaryHex,
    artworkSrc: '/src/assets/images/w19_voice_expression_1794580110245.webp',
    motif: MOTIFS[0],
  },
  {
    id: 'realm-20-visual',
    romanNumeral: 'XX',
    title: 'الجانب البصري',
    tagline: 'النظر والصور والمشاهد الجريئة والفاحشة',
    description:
      'استكشاف تفاعلكِ مع الجانب البصري من نظر وصور ومشاهد فاحشة بوضوح وخصوصية.',
    accentHex: PALETTES[4].accentHex,
    secondaryHex: PALETTES[4].secondaryHex,
    artworkSrc: '/src/assets/images/w20_visual_gaze_1794580110262.webp',
    motif: MOTIFS[1],
  },
];

const BOLDNESS_LEVELS = [
  {
    indexLabel: '٠١',
    title: 'جرأة هادئة',
    buildSubtitle: (realmTitle: string) =>
      `مدخل لطيف وأسئلة هادئة ضمن محور ${realmTitle}`,
  },
  {
    indexLabel: '٠٢',
    title: 'جرأة متوسطة',
    buildSubtitle: (realmTitle: string) =>
      `أسئلة أكثر صراحة ووضوحاً ضمن محور ${realmTitle}`,
  },
  {
    indexLabel: '٠٣',
    title: 'جرأة عالية',
    buildSubtitle: (realmTitle: string) =>
      `طرح مباشر وعميق لأدق تفاصيل ${realmTitle}`,
  },
] as const;

function buildPlaceholderSets(seed: RealmSeed): QuestionSet[] {
  const count = seed.setsCount ?? BOLDNESS_LEVELS.length;
  const sets: QuestionSet[] = [];

  for (let i = 0; i < count; i += 1) {
    const setNum = i + 1;
    const level = BOLDNESS_LEVELS[i] ?? BOLDNESS_LEVELS[BOLDNESS_LEVELS.length - 1];
    const indexLabel = level.indexLabel;
    const setId = `${seed.id}-set-${setNum}`;

    sets.push({
      id: setId,
      realmId: seed.id,
      indexLabel,
      title: level.title,
      subtitle: level.buildSubtitle(seed.title),
      questions: [
        {
          id: `${setId}-q1`,
          prompt: `سؤال تمهيدي في «${seed.title}» — يمكنكِ اختيار أكثر من إجابة تعبّر عن موقفكِ الحالي.`,
          allowMultiple: true,
          minSelect: 1,
          options: [
            { id: 'opt-1', marker: 'أ', label: 'الخيار الأول المناسب لي' },
            { id: 'opt-2', marker: 'ب', label: 'الخيار الثاني الأقرب لشعوري' },
            { id: 'opt-3', marker: 'ج', label: 'الخيار الثالث حسب السياق' },
            { id: 'opt-4', marker: 'د', label: 'الخيار الرابع بتفصيل مختلف' },
          ],
        },
        {
          id: `${setId}-q2`,
          prompt: `سؤال ثانٍ لاختبار وضوح الفكرة داخل محور «${seed.title}» مع دعم التحديد المتعدد.`,
          allowMultiple: true,
          minSelect: 1,
          options: [
            { id: 'opt-1', marker: 'أ', label: 'تعبير أول مقترح' },
            { id: 'opt-2', marker: 'ب', label: 'تعبير ثانٍ مقترح' },
            { id: 'opt-3', marker: 'ج', label: 'تعبير ثالث مقترح' },
          ],
        },
        {
          id: `${setId}-q3`,
          prompt: `سؤال ختامي باختيار واحد محدد لتثبيت خلاصة رأيكِ في «${seed.title}».`,
          allowMultiple: false,
          minSelect: 1,
          maxSelect: 1,
          options: [
            { id: 'opt-1', marker: 'أ', label: 'التوجه الأول' },
            { id: 'opt-2', marker: 'ب', label: 'التوجه الثاني' },
            { id: 'opt-3', marker: 'ج', label: 'التوجه الثالث' },
            { id: 'opt-4', marker: 'د', label: 'التوجه الرابع' },
          ],
        },
      ],
    });
  }

  return sets;
}

/**
 * 20 عالماً متكاملة تغطي المحاور العشرين المطلوبة بأسماء مختصرة واضحة،
 * مع إبقاء محتوى الأسئلة تجريبياً مهيأً للاستبدال المباشر لاحقاً.
 */
export const GAME_REALMS: GameRealm[] = REALM_SEEDS.map((seed, idx) => ({
  id: seed.id,
  order: idx + 1,
  romanNumeral: seed.romanNumeral,
  title: seed.title,
  tagline: seed.tagline,
  description: seed.description,
  accentHex: seed.accentHex,
  secondaryHex: seed.secondaryHex,
  artworkSrc: seed.artworkSrc,
  motif: seed.motif,
  sets: buildPlaceholderSets(seed),
}));
