import { sanitizeAnswersBySet } from '../game/engine';
import { base64ToBytes, bytesToBase64 } from './encoding';
import {
  isLocalVaultWriteProtected,
  isStorageQuotaError,
  recordBootStorageIssue,
  reportStorageWriteIssue,
  sealLocalStoragePayload,
  shouldBlockEncryptedStorageOverwrite,
  unsealLocalStoragePayload,
} from './security';

export const CLOUD_STATE_STORAGE_KEY = 'layali_alward_cloud_v1';
const MAX_VAULT_ID_LEN = 64;
const MAX_INVITE_CODE_LEN = 220;
export const DEFAULT_PUBLIC_WEB_APP_URL =
  'https://ais-pre-gqdouroute4griuffpz5ja-19314598769.europe-west3.run.app';

export interface LocalCloudSyncState {
  autoSyncEnabled: boolean;
  vaultId: string | null;
  vaultKey: string | null;
  accountUid: string | null;
  lastCloudSyncedAt: number | null;
  pendingUpload: boolean;
  pendingProfileReset: boolean;
}

export function createInitialCloudSyncState(): LocalCloudSyncState {
  return {
    autoSyncEnabled: true,
    vaultId: null,
    vaultKey: null,
    accountUid: null,
    lastCloudSyncedAt: null,
    pendingUpload: false,
    pendingProfileReset: false,
  };
}

export interface DecryptedCloudSnapshot {
  answersBySet: Record<string, Record<string, string[]>>;
  completedSetIds: string[];
  updatedAt: number;
  playerName: string;
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getCryptoSubtle(): SubtleCrypto {
  const gCrypto = globalThis.crypto;
  if (!gCrypto || !gCrypto.subtle) {
    throw new Error('WebCrypto غير متاح في هذه البيئة');
  }
  return gCrypto.subtle;
}

export function generateCloudInviteCredentials(): {
  vaultId: string;
  vaultKey: string;
  inviteCode: string;
} {
  const idBytes = new Uint8Array(12);
  const keyBytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(idBytes);
  globalThis.crypto.getRandomValues(keyBytes);

  const vaultId = `lw_${toBase64Url(idBytes)}`.slice(0, MAX_VAULT_ID_LEN);
  const vaultKey = toBase64Url(keyBytes);
  return {
    vaultId,
    vaultKey,
    inviteCode: `${vaultId}.${vaultKey}`,
  };
}

export function parseCloudInviteCode(
  raw: string
): { vaultId: string; vaultKey: string } | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_INVITE_CODE_LEN) return null;
  const parts = trimmed.split('.');
  if (parts.length !== 2) return null;
  const [vaultId, vaultKey] = parts;
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(vaultId)) return null;
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(vaultKey)) return null;
  return { vaultId, vaultKey };
}

function normalizePublicAppOrigin(rawUrl?: string | null): string | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    const cleanPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return null;
  }
}

function isLocalWebHostOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol === 'capacitor:' || protocol === 'file:') return true;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  } catch {
    return true;
  }
}

/**
 * يبني رابط دعوة HTTPS صالحاً للمشاركة حتى عند التشغيل داخل Capacitor Android WebView (حيث يكون origin محلياً).
 */
export function buildCloudInviteShareUrl(
  inviteCode: string | null,
  options?: {
    isCapacitorNative?: boolean;
    publicAppUrl?: string | null;
    currentHref?: string | null;
  }
): string | null {
  if (!inviteCode) return null;
  const parsed = parseCloudInviteCode(inviteCode);
  if (!parsed) return null;
  const normalizedCode = `${parsed.vaultId}.${parsed.vaultKey}`;
  const fragment = `#joinVault=${encodeURIComponent(normalizedCode)}`;

  const explicitOrigin = normalizePublicAppOrigin(options?.publicAppUrl);
  if (explicitOrigin) {
    return `${explicitOrigin}/${fragment}`.replace(/\/\/#/, '/#');
  }

  const href =
    options?.currentHref ??
    (typeof window !== 'undefined' && window.location ? window.location.href : null);

  if (!options?.isCapacitorNative && href) {
    try {
      const current = new URL(href);
      if (!isLocalWebHostOrigin(current.origin) || !options?.isCapacitorNative) {
        if (!isLocalWebHostOrigin(current.origin)) {
          return `${current.origin}${current.pathname}${fragment}`;
        }
      }
    } catch {
      // Fall through to canonical public URL
    }
  }

  if (options?.isCapacitorNative) {
    return `${DEFAULT_PUBLIC_WEB_APP_URL}/${fragment}`;
  }

  if (href) {
    try {
      const current = new URL(href);
      return `${current.origin}${current.pathname}${fragment}`;
    } catch {
      // Fall through
    }
  }

  return `${DEFAULT_PUBLIC_WEB_APP_URL}/${fragment}`;
}

export function extractInviteCodeFromUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsedUrl = new URL(rawUrl, DEFAULT_PUBLIC_WEB_APP_URL);
    const hashRaw = parsedUrl.hash.startsWith('#')
      ? new URLSearchParams(parsedUrl.hash.slice(1)).get('joinVault')
      : null;
    const searchRaw = parsedUrl.searchParams.get('joinVault');
    const candidate = hashRaw || searchRaw;
    if (!candidate) return null;
    const parsed = parseCloudInviteCode(candidate);
    return parsed ? `${parsed.vaultId}.${parsed.vaultKey}` : null;
  } catch {
    return null;
  }
}

const AES_KEY_CACHE = new Map<string, Promise<CryptoKey>>();

function deriveAesGcmKey(vaultKey: string): Promise<CryptoKey> {
  const cached = AES_KEY_CACHE.get(vaultKey);
  if (cached) return cached;

  const promise = (async () => {
    const subtle = getCryptoSubtle();
    const keyHash = await subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`layali-cloud-e2ee:v1:${vaultKey}`)
    );
    return subtle.importKey('raw', keyHash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  })().catch((err) => {
    AES_KEY_CACHE.delete(vaultKey);
    throw err;
  });

  if (AES_KEY_CACHE.size >= 8) {
    AES_KEY_CACHE.clear();
  }
  AES_KEY_CACHE.set(vaultKey, promise);
  return promise;
}

const JOIN_HASH_CACHE = new Map<string, Promise<string>>();

/**
 * Derives a non-reversible SHA-256 commitment hash from vaultKey so partners joining
 * an open vault slot must prove knowledge of the secret invite key without storing vaultKey on Firestore.
 */
export function deriveJoinTokenHash(vaultKey: string): Promise<string> {
  const cached = JOIN_HASH_CACHE.get(vaultKey);
  if (cached) return cached;

  const promise = (async () => {
    const subtle = getCryptoSubtle();
    const digest = await subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`layali-cloud-join:v1:${vaultKey}`)
    );
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  })().catch((err) => {
    JOIN_HASH_CACHE.delete(vaultKey);
    throw err;
  });

  if (JOIN_HASH_CACHE.size >= 8) {
    JOIN_HASH_CACHE.clear();
  }
  JOIN_HASH_CACHE.set(vaultKey, promise);
  return promise;
}

export async function encryptSnapshotForCloud(
  snapshot: DecryptedCloudSnapshot,
  vaultKey: string
): Promise<{ cipherText: string; cipherIv: string }> {
  const subtle = getCryptoSubtle();
  const cryptoKey = await deriveAesGcmKey(vaultKey);
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);

  const encoded = new TextEncoder().encode(JSON.stringify(snapshot));
  const encryptedBuf = await subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);

  return {
    cipherText: bytesToBase64(new Uint8Array(encryptedBuf)),
    cipherIv: bytesToBase64(iv),
  };
}

export async function decryptSnapshotFromCloud(
  cipherText: string,
  cipherIv: string,
  vaultKey: string
): Promise<DecryptedCloudSnapshot | null> {
  if (!cipherText || !cipherIv || !vaultKey) return null;
  try {
    const subtle = getCryptoSubtle();
    const cryptoKey = await deriveAesGcmKey(vaultKey);
    const ivBytes = base64ToBytes(cipherIv);
    const cipherBytes = base64ToBytes(cipherText);

    const decryptedBuf = await subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      cryptoKey,
      cipherBytes
    );
    const decodedStr = new TextDecoder().decode(new Uint8Array(decryptedBuf));
    const parsed = JSON.parse(decodedStr) as Partial<DecryptedCloudSnapshot>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const cleanCompleted = Array.isArray(parsed.completedSetIds)
      ? Array.from(
          new Set(
            parsed.completedSetIds
              .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 96)
              .slice(0, 500)
          )
        )
      : [];

    return {
      answersBySet: sanitizeAnswersBySet(parsed.answersBySet),
      completedSetIds: cleanCompleted,
      updatedAt:
        typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
          ? parsed.updatedAt
          : 0,
      playerName:
        typeof parsed.playerName === 'string' && parsed.playerName.trim()
          ? parsed.playerName.trim().slice(0, 24)
          : 'الشريكة',
    };
  } catch {
    return null;
  }
}

export interface DecryptedCloudChatMessage {
  id: string;
  text: string;
  senderName: string;
  createdAt: number;
}

export async function encryptChatMessageForCloud(
  message: DecryptedCloudChatMessage,
  vaultKey: string
): Promise<{ cipherText: string; cipherIv: string }> {
  const subtle = getCryptoSubtle();
  const cryptoKey = await deriveAesGcmKey(vaultKey);
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);

  const sanitized: DecryptedCloudChatMessage = {
    id: message.id.trim().slice(0, 64),
    text: message.text.trim().slice(0, 1000),
    senderName: (message.senderName.trim() || 'الشريك').slice(0, 24),
    createdAt: Math.max(0, Math.floor(message.createdAt)),
  };

  const encoded = new TextEncoder().encode(JSON.stringify(sanitized));
  const encryptedBuf = await subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);

  return {
    cipherText: bytesToBase64(new Uint8Array(encryptedBuf)),
    cipherIv: bytesToBase64(iv),
  };
}

export async function decryptChatMessageFromCloud(
  cipherText: string,
  cipherIv: string,
  vaultKey: string
): Promise<DecryptedCloudChatMessage | null> {
  if (!cipherText || !cipherIv || !vaultKey) return null;
  try {
    const subtle = getCryptoSubtle();
    const cryptoKey = await deriveAesGcmKey(vaultKey);
    const ivBytes = base64ToBytes(cipherIv);
    const cipherBytes = base64ToBytes(cipherText);

    const decryptedBuf = await subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      cryptoKey,
      cipherBytes
    );
    const decodedStr = new TextDecoder().decode(new Uint8Array(decryptedBuf));
    const parsed = JSON.parse(decodedStr) as Partial<DecryptedCloudChatMessage>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (typeof parsed.id !== 'string' || !/^[a-zA-Z0-9_-]{4,64}$/.test(parsed.id)) {
      return null;
    }
    if (typeof parsed.text !== 'string' || !parsed.text.trim()) {
      return null;
    }
    return {
      id: parsed.id,
      text: parsed.text.trim().slice(0, 1000),
      senderName:
        typeof parsed.senderName === 'string' && parsed.senderName.trim()
          ? parsed.senderName.trim().slice(0, 24)
          : 'الشريك',
      createdAt:
        typeof parsed.createdAt === 'number' && parsed.createdAt >= 0
          ? parsed.createdAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

export function loadCloudSyncState(): LocalCloudSyncState {
  const fallback = createInitialCloudSyncState();
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(CLOUD_STATE_STORAGE_KEY);
    if (!raw) return fallback;
    const unsealed = unsealLocalStoragePayload(raw);
    const parsed = JSON.parse(unsealed) as Partial<LocalCloudSyncState>;
    if (!parsed || typeof parsed !== 'object') return fallback;

    const vaultId =
      typeof parsed.vaultId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(parsed.vaultId)
        ? parsed.vaultId
        : null;
    const vaultKey =
      typeof parsed.vaultKey === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(parsed.vaultKey)
        ? parsed.vaultKey
        : null;

    const accountUid =
      typeof parsed.accountUid === 'string' && /^[a-zA-Z0-9:_-]{4,128}$/.test(parsed.accountUid)
        ? parsed.accountUid
        : null;

    return {
      autoSyncEnabled:
        typeof parsed.autoSyncEnabled === 'boolean' ? parsed.autoSyncEnabled : true,
      vaultId: vaultId && vaultKey ? vaultId : null,
      vaultKey: vaultId && vaultKey ? vaultKey : null,
      accountUid: vaultId && vaultKey ? accountUid : null,
      lastCloudSyncedAt:
        typeof parsed.lastCloudSyncedAt === 'number' ? parsed.lastCloudSyncedAt : null,
      pendingUpload: Boolean(parsed.pendingUpload && vaultId && vaultKey),
      pendingProfileReset: Boolean(parsed.pendingProfileReset),
    };
  } catch {
    recordBootStorageIssue(
      isLocalVaultWriteProtected() ? 'write-protected' : 'error',
      CLOUD_STATE_STORAGE_KEY
    );
    return fallback;
  }
}

export function saveCloudSyncState(state: LocalCloudSyncState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (shouldBlockEncryptedStorageOverwrite(CLOUD_STATE_STORAGE_KEY)) {
    reportStorageWriteIssue('write-protected', CLOUD_STATE_STORAGE_KEY);
    return;
  }
  try {
    const sealed = sealLocalStoragePayload(JSON.stringify(state));
    window.localStorage.setItem(CLOUD_STATE_STORAGE_KEY, sealed);
  } catch (err) {
    reportStorageWriteIssue(
      isStorageQuotaError(err) ? 'quota' : 'error',
      CLOUD_STATE_STORAGE_KEY
    );
  }
}

export function clearCloudSyncState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(CLOUD_STATE_STORAGE_KEY);
  } catch {
    // Ignore storage errors cleanly
  }
}
