import type { ChatDeliveryVia, ChatMessage, DeviceRole } from '../data/types';
import {
  isLocalVaultWriteProtected,
  isStorageQuotaError,
  recordBootStorageIssue,
  reportStorageWriteIssue,
  sealLocalStoragePayload,
  shouldBlockEncryptedStorageOverwrite,
  unsealLocalStoragePayload,
} from './security';

export const CHAT_STORAGE_KEY = 'layali_alward_chat_v1';
export const MAX_CHAT_HISTORY = 200;
export const MAX_CHAT_MESSAGE_CHARS = 1000;

export interface LocalChatStore {
  clearedAt: number;
  pendingCloudClearAt: number | null;
  pendingCloudClearVaultId?: string | null;
  messages: ChatMessage[];
}

export function createInitialChatStore(): LocalChatStore {
  return {
    clearedAt: 0,
    pendingCloudClearAt: null,
    pendingCloudClearVaultId: null,
    messages: [],
  };
}

export function generateChatMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `msg_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `msg_${Date.now().toString(36)}_${hex}`;
  }
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function createLocalChatMessage(params: {
  id?: string;
  senderRole: DeviceRole;
  senderName: string;
  senderDeviceId: string;
  text: string;
  createdAt?: number;
  needsCloudUpload: boolean;
  needsNearbyAck: boolean;
}): ChatMessage {
  const cleanText = params.text.trim().slice(0, MAX_CHAT_MESSAGE_CHARS);
  return {
    id: params.id ?? generateChatMessageId(),
    senderRole: params.senderRole,
    senderName: (params.senderName.trim() || (params.senderRole === 'wife' ? 'الزوجة' : 'الزوج')).slice(0, 24),
    senderDeviceId: (params.senderDeviceId.trim() || 'lw-device').slice(0, 64),
    text: cleanText,
    createdAt: params.createdAt ?? Date.now(),
    deliveredVia: 'local',
    pendingNearbyAck: params.needsNearbyAck,
    pendingCloudUpload: params.needsCloudUpload,
  };
}

function combineDeliveryVia(a: ChatDeliveryVia, b: ChatDeliveryVia): ChatDeliveryVia {
  if (a === 'hybrid' || b === 'hybrid') return 'hybrid';
  if ((a === 'nearby' && b === 'cloud') || (a === 'cloud' && b === 'nearby')) {
    return 'hybrid';
  }
  if (a === 'nearby' || b === 'nearby') return 'nearby';
  if (a === 'cloud' || b === 'cloud') return 'cloud';
  return 'local';
}

function sortAndTrimMessages(messages: ChatMessage[]): ChatMessage[] {
  const sorted = [...messages].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)
  );
  if (sorted.length <= MAX_CHAT_HISTORY) return sorted;

  const splitAt = sorted.length - MAX_CHAT_HISTORY;
  const olderSlice = sorted.slice(0, splitAt);
  const newestSlice = sorted.slice(splitAt);
  const olderPending = olderSlice.filter((m) => m.pendingCloudUpload || m.pendingNearbyAck);

  if (olderPending.length === 0) {
    return newestSlice;
  }

  const protectedIds = new Set(
    olderPending.slice(-MAX_CHAT_HISTORY).map((m) => m.id)
  );
  const remainingSlots = Math.max(0, MAX_CHAT_HISTORY - protectedIds.size);
  const retainedNewest = remainingSlots > 0 ? newestSlice.slice(-remainingSlots) : [];
  for (const m of retainedNewest) {
    protectedIds.add(m.id);
  }
  return sorted.filter((m) => protectedIds.has(m.id));
}

/**
 * Pure idempotent merge supporting both P2P Nearby and Cloud E2EE messages
 * without duplicating messages arriving over both transports.
 */
export function mergeIncomingChatMessage(
  store: LocalChatStore,
  incoming: ChatMessage
): LocalChatStore {
  if (!incoming.text.trim() || incoming.createdAt <= store.clearedAt) {
    return store;
  }

  const idx = store.messages.findIndex((m) => m.id === incoming.id);
  if (idx >= 0) {
    const existing = store.messages[idx];
    const nextVia = combineDeliveryVia(existing.deliveredVia, incoming.deliveredVia);
    const nextPendingNearby =
      incoming.deliveredVia === 'nearby' || incoming.deliveredVia === 'hybrid'
        ? false
        : existing.pendingNearbyAck && incoming.pendingNearbyAck;
    const nextPendingCloud =
      incoming.deliveredVia === 'cloud' || incoming.deliveredVia === 'hybrid'
        ? false
        : existing.pendingCloudUpload && incoming.pendingCloudUpload;

    if (
      existing.deliveredVia === nextVia &&
      existing.pendingNearbyAck === nextPendingNearby &&
      existing.pendingCloudUpload === nextPendingCloud
    ) {
      return store;
    }

    const updated = [...store.messages];
    updated[idx] = {
      ...existing,
      deliveredVia: nextVia,
      pendingNearbyAck: nextPendingNearby,
      pendingCloudUpload: nextPendingCloud,
    };
    return {
      ...store,
      messages: updated,
    };
  }

  return {
    ...store,
    messages: sortAndTrimMessages([...store.messages, incoming]),
  };
}

/**
 * دمج دفعة رسائل دفعة واحدة مع الحفاظ على منع التكرار والفرز والتقليص مرة واحدة فقط (O(N log N)).
 */
export function mergeIncomingChatMessagesBatch(
  store: LocalChatStore,
  incomingList: ChatMessage[]
): LocalChatStore {
  if (incomingList.length === 0) return store;

  const byId = new Map<string, ChatMessage>();
  for (const msg of store.messages) {
    byId.set(msg.id, msg);
  }

  let changed = false;
  let added = false;

  for (const incoming of incomingList) {
    if (!incoming.text.trim() || incoming.createdAt <= store.clearedAt) {
      continue;
    }
    const existing = byId.get(incoming.id);
    if (existing) {
      const nextVia = combineDeliveryVia(existing.deliveredVia, incoming.deliveredVia);
      const nextPendingNearby =
        incoming.deliveredVia === 'nearby' || incoming.deliveredVia === 'hybrid'
          ? false
          : existing.pendingNearbyAck && incoming.pendingNearbyAck;
      const nextPendingCloud =
        incoming.deliveredVia === 'cloud' || incoming.deliveredVia === 'hybrid'
          ? false
          : existing.pendingCloudUpload && incoming.pendingCloudUpload;

      if (
        existing.deliveredVia !== nextVia ||
        existing.pendingNearbyAck !== nextPendingNearby ||
        existing.pendingCloudUpload !== nextPendingCloud
      ) {
        byId.set(incoming.id, {
          ...existing,
          deliveredVia: nextVia,
          pendingNearbyAck: nextPendingNearby,
          pendingCloudUpload: nextPendingCloud,
        });
        changed = true;
      }
    } else {
      byId.set(incoming.id, incoming);
      changed = true;
      added = true;
    }
  }

  if (!changed) return store;

  const nextMessages = Array.from(byId.values());
  return {
    ...store,
    messages: added ? sortAndTrimMessages(nextMessages) : nextMessages,
  };
}

export function markChatMessageDelivered(
  store: LocalChatStore,
  messageId: string,
  via: 'nearby' | 'cloud'
): LocalChatStore {
  const idx = store.messages.findIndex((m) => m.id === messageId);
  if (idx < 0) return store;
  const existing = store.messages[idx];
  const nextVia = combineDeliveryVia(existing.deliveredVia, via);
  const nextPendingNearby = via === 'nearby' ? false : existing.pendingNearbyAck;
  const nextPendingCloud = via === 'cloud' ? false : existing.pendingCloudUpload;

  if (
    existing.deliveredVia === nextVia &&
    existing.pendingNearbyAck === nextPendingNearby &&
    existing.pendingCloudUpload === nextPendingCloud
  ) {
    return store;
  }

  const nextMessages = [...store.messages];
  nextMessages[idx] = {
    ...existing,
    deliveredVia: nextVia,
    pendingNearbyAck: nextPendingNearby,
    pendingCloudUpload: nextPendingCloud,
  };
  return {
    ...store,
    messages: nextMessages,
  };
}

export function clearLocalChatHistory(
  store: LocalChatStore,
  clearedAt = Date.now(),
  options?: {
    pendingCloudClearAt?: number | null;
    pendingCloudClearVaultId?: string | null;
  }
): LocalChatStore {
  const nextClearedAt = Math.max(store.clearedAt, clearedAt);
  const nextPendingCloudClearAt =
    options && 'pendingCloudClearAt' in options
      ? options.pendingCloudClearAt ?? null
      : store.pendingCloudClearAt;
  const nextPendingCloudClearVaultId =
    options && 'pendingCloudClearVaultId' in options
      ? options.pendingCloudClearVaultId ?? null
      : store.pendingCloudClearVaultId ?? null;
  return {
    clearedAt: nextClearedAt,
    pendingCloudClearAt: nextPendingCloudClearAt,
    pendingCloudClearVaultId: nextPendingCloudClearAt ? nextPendingCloudClearVaultId : null,
    messages: store.messages.filter((m) => m.createdAt > nextClearedAt),
  };
}

export function clearPendingCloudClearWatermark(store: LocalChatStore): LocalChatStore {
  if (store.pendingCloudClearAt === null && !store.pendingCloudClearVaultId) return store;
  return {
    ...store,
    pendingCloudClearAt: null,
    pendingCloudClearVaultId: null,
  };
}

function sanitizeChatMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Partial<ChatMessage>;
  if (typeof r.id !== 'string' || !/^[a-zA-Z0-9_-]{4,64}$/.test(r.id)) return null;
  if (r.senderRole !== 'wife' && r.senderRole !== 'husband') return null;
  if (typeof r.text !== 'string' || !r.text.trim()) return null;

  const via: ChatDeliveryVia =
    r.deliveredVia === 'nearby' ||
    r.deliveredVia === 'cloud' ||
    r.deliveredVia === 'hybrid'
      ? r.deliveredVia
      : 'local';

  return {
    id: r.id,
    senderRole: r.senderRole,
    senderName:
      typeof r.senderName === 'string' && r.senderName.trim()
        ? r.senderName.trim().slice(0, 24)
        : r.senderRole === 'wife'
          ? 'الزوجة'
          : 'الزوج',
    senderDeviceId:
      typeof r.senderDeviceId === 'string' && r.senderDeviceId.trim()
        ? r.senderDeviceId.trim().slice(0, 64)
        : 'lw-device',
    text: r.text.trim().slice(0, MAX_CHAT_MESSAGE_CHARS),
    createdAt: typeof r.createdAt === 'number' && r.createdAt >= 0 ? r.createdAt : 0,
    deliveredVia: via,
    pendingNearbyAck: Boolean(r.pendingNearbyAck),
    pendingCloudUpload: Boolean(r.pendingCloudUpload),
  };
}

export function parseChatStore(raw: string | null): LocalChatStore {
  const fallback = createInitialChatStore();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<LocalChatStore>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
    const clearedAt =
      typeof parsed.clearedAt === 'number' && parsed.clearedAt >= 0 ? parsed.clearedAt : 0;
    const pendingCloudClearAt =
      typeof parsed.pendingCloudClearAt === 'number' && parsed.pendingCloudClearAt > 0
        ? parsed.pendingCloudClearAt
        : null;
    const pendingCloudClearVaultId =
      pendingCloudClearAt &&
      typeof parsed.pendingCloudClearVaultId === 'string' &&
      /^[a-zA-Z0-9_-]{8,64}$/.test(parsed.pendingCloudClearVaultId)
        ? parsed.pendingCloudClearVaultId
        : null;
    const cleanMessages = Array.isArray(parsed.messages)
      ? parsed.messages
          .map(sanitizeChatMessage)
          .filter((m): m is ChatMessage => m !== null && m.createdAt > clearedAt)
      : [];
    return {
      clearedAt,
      pendingCloudClearAt,
      pendingCloudClearVaultId,
      messages: sortAndTrimMessages(cleanMessages),
    };
  } catch {
    return fallback;
  }
}

export function loadChatStore(): LocalChatStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialChatStore();
  }
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return createInitialChatStore();
    return parseChatStore(unsealLocalStoragePayload(raw));
  } catch {
    recordBootStorageIssue(
      isLocalVaultWriteProtected() ? 'write-protected' : 'error',
      CHAT_STORAGE_KEY
    );
    return createInitialChatStore();
  }
}

export function saveChatStore(store: LocalChatStore): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (shouldBlockEncryptedStorageOverwrite(CHAT_STORAGE_KEY)) {
    reportStorageWriteIssue('write-protected', CHAT_STORAGE_KEY);
    return;
  }
  try {
    const sealed = sealLocalStoragePayload(JSON.stringify(store));
    window.localStorage.setItem(CHAT_STORAGE_KEY, sealed);
  } catch (err) {
    reportStorageWriteIssue(
      isStorageQuotaError(err) ? 'quota' : 'error',
      CHAT_STORAGE_KEY
    );
  }
}

export function clearChatStoreCompletely(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    // Ignore storage errors cleanly
  }
}
