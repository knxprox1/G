export interface QuestionOption {
  id: string;
  letter: string;
  text: string;
}

export interface WorldChoiceQuestion {
  id: string;
  worldId: string;
  worldName: string;
  worldShortName: string;
  worldImage: string;
  title: string;
  question: string;
  options: QuestionOption[];
  questionImage?: string;
  isMultiSelect?: boolean;
  maxSelections?: number;
}

export const WORLD_QUESTIONS: Record<string, WorldChoiceQuestion[]> = {
  heritage_values: [
    {
      id: 'hv-1',
      worldId: 'heritage_values',
      worldName: 'المعتقدات والقيم والموروثات',
      worldShortName: 'القيم والموروث',
      worldImage: '/assets/cards/twin_rings.png',
      title: 'ميثاق الروح والقيم المشتركة',
      question: 'ما هي الروابط الأكثر أهمية التي تمنحكِ شعوراً بالأمان والانسجام الأبدي مع شريككِ؟',
      isMultiSelect: true,
      options: [
        { id: 'a', letter: 'أ', text: 'الصدق التام والقدرة على البوح بكل شيء دون أدنى خوف أو تردد' },
        { id: 'b', letter: 'ب', text: 'الاحترام المتبادل والتقدير العميق لمشاعري واحتياجاتي' },
        { id: 'c', letter: 'ج', text: 'الشغف المتجدد الذي يشعل حبنا وحميميتنا في كل لقاء' },
        { id: 'd', letter: 'د', text: 'الوفاء المشترك والرغبة الصادقة في إسعادي دائماً' },
        { id: 'e', letter: 'هـ', text: 'الاحتواء الحنون والسكينة النفسية التي تغمرني بقربه' },
        { id: 'f', letter: 'و', text: 'المرح والابتسامة العفوية التي تذيب أي ضغوط أو خلافات' },
      ],
    },
    {
      id: 'hv-2',
      worldId: 'heritage_values',
      worldName: 'المعتقدات والقيم والموروثات',
      worldShortName: 'القيم والموروث',
      worldImage: '/assets/cards/twin_rings.png',
      title: 'استمرار المودة مع مرور السنين',
      question: 'ما هو الشيء الأكثر قدسية في نظرك وترغب في الحفاظ عليه بيننا إلى الأبد؟',
      options: [
        { id: 'a', letter: 'أ', text: 'اللهفة والشوق التي نلتقي بها وكأننا في أول أيامنا' },
        { id: 'b', letter: 'ب', text: 'الاطمئنان والسكينة النفسية التي لا أجدها إلا بجوارك' },
        { id: 'c', letter: 'ج', text: 'الخصوصية التامة لأسرارنا وحميميتنا بعيداً عن أي شخص' },
        { id: 'd', letter: 'د', text: 'التسامح وسرعة احتواء أي خلاف بالحب والحنان' },
      ],
    },
  ],
  knowledge_expectations: [
    {
      id: 'ke-1',
      worldId: 'knowledge_expectations',
      worldName: 'المعرفة والتصورات والتوقعات',
      worldShortName: 'الفكر والتوقع',
      worldImage: '/assets/cards/mind.png',
      title: 'بوح التوقعات والرغبات',
      question: 'ما الذي تنتظره وتتمناه من شريكك في لقاءاتكما الخاصة دون أن تضطر لقوله بالكلمات؟',
      options: [
        { id: 'a', letter: 'أ', text: 'أن يبادر هو أولاً ويُظهر رغبته العارمة وشغفه بي صراحةً' },
        { id: 'b', letter: 'ب', text: 'أن يقرأ لغة جسدي وملامح وجهي ويفهم ما يسعدني تلقائياً' },
        { id: 'c', letter: 'ج', text: 'أن يأخذ وقته بهدوء ودلال تام دون أي استعجال للخطوات' },
        { id: 'd', letter: 'د', text: 'أن يفاجئني بحركات ولمسات عفوية مبتكرة تكسر الروتين' },
      ],
    },
  ],
  body_confidence: [
    {
      id: 'bc-1',
      worldId: 'body_confidence',
      worldName: 'علاقتك بجسدك وثقتك بمظهرك',
      worldShortName: 'الثقة بالجسد',
      worldImage: '/assets/cards/goddess.png',
      title: 'جمالك في عينيّ شريكك',
      question: 'أي تصرف من شريكك يجعلك تشعر بأقصى درجات الثقة والجاذبية في مظهرك؟',
      options: [
        { id: 'a', letter: 'أ', text: 'نظرة التأمل العميقة في عيني وجسدي بإعجاب وشغف صامت' },
        { id: 'b', letter: 'ب', text: 'الكلمات والهمسات الصريحة التي تمدح مفاتني وجمالي' },
        { id: 'c', letter: 'ج', text: 'اللمسات الحنونة والمداعبة التي تشعرني برغبته الكاملة بي' },
        { id: 'd', letter: 'د', text: 'الاحتضان الدافئ والقبلات التلقائية التي تشعرني بالقبول المطلق' },
      ],
    },
  ],
  practices_meaning: [
    {
      id: 'pm-1',
      worldId: 'practices_meaning',
      worldName: 'ماذا تعني لكِ هذه الممارسات عاطفيًا وجنسيًا؟',
      worldShortName: 'المعنى والرمزية',
      worldImage: '/assets/cards/heart.png',
      title: 'قدسية الامتزاج العاطفي',
      question: 'في ذروة اللقاء والتقارب الحميمي، ما هو المعنى الأصدق الذي يخالج قلبك؟',
      options: [
        { id: 'a', letter: 'أ', text: 'انصهار الروحين في كيان واحد يتجاوز حدود الجسد والمكان' },
        { id: 'b', letter: 'ب', text: 'التعبير الأسمى والأعمق عن مشاعر الحب والامتنان المتبادل' },
        { id: 'c', letter: 'ج', text: 'ملاذ آمن للهروب من كل ضغوط الحياة وبلوغ السكينة التامة' },
        { id: 'd', letter: 'د', text: 'متعة حسية وشغف متقد يجدد فينا الطاقة والشباب والحيوية' },
      ],
    },
  ],
  aesthetic_attraction: [
    {
      id: 'aa-1',
      worldId: 'aesthetic_attraction',
      worldName: 'الانجذاب الجمالي والجنسي',
      worldShortName: 'سحر الانجذاب',
      worldImage: '/assets/cards/rose.png',
      title: 'شرارة الانجذاب والإغراء',
      question: 'ما هي التفصيلة الأولى التي تشعل شرارة الانجذاب والرغبة لديك نحو شريكك؟',
      options: [
        { id: 'a', letter: 'أ', text: 'سحر العيون ولغة النظرات المليئة بالشوق والرغبة المباشرة' },
        { id: 'b', letter: 'ب', text: 'رائحة العطر الآسرة ودفء الأنفاس حين يقترب مني' },
        { id: 'c', letter: 'ج', text: 'نبرة الصوت الهادئة والهمس المثير أثناء الحديث الخاص' },
        { id: 'd', letter: 'د', text: 'حرارة اللمسات الأولى ومداعبة الأصابع بجرأة ورقة' },
      ],
    },
  ],
  acceptance_conflict: [
    {
      id: 'ac-1',
      worldId: 'acceptance_conflict',
      worldName: 'القبول النفسي والنفور والصراع الداخلي',
      worldShortName: 'القبول والراحة',
      worldImage: '/assets/cards/inner_conflict.png',
      title: 'ملاذ الصدق والأمان الداخلي',
      question: 'ما هو الشيء الذي يمنحك راحة نفسية مطلقة أثناء اللقاء الخاص ويزيل أي حرج؟',
      options: [
        { id: 'a', letter: 'أ', text: 'يقيني بأنه يتقبلني كما أنا بكل تفاصيلي دون أدنى حكم أو قيود' },
        { id: 'b', letter: 'ب', text: 'الإحساس بالحرية الكاملة في إبداء رغباتي أو طلب التوقف' },
        { id: 'c', letter: 'ج', text: 'الأجواء الرومانسية الهادئة والإضاءة الخافتة والموسيقى اللطيفة' },
        { id: 'd', letter: 'د', text: 'الحديث الرقيق قبل التقارب والاطمئنان الصادق على راحتي' },
      ],
    },
  ],
  deep_emotions: [
    {
      id: 'de-1',
      worldId: 'deep_emotions',
      worldName: 'الانفعالات العميقة',
      worldShortName: 'فيض المشاعر',
      worldImage: '/assets/cards/potion_elixir.png',
      title: 'فيض المشاعر الصادقة',
      question: 'أي اللحظات العاطفية بينكما تترك أثراً لا يُمحى في أعماق وجدانك؟',
      options: [
        { id: 'a', letter: 'أ', text: 'النظرة الصامتة المتصلة التي نتبادلها بعد عناق طويل' },
        { id: 'b', letter: 'ب', text: 'اعتراف مفاجئ وصادق بالحب في لحظة عفوية مليئة بالشجن' },
        { id: 'c', letter: 'ج', text: 'احتواؤه لي بحنان حين أكون في أشد حالات التعب والضعف' },
        { id: 'd', letter: 'د', text: 'دموع الفرح أو الشوق التي تترقرق في العيون عند اللقاء' },
      ],
    },
  ],
  curiosity_drives: [
    {
      id: 'cd-1',
      worldId: 'curiosity_drives',
      worldName: 'الفضول والعهر والدوافع',
      worldShortName: 'الفضول والدوافع',
      worldImage: '/assets/cards/golden_key.png',
      title: 'أسرار الرغبة الجريئة والدوافع',
      question: 'إذا أتيحت لكما ليلة خاصة مفتوحة بلا أي قيود، ما هو دافعك الأكبر لتجربته؟',
      options: [
        { id: 'a', letter: 'أ', text: 'تجربة مكان جديد وخلوة استثنائية منعزلة تكسر المعتاد' },
        { id: 'b', letter: 'ب', text: 'لعب أدوار رومانسية جريئة تكشف رغبات دفينة لم نبح بها' },
        { id: 'c', letter: 'ج', text: 'قضاء ساعات ممتدة في المداعبة البطيئة والمساج الحميمي' },
        { id: 'd', letter: 'د', text: 'الاستسلام التام لرغبات الشريك وتجربة كل ما يقترحه بشغف' },
      ],
    },
  ],
  fantasy_mental: [
    {
      id: 'fm-1',
      worldId: 'fantasy_mental',
      worldName: 'الخيال والتمثيل الذهني',
      worldShortName: 'الخيال الذهني',
      worldImage: '/assets/cards/crescent_moon.png',
      title: 'عوالم الخيال السري والأفكار',
      question: 'أي نوع من السيناريوهات الخيالية يثير عقلك وفضولك في خلوتكما؟',
      options: [
        { id: 'a', letter: 'أ', text: 'سيناريو اللقاء العفوي المفاجئ المشتعل بالشوق بعد غياب' },
        { id: 'b', letter: 'ب', text: 'سيناريو ليلة رومانسية فاخرة في جناح ملكي تملؤه الشموع' },
        { id: 'c', letter: 'ج', text: 'سيناريو الجرأة والهمس بالأسرار والأمنيات الخفية' },
        { id: 'd', letter: 'د', text: 'سيناريو التأمل البصري والرقص البطيء في ضوء خافت' },
      ],
    },
  ],
  sensory_perception: [
    {
      id: 'sp-1',
      worldId: 'sensory_perception',
      worldName: 'الإدراك الحسي والحساسية',
      worldShortName: 'رقة الحواس',
      worldImage: '/assets/cards/feather.png',
      title: 'مداعبة الحواس الخمس',
      question: 'أي الحواس تكون في أعلى درجات يقظتها وإثارتها لديك في اللحظات الحميمية؟',
      options: [
        { id: 'a', letter: 'أ', text: 'حاسة اللمس ورقة أنامل الشريك حين تداعب البشرة ببطء' },
        { id: 'b', letter: 'ب', text: 'حاسة السمع والتقاط نبرات الهمس والأنفاس المتسارعة' },
        { id: 'c', letter: 'ج', text: 'حاسة الشم ورائحة العطر الآسرة والبشرة الدافئة' },
        { id: 'd', letter: 'د', text: 'حاسة النظر وتأمل تعابير الشريك وانسجامه مع كل لمسة' },
      ],
    },
  ],
  physiological_response: [
    {
      id: 'pr-1',
      worldId: 'physiological_response',
      worldName: 'الاستجابة الجسدية والعصبية والفسيولوجية',
      worldShortName: 'استجابة الجسد',
      worldImage: '/assets/cards/burning_candle.png',
      title: 'لغة النبض والأنفاس التلقائية',
      question: 'ما هي الاستجابة التلقائية التي تشعر بها جسدياً حين يقترب منك شريكك بشغف؟',
      options: [
        { id: 'a', letter: 'أ', text: 'تسارع ملحوظ في نبضات القلب وانحباس الأنفاس من اللهفة' },
        { id: 'b', letter: 'ب', text: 'قشعريرة دافئة تسري من الرقبة إلى أطراف الجسد بأكمله' },
        { id: 'c', letter: 'ج', text: 'ارتخاء تام واستسلام كامل للمساته وشعور بالذوبان' },
        { id: 'd', letter: 'د', text: 'رغبة عارمة في التشبث به واحتضانه بقوة لسحب مزيد من الدفء' },
      ],
    },
  ],
  sexual_excitation: [
    {
      id: 'se-1',
      worldId: 'sexual_excitation',
      worldName: 'الإثارة الجنسية',
      worldShortName: 'لهيب الإثارة',
      worldImage: '/assets/cards/flame_lantern.png',
      title: 'لهيب الاشتعال والشغف المشترك',
      question: 'ما هو المحفز الذي يرفع وتيرة الإثارة والشغف لديك بأسرع وقت وبلا مقاومة؟',
      options: [
        { id: 'a', letter: 'أ', text: 'القبلات الحارة والعميقة على الشفاه والعنق والأكتاف' },
        { id: 'b', letter: 'ب', text: 'الكلمات الجريئة والهمس المباشر في الأذن بكل وضوح' },
        { id: 'c', letter: 'ج', text: 'ملامسة مناطق حساسة معينة بدقة وبطء مشعل للحواس' },
        { id: 'd', letter: 'د', text: 'النظرات الصريحة المشتعلة بالرغبة والطلب المباشر' },
      ],
    },
  ],
  pleasure_bliss: [
    {
      id: 'pb-1',
      worldId: 'pleasure_bliss',
      worldName: 'المتعة والاستمتاع',
      worldShortName: 'المتعة والنشوة',
      worldImage: '/assets/cards/wine.png',
      title: 'ذروة اللذة والانسجام التام',
      question: 'ما الذي يجعل اللقاء الحميمي بالنسبة لك تجربة ممتعة متكاملة لا تُنسى؟',
      options: [
        { id: 'a', letter: 'أ', text: 'أن نصل معاً إلى قمة النشوة في نفس اللحظة بانسجام كامل' },
        { id: 'b', letter: 'ب', text: 'رؤية شريك حياتي وهو في غاية الرضا واللذة التامة' },
        { id: 'c', letter: 'ج', text: 'البطء والدلال وعدم استعجال أي خطوة طوال الجلسة' },
        { id: 'd', letter: 'د', text: 'العناق الطويل والاسترخاء المشترك والهمس الهادئ بعد الانتهاء' },
      ],
    },
  ],
  boundaries_dynamics: [
    {
      id: 'bd-1',
      worldId: 'boundaries_dynamics',
      worldName: 'المواقف والحدود حسب نوع التفاعل',
      worldShortName: 'رسم الحدود',
      worldImage: '/assets/cards/golden_crown.png',
      title: 'حدود الدلال والراحة والاطمئنان',
      question: 'كيف تفضل أن يرسم كل منكما حدود راحته وتفضيلاته في العلاقة الخاصة؟',
      options: [
        { id: 'a', letter: 'أ', text: 'بالحديث المسبق الصريح في أجواء رومانسية هادئة ولطيفة' },
        { id: 'b', letter: 'ب', text: 'بالإشارات ولغة الجسد التلقائية والتعبير أثناء الممارسة' },
        { id: 'c', letter: 'ج', text: 'باتفاقات واضحة متبادلة تعزز الأمان والاطمئنان الدائم' },
        { id: 'd', letter: 'د', text: 'بالاستجابة الفورية والمرنة لأي شعور بعدم الارتياح فوراً' },
      ],
    },
  ],
  past_experiences: [
    {
      id: 'pe-1',
      worldId: 'past_experiences',
      worldName: 'الخبرات السابقة والتاريخ التجريبي',
      worldShortName: 'الخبرات السابقة',
      worldImage: '/assets/cards/gateway.png',
      title: 'ذكريات اللقاءات وتراكم الخبرات',
      question: 'ما الذي تعلّمته من تجاربكما السابقة معاً وجعل علاقتكما الحالية أرقى وأمتع؟',
      options: [
        { id: 'a', letter: 'أ', text: 'أن الصراحة التامة تختصر المسافات وتضاعف المتعة واللذة' },
        { id: 'b', letter: 'ب', text: 'أن التجديد وكسر الروتين هو سر استمرار شعلة الشغف متقدة' },
        { id: 'c', letter: 'ج', text: 'أن الراحة النفسية والتمهيد العاطفي يسبقان أي متعة جسدية' },
        { id: 'd', letter: 'د', text: 'أن لكل مرحلة في علاقتنا سحرها الخاص ونضجها المختلف' },
      ],
    },
  ],
  consent_autonomy: [
    {
      id: 'ca-1',
      worldId: 'consent_autonomy',
      worldName: 'الاستقلالية والموافقة والقدرة على التراجع',
      worldShortName: 'الموافقة والحرية',
      worldImage: '/assets/cards/swans_embrace.png',
      title: 'حرية القلب والقبول الصادق',
      question: 'ما الذي يعطيك الأمان التام للتعبير عن رغبتك أو رغبتك في التراجع دون أي تردد؟',
      options: [
        { id: 'a', letter: 'أ', text: 'يقيني بأن شريكي يقدّر مشاعري ولا يغضب أو ينزعج أبداً' },
        { id: 'b', letter: 'ب', text: 'لغة الحوار الراقية والاحترام المتبادل الراسخ بيننا' },
        { id: 'c', letter: 'ج', text: 'أن المتعة المشتركة برضا الطرفين هي الهدف الوحيد للقاءاتنا' },
        { id: 'd', letter: 'د', text: 'ثقتي العميقة بأن راحتي وسعادتي هي أولوية شريكي الأولى' },
      ],
    },
  ],
  marital_bond_safety: [
    {
      id: 'mb-1',
      worldId: 'marital_bond_safety',
      worldName: 'العلاقة الزوجية والتواصل والأمان العاطفي',
      worldShortName: 'الأمان والتواصل',
      worldImage: '/assets/cards/mirror.png',
      title: 'ميثاق السكن والملاذ العاطفي',
      question: 'ما هو أساس الأمان العاطفي الذي تستمد منه طمأنينتك اليومية مع شريكك؟',
      options: [
        { id: 'a', letter: 'أ', text: 'احتواؤه لي حين أكون مهموماً أو متعباً بكل دفء وصبر' },
        { id: 'b', letter: 'ب', text: 'دعمه المستمر لطموحاتي ووقوفه بجانبي في كل خطواتي' },
        { id: 'c', letter: 'ج', text: 'تواصلنا اليومي المستمر وتشاركنا لأدق تفاصيل يومنا' },
        { id: 'd', letter: 'د', text: 'نظرته الحانية التي تشعرني بأني الشخص الأهم في حياته دائماً' },
      ],
    },
  ],
  health_safety_comfort: [
    {
      id: 'hs-1',
      worldId: 'health_safety_comfort',
      worldName: 'الصحة والسلامة والألم والمخاطر',
      worldShortName: 'الصحة والسلامة',
      worldImage: '/assets/cards/golden_shield.png',
      title: 'رعاية الجسد والراحة التامة',
      question: 'ما هي أولويتك لضمان أن تكون كل لحظة بينكما مريحة وصحية وخالية من أي ألم؟',
      options: [
        { id: 'a', letter: 'أ', text: 'التمهل والتهيئة الكافية والمداعبة الممتدة قبل أي لقاء' },
        { id: 'b', letter: 'ب', text: 'الاهتمام بالنظافة والروائح الزكية والأجواء الصحية المريحة' },
        { id: 'c', letter: 'ج', text: 'مراعاة الجانب الصحي والبدني للطرفين ومستوى الطاقة لديهما' },
        { id: 'd', letter: 'د', text: 'السؤال المستمر والاطمئنان الرقيق على راحتي أثناء اللقاء' },
      ],
    },
  ],
  voice_speech_dirtytalk: [
    {
      id: 'vs-1',
      worldId: 'voice_speech_dirtytalk',
      worldName: 'الصوت والكلام واللغة الجنسية الصريحة',
      worldShortName: 'لغة الهمس',
      worldImage: '/assets/cards/whisper_voice.png',
      title: 'سحر الكلام ونبرة الهمس الصريح',
      question: 'أي نوع من الكلمات والهمسات تجدها الأقرب لقلبك وتثير مشاعرك أكثر في الخلوة؟',
      options: [
        { id: 'a', letter: 'أ', text: 'كلمات الغزل الصريح والمديح الأنثوي/الرجولي الجريء والمباشر' },
        { id: 'b', letter: 'ب', text: 'عبارات الحب والرومانسية الرقيقة الهامسة قرب الأذن' },
        { id: 'c', letter: 'ج', text: 'التوجيه اللطيف والمباشر لما يسعد الشريك ويزيد نشوته' },
        { id: 'd', letter: 'د', text: 'أصوات الأنفاس والتنهيدات العفوية الصادقة دون أي تكلف' },
      ],
    },
  ],
  visual_gaze_imagery: [
    {
      id: 'vg-1',
      worldId: 'visual_gaze_imagery',
      worldName: 'الجانب البصري – النظر والصور والمشاهد الفاحشة',
      worldShortName: 'الجانب البصري',
      worldImage: '/assets/cards/golden_eye.png',
      title: 'فتنة النظر وسحر المظهر الجذاب',
      question: 'ما هو المشهد البصري الأكثر جاذبية وتأثيراً فيك في خلوتكما الخاصة؟',
      options: [
        { id: 'a', letter: 'أ', text: 'تأمل الشريك وهو بكامل أناقته وتألقه في ضوء الشموع الخافت' },
        { id: 'b', letter: 'ب', text: 'النظر المباشر في عينيه أثناء اللحظات الأكثر حميمية وقرباً' },
        { id: 'c', letter: 'ج', text: 'رؤية ملامح الاستمتاع والرضا والذوبان تعلو وجهه' },
        { id: 'd', letter: 'د', text: 'انعكاس تفاصيل الجسد وحركاته في المرآة أو الإضاءة الخافتة' },
      ],
    },
  ],
};

// Default fallback
export const DEFAULT_QUESTION: WorldChoiceQuestion = {
  id: 'def-1',
  worldId: 'romantic',
  worldName: 'عالم الرومانسية والشغف',
  worldShortName: 'الشغف والرومانسية',
  worldImage: '/assets/cards/rose.png',
  title: 'بوح الشغف والرغبة',
  question: 'ما هو الشيء الأجمل الذي رأيته في شريكك الليلة وجعل دقات قلبك تتسارع رغبة فيه؟',
  options: [
    { id: 'a', letter: 'أ', text: 'نظرة عينيه المليئة بالشوق واللهفة' },
    { id: 'b', letter: 'ب', text: 'ابتسامته الدافئة ورقته في التعامل معي' },
    { id: 'c', letter: 'ج', text: 'عطره الخاص وجاذبية إطلالته الليلة' },
    { id: 'd', letter: 'د', text: 'لمسته الحنونة التي تشعرني بأني مميز لديه' },
  ],
};

export function getQuestionsForWorld(worldId: string): WorldChoiceQuestion[] {
  return WORLD_QUESTIONS[worldId] || [DEFAULT_QUESTION];
}
