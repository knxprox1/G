import type { GameQuestion, GameRealm, QuestionOption, QuestionSet } from '../data/types';
import {
  DEFAULT_REALM_INSIGHT_PROFILE,
  PARTNER_REALM_INSIGHTS,
  REALM_INSIGHT_PROFILES,
} from '../data/realmInsights';
import { toArabicDigits } from './engine';

export interface AnswerQissasa {
  confirmationBadge: string;
  headline: string;
  choiceEcho: string;
  selectedOptions: QuestionOption[];
  diagnosticText: string;
  realmTitle: string;
  setTitle: string;
  questionNumber: number;
}

const MULTI_HEADLINE_VARIANTS = [
  'أطياف متناغمة من اختياركِ',
  'تقاطع صادق للتفاصيل',
  'صورة متكاملة لإحساسكِ',
];

const SINGLE_HEADLINE_VARIANTS = [
  'نقطة ارتكاز واضحة',
  'تحديد دقيق لما يريحكِ',
  'اختيار صريح وهادئ',
];

const CONFIRMATION_BADGES = [
  'بصمة صراحة · حُفظت في السجل',
  'اختيار مؤكّد · همسة خاصة',
  'أُضيفت إجابتكِ إلى السجل',
];

const PARTNER_CONFIRMATION_BADGES = [
  'اختيار محفوظ في السجل',
  'قراءة خاصة · اختيار الشريكة',
  'توثيق صريح لاختيارها',
];

const PARTNER_SINGLE_HEADLINES = [
  'توجّه واضح ومحدّد',
  'اختيار صريح وهادئ',
  'نقطة ارتكاز واضحة',
];

const PARTNER_MULTI_HEADLINES = [
  'زوايا متناغمة في اختيارها',
  'تعدّد معبّر عن تفاصيلها',
  'صورة متكاملة لتفضيلها',
];

function summarizeChoices(selectedOptions: QuestionOption[]): string {
  if (selectedOptions.length === 0) return '';
  if (selectedOptions.length === 1) {
    return `«${selectedOptions[0].label}»`;
  }
  if (selectedOptions.length === 2) {
    return `«${selectedOptions[0].label}» و«${selectedOptions[1].label}»`;
  }
  const remaining = selectedOptions.length - 1;
  const remainderLabel =
    remaining === 2
      ? 'خيارين آخرين'
      : remaining <= 10
        ? `${toArabicDigits(remaining)} خيارات أخرى`
        : `${toArabicDigits(remaining)} خياراً آخر`;
  return `«${selectedOptions[0].label}» مع ${remainderLabel}`;
}

/**
 * تبني مضمون القصاصة الفنية الوصفية والتشخيصية بعد إجابة كل سؤال،
 * مع تكييف كامل لصيغة الخطاب بين نسخة الزوجة (تفاعلي) ونسخة الزوج (قراءة اختياراتها).
 */
export function buildAnswerQissasa({
  realm,
  set,
  question,
  questionNumber,
  selectedIds,
  isPartnerView = false,
  partnerName = 'الشريكة',
}: {
  realm: GameRealm;
  set: QuestionSet;
  question: GameQuestion;
  questionNumber: number;
  selectedIds: string[];
  isPartnerView?: boolean;
  partnerName?: string;
}): AnswerQissasa {
  const selectedOptions = question.options.filter((opt) => selectedIds.includes(opt.id));
  const profile = REALM_INSIGHT_PROFILES[realm.id] ?? DEFAULT_REALM_INSIGHT_PROFILE;
  const isMulti = selectedOptions.length > 1;
  const displayPartner = partnerName.trim() || 'الشريكة';

  const badgePool = isPartnerView ? PARTNER_CONFIRMATION_BADGES : CONFIRMATION_BADGES;
  const badgeIndex = (questionNumber + selectedOptions.length) % badgePool.length;
  const confirmationBadge = isPartnerView
    ? `${badgePool[badgeIndex]} · ${displayPartner}`
    : badgePool[badgeIndex];

  const primaryHeadline = isPartnerView
    ? isMulti
      ? PARTNER_MULTI_HEADLINES[0]
      : PARTNER_SINGLE_HEADLINES[0]
    : isMulti
      ? profile.headlineMulti
      : profile.headlineSingle;

  const variantPool = isPartnerView
    ? isMulti
      ? PARTNER_MULTI_HEADLINES
      : PARTNER_SINGLE_HEADLINES
    : isMulti
      ? MULTI_HEADLINE_VARIANTS
      : SINGLE_HEADLINE_VARIANTS;

  const headline =
    questionNumber <= 1
      ? primaryHeadline
      : variantPool[(questionNumber - 2 + realm.order) % variantPool.length] ?? primaryHeadline;

  const firstCustomReflection =
    selectedOptions.length === 1 ? selectedOptions[0]?.reflection?.trim() : undefined;
  const questionClosing = question.closingNote?.trim();

  let diagnosticText: string;
  if (firstCustomReflection) {
    diagnosticText = firstCustomReflection;
  } else if (questionClosing) {
    diagnosticText = questionClosing;
  } else if (isPartnerView) {
    const partnerProfile = PARTNER_REALM_INSIGHTS[realm.id];
    if (partnerProfile) {
      diagnosticText =
        selectedOptions.length >= 3
          ? partnerProfile.broad
          : selectedOptions.length === 2
            ? partnerProfile.multi
            : partnerProfile.single;
    } else if (selectedOptions.length >= 3) {
      diagnosticText = `تعدّد إشارات ${displayPartner} يرسم صورة متكاملة وصريحة تساعد على فهم تفضيلاتها بشكل أعمق.`;
    } else if (selectedOptions.length === 2) {
      diagnosticText = `جمع ${displayPartner} بين هذين الخيارين يضيف عمقاً وتوازناً يكشف أكثر من جانب من إحساسها الصادق.`;
    } else {
      diagnosticText = `يعكس اختيار ${displayPartner} توجهاً واضحاً ووعياً لطيفاً بما يناسب شعورها في هذه اللحظة.`;
    }
  } else if (selectedOptions.length >= 3) {
    diagnosticText = profile.multiBroad;
  } else if (selectedOptions.length === 2) {
    diagnosticText = profile.multiLayered;
  } else {
    diagnosticText = profile.singleFocused;
  }

  return {
    confirmationBadge,
    headline,
    choiceEcho: summarizeChoices(selectedOptions),
    selectedOptions,
    diagnosticText,
    realmTitle: realm.title,
    setTitle: set.title,
    questionNumber,
  };
}
