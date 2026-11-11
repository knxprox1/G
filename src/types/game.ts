export type ScreenId = 'gateway' | 'mood' | 'deck' | 'reveal';

export type MoodId =
  | 'flame'
  | 'heart'
  | 'sparkles'
  | 'moon'
  | 'sun'
  | 'key'
  | 'gem'
  | 'feather'
  | 'eye'
  | 'crown'
  | 'music'
  | 'wine'
  | 'zap'
  | 'compass'
  | 'anchor'
  | 'infinity'
  | 'waves'
  | 'flower'
  | 'coffee'
  | 'gift'
  | 'tender'
  | 'deep'
  | 'passionate'
  | 'wild'
  | string;

export interface MoodConfig {
  id: MoodId;
  title: string;
  arabicTitle: string;
  tagline: string;
  accentColor: string;
  gradient: string;
  iconName: string;
}

export interface IntimateCardData {
  id: string;
  category: string;
  categoryArabic: string;
  title: string;
  actionHint: string;
  intensity: 1 | 2 | 3;
}
