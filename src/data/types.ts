export type RealmMotif = 'crescent' | 'orb' | 'ribbon';

export type DeviceRole = 'wife' | 'husband';

export interface QuestionOption {
  id: string;
  label: string;
  marker: string;
  /** عبارة وصفية أو تشخيصية مخصصة لهذا الخيار تظهر في القصاصة الفنية */
  reflection?: string;
}

export interface GameQuestion {
  id: string;
  prompt: string;
  allowMultiple: boolean;
  minSelect: number;
  maxSelect?: number;
  options: QuestionOption[];
  /** ملاحظة ختامية مخصصة للسؤال عند ظهوره في القصاصة الفنية */
  closingNote?: string;
}

export interface QuestionSet {
  id: string;
  realmId: string;
  indexLabel: string;
  title: string;
  subtitle: string;
  questions: GameQuestion[];
}

export interface GameRealm {
  id: string;
  order: number;
  romanNumeral: string;
  title: string;
  tagline: string;
  description: string;
  accentHex: string;
  secondaryHex: string;
  artworkSrc: string;
  motif: RealmMotif;
  sets: QuestionSet[];
}

export interface GameMode {
  id: string;
  romanNumeral: string;
  title: string;
  tagline: string;
  accentHex: string;
  artworkSrc: string;
  motif: RealmMotif;
  isAvailable: boolean;
  statusLabel: string;
  ctaLabel: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  motionEnabled: boolean;
  hapticsEnabled: boolean;
  privacyCurtainEnabled: boolean;
  cloudAutoSyncEnabled: boolean;
}

export interface PartnerSnapshot {
  partnerName: string;
  /** Map of setId -> questionId -> selected option IDs received from partner */
  answersBySet: Record<string, Record<string, string[]>>;
  completedSetIds: string[];
  lastSyncedAt: number | null;
  pairedDeviceId: string | null;
  pairedDeviceLabel: string | null;
}

export interface ModeProgressRegistry {
  questions: {
    updatedAt: number | null;
  };
  cards: {
    sessionsCompleted: number;
    drawnCount: number;
    favoriteCardIds: string[];
    updatedAt: number | null;
  };
  dialogue: {
    sessionsCompleted: number;
    discussedTopicIds: string[];
    favoriteTopicIds: string[];
    updatedAt: number | null;
  };
  challenges: {
    sessionsCompleted: number;
    completedChallengeIds: string[];
    updatedAt: number | null;
  };
}

export interface GameProgress {
  deviceId: string;
  role: DeviceRole;
  /** Whether the user has completed the one-time first-install edition choice (Wife or Husband) */
  roleConfigured: boolean;
  playerName: string;
  /** Active/local answers for the Questions mode */
  answersBySet: Record<string, Record<string, string[]>>;
  /** IDs of completed sets for local Questions mode */
  completedSetIds: string[];
  modeProgress: ModeProgressRegistry;
  partnerSnapshot: PartnerSnapshot;
  settings: GameSettings;
}

export type ChatDeliveryVia = 'local' | 'nearby' | 'cloud' | 'hybrid';

export interface ChatMessage {
  id: string;
  senderRole: DeviceRole;
  senderName: string;
  senderDeviceId: string;
  text: string;
  createdAt: number;
  deliveredVia: ChatDeliveryVia;
  pendingNearbyAck: boolean;
  pendingCloudUpload: boolean;
}

export type ScreenId =
  | 'home'
  | 'modes'
  | 'realms'
  | 'question'
  | 'completion'
  | 'log'
  | 'chat'
  | 'profile';
