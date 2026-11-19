/**
 * أداة الأمان والخصوصية المحلية لتطبيق «ليالي الورد»
 * - تغليف وتعمية البيانات المخزنة في localStorage بمفتاح جهاز عشوائي في IndexedDB (LWV1:v3) مع nonce لكل عملية حفظ
 * - إدارة رمز القفل الشخصي (٤ أرقام) عبر بصمة SHA-256 ممددة (٢٠,٠٠٠ جولة) وملح عشوائي خاص بالرمز مع حماية من المحاولات المتكررة
 */

import { base64ToBytes, bytesToBase64 } from './encoding';

const SECURITY_STORAGE_KEY = 'layali_alward_security_v1';
const LOCAL_KEYSTORE_DB = 'layali_alward_keystore_v1';
const LOCAL_KEYSTORE_STORE = 'keys';
const LOCAL_KEYSTORE_RECORD = 'device_vault_seed_v1';

const VAULT_PREFIX = 'LWV1:';
const VAULT_V2_PREFIX = 'LWV1:v2:';
const VAULT_V3_PREFIX = 'LWV1:v3:';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;
const PIN_HASH_ROUNDS_V2 = 20_000;
const PIN_HASH_ROUNDS_LEGACY = 1_000;
const SEED_WORDS_CACHE = new Map<string, Uint32Array>();

export type VaultKeyStatus = 'uninitialized' | 'ready' | 'idb-unavailable' | 'idb-error';

export type StorageWriteIssueReason = 'write-protected' | 'quota' | 'error';

export interface StorageWriteIssue {
  reason: StorageWriteIssueReason;
  storageKey: string;
}

type StorageWriteIssueListener = (issue: StorageWriteIssue) => void;

const storageWriteIssueListeners = new Set<StorageWriteIssueListener>();

export function subscribeStorageWriteIssues(
  listener: StorageWriteIssueListener
): () => void {
  storageWriteIssueListeners.add(listener);
  return () => {
    storageWriteIssueListeners.delete(listener);
  };
}

export function isStorageQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errObj = error as { name?: unknown; code?: unknown; message?: unknown };
  const name = typeof errObj.name === 'string' ? errObj.name : '';
  const msg = typeof errObj.message === 'string' ? errObj.message : '';
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    errObj.code === 22 ||
    errObj.code === 1014 ||
    /quota/i.test(msg)
  );
}

export function reportStorageWriteIssue(
  reason: StorageWriteIssueReason,
  storageKey: string
): void {
  const issue: StorageWriteIssue = { reason, storageKey };
  for (const listener of storageWriteIssueListeners) {
    try {
      listener(issue);
    } catch {
      // Isolate listener errors
    }
  }
}

let cachedDeviceVaultSecret: string | null = null;
let initLocalVaultPromise: Promise<void> | null = null;
let vaultKeyStatus: VaultKeyStatus = 'uninitialized';
let localVaultWriteProtected = false;
const pendingStorageBootIssues = new Map<string, StorageWriteIssue>();

export function recordBootStorageIssue(
  reason: StorageWriteIssueReason,
  storageKey: string
): void {
  const dedupeKey = `${reason}:${storageKey}`;
  if (!pendingStorageBootIssues.has(dedupeKey)) {
    pendingStorageBootIssues.set(dedupeKey, { reason, storageKey });
  }
}

export function consumePendingStorageWriteIssues(): StorageWriteIssue[] {
  if (pendingStorageBootIssues.size === 0) return [];
  const items = Array.from(pendingStorageBootIssues.values());
  pendingStorageBootIssues.clear();
  return items;
}

export function getLocalVaultStatus(): VaultKeyStatus {
  return vaultKeyStatus;
}

export function isLocalVaultWriteProtected(): boolean {
  return localVaultWriteProtected;
}

export function shouldBlockEncryptedStorageOverwrite(storageKey: string): boolean {
  if (!localVaultWriteProtected) return false;
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const existing = window.localStorage.getItem(storageKey);
    return typeof existing === 'string' && existing.startsWith(VAULT_V3_PREFIX);
  } catch {
    return false;
  }
}

export function resetLocalVaultSecurityStateForTests(): void {
  cachedDeviceVaultSecret = null;
  initLocalVaultPromise = null;
  vaultKeyStatus = 'uninitialized';
  localVaultWriteProtected = false;
  pendingStorageBootIssues.clear();
  storageWriteIssueListeners.clear();
}

export interface SecurityConfig {
  pinEnabled: boolean;
  pinHash: string | null;
  pinSalt: string | null;
  lockOnBackground: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
}

export function createInitialSecurityConfig(): SecurityConfig {
  return {
    pinEnabled: false,
    pinHash: null,
    pinSalt: null,
    lockOnBackground: true,
    failedAttempts: 0,
    lockedUntil: null,
  };
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getRandomBytesSync(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  const fallback = sha256WordsSync(`layali-fallback:${Date.now()}:${Math.random()}`);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = (fallback[i % fallback.length] >>> ((i % 4) * 8)) & 0xff;
  }
  return bytes;
}

export function generatePinSalt(): string {
  return toBase64Url(getRandomBytesSync(16));
}

function readDeviceSecretFromIdb(): Promise<{
  secret: string | null;
  status: Exclude<VaultKeyStatus, 'uninitialized'>;
}> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve({ secret: null, status: 'idb-unavailable' });
      return;
    }
    try {
      const req = indexedDB.open(LOCAL_KEYSTORE_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(LOCAL_KEYSTORE_STORE)) {
          db.createObjectStore(LOCAL_KEYSTORE_STORE);
        }
      };
      req.onerror = () => resolve({ secret: null, status: 'idb-error' });
      req.onblocked = () => resolve({ secret: null, status: 'idb-error' });
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(LOCAL_KEYSTORE_STORE, 'readwrite');
          const store = tx.objectStore(LOCAL_KEYSTORE_STORE);
          const getReq = store.get(LOCAL_KEYSTORE_RECORD);
          getReq.onerror = () => {
            db.close();
            resolve({ secret: null, status: 'idb-error' });
          };
          getReq.onsuccess = () => {
            const existing = getReq.result;
            if (typeof existing === 'string' && existing.length >= 24) {
              db.close();
              resolve({ secret: existing, status: 'ready' });
              return;
            }
            const freshSecret = toBase64Url(getRandomBytesSync(32));
            const putReq = store.put(freshSecret, LOCAL_KEYSTORE_RECORD);
            putReq.onsuccess = () => {
              db.close();
              resolve({ secret: freshSecret, status: 'ready' });
            };
            putReq.onerror = () => {
              db.close();
              resolve({ secret: null, status: 'idb-error' });
            };
          };
        } catch {
          db.close();
          resolve({ secret: null, status: 'idb-error' });
        }
      };
    } catch {
      resolve({ secret: null, status: 'idb-error' });
    }
  });
}

/**
 * Loads (or provisions once) the per-installation random device vault secret from IndexedDB
 * before React mounts so synchronous localStorage read/write calls stay fast and backwards-compatible.
 */
export function initLocalVaultKey(): Promise<void> {
  if (cachedDeviceVaultSecret) {
    vaultKeyStatus = 'ready';
    return Promise.resolve();
  }
  if (initLocalVaultPromise) return initLocalVaultPromise;
  initLocalVaultPromise = (async () => {
    let result = await readDeviceSecretFromIdb();
    if (result.status === 'idb-error') {
      await new Promise((r) => setTimeout(r, 80));
      result = await readDeviceSecretFromIdb();
    }
    vaultKeyStatus = result.status;
    if (result.secret) {
      cachedDeviceVaultSecret = result.secret;
      localVaultWriteProtected = false;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      const protectedKeys = [
        'layali_alward_progress_v1',
        'layali_alward_chat_v1',
        'layali_alward_cloud_v1',
        'layali_new_sync_sets_v1',
      ];
      for (const k of protectedKeys) {
        try {
          const val = window.localStorage.getItem(k);
          if (typeof val === 'string' && val.startsWith(VAULT_V3_PREFIX)) {
            localVaultWriteProtected = true;
            recordBootStorageIssue('write-protected', k);
            break;
          }
        } catch {
          // Ignore individual storage inspection failures
        }
      }
    }
  })()
    .catch(() => {
      vaultKeyStatus = 'idb-error';
    })
    .finally(() => {
      initLocalVaultPromise = null;
    });
  return initLocalVaultPromise;
}

/**
 * Pure TypeScript SHA-256 returning 8x 32-bit digest words (works synchronously across Browser, Capacitor WebView, and Node.js tests)
 */
function sha256WordsSync(input: string): Uint32Array {
  const bytes = new TextEncoder().encode(input);
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H;
}

function sha256HexSync(input: string): string {
  return Array.from(sha256WordsSync(input))
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

function hashPinLegacyV1(pin: string, deviceSalt: string): string {
  const normalizedSalt = deviceSalt.trim() || 'layali-alward-default-salt';
  let digest = `layali:pin:v1:${normalizedSalt}:${pin}`;
  for (let i = 0; i < PIN_HASH_ROUNDS_LEGACY; i += 1) {
    digest = sha256HexSync(`${digest}:${i}`);
  }
  return digest;
}

/**
 * Stretched salted PIN hash (20,000 rounds of SHA-256) bound to a dedicated random pinSalt.
 */
export function hashPinWithSalt(pin: string, pinSalt: string): string {
  const normalizedSalt = pinSalt.trim() || 'layali-alward-default-salt';
  let digest = `layali:pin:v2:${normalizedSalt}:${pin}`;
  for (let i = 0; i < PIN_HASH_ROUNDS_V2; i += 1) {
    digest = sha256HexSync(`${digest}:${i}`);
  }
  return `v2:${digest}`;
}

export function verifyPinDigest(
  pin: string,
  saltOrDeviceId: string,
  expectedHash: string | null,
  legacyDeviceSalt?: string
): boolean {
  if (!expectedHash || !isValidPinFormat(pin)) return false;
  if (expectedHash.startsWith('v2:')) {
    const candidate = hashPinWithSalt(pin, saltOrDeviceId);
    return constantTimeEqual(candidate, expectedHash);
  }
  const legacyCandidate = hashPinLegacyV1(pin, legacyDeviceSalt ?? saltOrDeviceId);
  return constantTimeEqual(legacyCandidate, expectedHash);
}

export function getPinLockoutRemainingMs(config: SecurityConfig, now = Date.now()): number {
  if (!config.lockedUntil) return 0;
  return Math.max(0, config.lockedUntil - now);
}

export function attemptPinUnlock(
  config: SecurityConfig,
  pin: string,
  legacyDeviceSalt: string,
  now = Date.now()
): {
  unlocked: boolean;
  nextConfig: SecurityConfig;
  remainingLockoutMs: number;
  attemptsLeft: number;
} {
  const remaining = getPinLockoutRemainingMs(config, now);
  if (remaining > 0) {
    return {
      unlocked: false,
      nextConfig: config,
      remainingLockoutMs: remaining,
      attemptsLeft: 0,
    };
  }

  const effectiveSalt = config.pinSalt || legacyDeviceSalt;
  if (verifyPinDigest(pin, effectiveSalt, config.pinHash, legacyDeviceSalt)) {
    const isLegacyDigest = Boolean(config.pinHash && !config.pinHash.startsWith('v2:'));
    const upgradedSalt = isLegacyDigest ? generatePinSalt() : config.pinSalt;
    const upgradedHash =
      isLegacyDigest && upgradedSalt ? hashPinWithSalt(pin, upgradedSalt) : config.pinHash;

    return {
      unlocked: true,
      nextConfig: {
        ...config,
        pinSalt: upgradedSalt ?? null,
        pinHash: upgradedHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
      remainingLockoutMs: 0,
      attemptsLeft: MAX_FAILED_ATTEMPTS,
    };
  }

  const nextFailed = config.failedAttempts + 1;
  const shouldLockout = nextFailed >= MAX_FAILED_ATTEMPTS;
  const nextConfig: SecurityConfig = {
    ...config,
    failedAttempts: shouldLockout ? 0 : nextFailed,
    lockedUntil: shouldLockout ? now + LOCKOUT_DURATION_MS : null,
  };

  return {
    unlocked: false,
    nextConfig,
    remainingLockoutMs: shouldLockout ? LOCKOUT_DURATION_MS : 0,
    attemptsLeft: shouldLockout ? 0 : Math.max(0, MAX_FAILED_ATTEMPTS - nextFailed),
  };
}

export function loadSecurityConfig(): SecurityConfig {
  const fallback = createInitialSecurityConfig();
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(SECURITY_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SecurityConfig>;
    if (!parsed || typeof parsed !== 'object') return fallback;
    const pinHash =
      typeof parsed.pinHash === 'string' && /^(?:v2:)?[0-9a-f]{64}$/.test(parsed.pinHash)
        ? parsed.pinHash
        : null;
    const pinSalt =
      typeof parsed.pinSalt === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(parsed.pinSalt)
        ? parsed.pinSalt
        : null;
    return {
      pinEnabled: Boolean(parsed.pinEnabled && pinHash),
      pinHash,
      pinSalt,
      lockOnBackground:
        typeof parsed.lockOnBackground === 'boolean' ? parsed.lockOnBackground : true,
      failedAttempts:
        typeof parsed.failedAttempts === 'number' && parsed.failedAttempts >= 0
          ? Math.min(MAX_FAILED_ATTEMPTS, Math.floor(parsed.failedAttempts))
          : 0,
      lockedUntil:
        typeof parsed.lockedUntil === 'number' && parsed.lockedUntil > Date.now()
          ? parsed.lockedUntil
          : null,
    };
  } catch {
    return fallback;
  }
}

export function saveSecurityConfig(config: SecurityConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    reportStorageWriteIssue(
      isStorageQuotaError(err) ? 'quota' : 'error',
      SECURITY_STORAGE_KEY
    );
  }
}

export function clearSecurityConfig(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(SECURITY_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors cleanly
  }
}

function getCachedSeedWords(secretSeed: string): Uint32Array {
  const cached = SEED_WORDS_CACHE.get(secretSeed);
  if (cached) return cached;
  const derived = sha256WordsSync(`layali-vault-v2:${secretSeed}`);
  if (SEED_WORDS_CACHE.size >= 8) {
    SEED_WORDS_CACHE.clear();
  }
  SEED_WORDS_CACHE.set(secretSeed, derived);
  return derived;
}

/**
 * Fast deterministic stream cipher keyed by cached SHA-256 seed words (zero per-block string/SHA-256 allocations).
 */
function deriveFastLocalKeyStream(length: number, secretSeed: string): Uint8Array {
  const words = getCachedSeedWords(secretSeed);
  const out = new Uint8Array(length);
  let s0 = words[0] ^ words[4] ^ 0x9e3779b9;
  let s1 = words[1] ^ words[5] ^ 0x7f4a7c15;
  let s2 = words[2] ^ words[6] ^ 0x85ebca6b;
  let s3 = words[3] ^ words[7] ^ 0xc2b2ae35;

  let offset = 0;
  let counter = 1;
  while (offset < length) {
    s0 = (s0 + Math.imul(s1 ^ counter, 0x85ebca6b)) >>> 0;
    s1 = ((s1 << 13) | (s1 >>> 19)) ^ s2;
    s2 = (s2 + Math.imul(s3 ^ s0, 0xc2b2ae35)) >>> 0;
    s3 = ((s3 << 7) | (s3 >>> 25)) ^ s0;
    const z = (s0 ^ s1 ^ s2 ^ s3) >>> 0;

    if (offset + 4 <= length) {
      out[offset] = z & 0xff;
      out[offset + 1] = (z >>> 8) & 0xff;
      out[offset + 2] = (z >>> 16) & 0xff;
      out[offset + 3] = (z >>> 24) & 0xff;
      offset += 4;
    } else {
      for (let b = 0; b < 4 && offset < length; b += 1) {
        out[offset] = (z >>> (b * 8)) & 0xff;
        offset += 1;
      }
    }
    counter += 1;
  }
  return out;
}

/**
 * Legacy stream key derivation retained solely for backwards-compatible unsealing of existing LWV1: entries.
 */
function deriveLegacyLocalKeyStream(length: number, secretSeed: string): Uint8Array {
  const out = new Uint8Array(length);
  let blockIndex = 0;
  let offset = 0;
  while (offset < length) {
    const words = sha256WordsSync(`layali-vault:${secretSeed}:${blockIndex}`);
    for (let i = 0; i < words.length && offset < length; i += 1) {
      const w = words[i];
      for (let shift = 24; shift >= 0 && offset < length; shift -= 8) {
        out[offset] = (w >>> shift) & 0xff;
        offset += 1;
      }
    }
    blockIndex += 1;
  }
  return out;
}

function getLegacyOriginSeed(): string {
  if (typeof window === 'undefined') return 'layali-alward-node-vault';
  const origin = window.location?.origin ?? 'layali-local';
  return `layali-alward-vault:${origin}`;
}

function getActiveVaultSeed(): string {
  return cachedDeviceVaultSecret ?? getLegacyOriginSeed();
}

function computeV3IntegrityTag(seed: string, nonceB64: string, cipherB64: string): string {
  return sha256HexSync(`layali-vault-v3-mac:${seed}:${nonceB64}:${cipherB64}`).slice(0, 16);
}

export function sealLocalStoragePayload(plainJson: string, seedOverride?: string): string {
  const effectiveSeed = seedOverride ?? getActiveVaultSeed();
  const nonceB64 = toBase64Url(getRandomBytesSync(12));
  const plainBytes = new TextEncoder().encode(plainJson);
  const keyStream = deriveFastLocalKeyStream(
    plainBytes.length,
    `v3:${effectiveSeed}:${nonceB64}`
  );
  const cipher = new Uint8Array(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i += 1) {
    cipher[i] = plainBytes[i] ^ keyStream[i];
  }
  const cipherB64 = bytesToBase64(cipher);
  const tag = computeV3IntegrityTag(effectiveSeed, nonceB64, cipherB64);
  return `${VAULT_V3_PREFIX}${nonceB64}:${tag}:${cipherB64}`;
}

function tryUnsealV3(
  nonceB64: string,
  tag: string,
  cipherB64: string,
  seedCandidate: string
): string | null {
  const expectedTag = computeV3IntegrityTag(seedCandidate, nonceB64, cipherB64);
  if (!constantTimeEqual(tag, expectedTag)) {
    return null;
  }
  const cipher = base64ToBytes(cipherB64);
  const keyStream = deriveFastLocalKeyStream(
    cipher.length,
    `v3:${seedCandidate}:${nonceB64}`
  );
  const plain = new Uint8Array(cipher.length);
  for (let i = 0; i < cipher.length; i += 1) {
    plain[i] = cipher[i] ^ keyStream[i];
  }
  return new TextDecoder().decode(plain);
}

export function unsealLocalStoragePayload(rawStored: string, seedOverride?: string): string {
  if (rawStored.startsWith(VAULT_V3_PREFIX)) {
    const rest = rawStored.slice(VAULT_V3_PREFIX.length);
    const firstColon = rest.indexOf(':');
    const secondColon = firstColon >= 0 ? rest.indexOf(':', firstColon + 1) : -1;
    if (firstColon <= 0 || secondColon <= firstColon + 1) {
      throw new Error('صيغة البيانات المحلية المشفرة غير صالحة');
    }
    const nonceB64 = rest.slice(0, firstColon);
    const tag = rest.slice(firstColon + 1, secondColon);
    const cipherB64 = rest.slice(secondColon + 1);

    const primarySeed = seedOverride ?? getActiveVaultSeed();
    const unsealedPrimary = tryUnsealV3(nonceB64, tag, cipherB64, primarySeed);
    if (unsealedPrimary !== null) {
      return unsealedPrimary;
    }
    if (!seedOverride && cachedDeviceVaultSecret) {
      const unsealedLegacySeed = tryUnsealV3(nonceB64, tag, cipherB64, getLegacyOriginSeed());
      if (unsealedLegacySeed !== null) {
        return unsealedLegacySeed;
      }
    }
    if (!seedOverride && vaultKeyStatus !== 'ready') {
      localVaultWriteProtected = true;
      recordBootStorageIssue('write-protected', 'local_vault_key');
    }
    throw new Error('تعذر التحقق من سلامة البيانات المحلية المشفرة');
  }

  const legacySeed = seedOverride ?? getLegacyOriginSeed();
  if (rawStored.startsWith(VAULT_V2_PREFIX)) {
    const cipherB64 = rawStored.slice(VAULT_V2_PREFIX.length);
    const cipher = base64ToBytes(cipherB64);
    const keyStream = deriveFastLocalKeyStream(cipher.length, legacySeed);
    const plain = new Uint8Array(cipher.length);
    for (let i = 0; i < cipher.length; i += 1) {
      plain[i] = cipher[i] ^ keyStream[i];
    }
    return new TextDecoder().decode(plain);
  }
  if (!rawStored.startsWith(VAULT_PREFIX)) {
    return rawStored;
  }
  const cipherB64 = rawStored.slice(VAULT_PREFIX.length);
  const cipher = base64ToBytes(cipherB64);
  const keyStream = deriveLegacyLocalKeyStream(cipher.length, legacySeed);
  const plain = new Uint8Array(cipher.length);
  for (let i = 0; i < cipher.length; i += 1) {
    plain[i] = cipher[i] ^ keyStream[i];
  }
  return new TextDecoder().decode(plain);
}
