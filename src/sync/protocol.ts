import type { DeviceRole, GameProgress } from '../data/types';
import { sanitizeAnswersBySet } from '../game/engine';
import { base64ToBytes, bytesToBase64 } from '../utils/encoding';
import { isSafeIdentifier } from '../utils/sanitize';

export const SYNC_PROTOCOL_VERSION = 1;
export const NEARBY_SAFE_FRAME_BYTES = 16_384;
const MAX_CHUNKS_PER_MESSAGE = 128;
const CHUNK_TTL_MS = 30_000;

export type LiveGameEvent =
  | {
      type: 'QUESTION_ANSWERED_LIVE';
      realmId: string;
      setId: string;
      questionId: string;
      selectedIds: string[];
      updatedAt: number;
    }
  | {
      type: 'SET_RESET_LIVE';
      setId: string;
      updatedAt: number;
    }
  | {
      type: 'ALL_RESET_LIVE';
      updatedAt: number;
    }
  | {
      type: 'CARD_DRAWN';
      deckId: string;
      cardId: string;
      drawnBy: DeviceRole;
      timestamp: number;
    }
  | {
      type: 'CARD_STATUS';
      cardId: string;
      status: 'accepted' | 'completed' | 'skipped';
      timestamp: number;
    }
  | {
      type: 'DIALOGUE_TOPIC';
      topicId: string;
      action: 'open' | 'favorite' | 'next';
      timestamp: number;
    }
  | {
      type: 'CHALLENGE_TIMER';
      challengeId: string;
      action: 'start' | 'pause' | 'complete';
      durationSec: number;
      startedAt: number;
    }
  | {
      type: 'CHAT_MESSAGE';
      messageId: string;
      senderName: string;
      text: string;
      createdAt: number;
    }
  | {
      type: 'CHAT_ACK';
      messageId: string;
      receivedAt: number;
    }
  | {
      type: 'CHAT_CLEAR';
      clearedAt: number;
    };

export type SyncPacket =
  | {
      kind: 'HELLO';
      protocolVersion: number;
      deviceId: string;
      role: DeviceRole;
      playerName: string;
      questionsUpdatedAt: number | null;
      sentAt: number;
    }
  | {
      kind: 'SYNC_ANSWERS';
      protocolVersion: number;
      deviceId: string;
      role: DeviceRole;
      playerName: string;
      answersBySet: Record<string, Record<string, string[]>>;
      completedSetIds: string[];
      updatedAt: number;
    }
  | {
      kind: 'LIVE_EVENT';
      protocolVersion: number;
      deviceId: string;
      role: DeviceRole;
      event: LiveGameEvent;
    }
  | {
      kind: 'ACK';
      protocolVersion: number;
      deviceId: string;
      receivedAt: number;
    };

export interface ChunkFrame {
  kind: 'CHUNK';
  protocolVersion: number;
  msgId: string;
  index: number;
  total: number;
  encoding: 'b64';
  payload: string;
}

export function buildHelloPacket(progress: GameProgress): SyncPacket {
  return {
    kind: 'HELLO',
    protocolVersion: SYNC_PROTOCOL_VERSION,
    deviceId: progress.deviceId,
    role: progress.role,
    playerName: progress.playerName,
    questionsUpdatedAt: progress.modeProgress.questions.updatedAt,
    sentAt: Date.now(),
  };
}

export function buildAnswersSnapshotPacket(progress: GameProgress): SyncPacket {
  return {
    kind: 'SYNC_ANSWERS',
    protocolVersion: SYNC_PROTOCOL_VERSION,
    deviceId: progress.deviceId,
    role: progress.role,
    playerName: progress.playerName,
    answersBySet: progress.answersBySet,
    completedSetIds: progress.completedSetIds,
    updatedAt: progress.modeProgress.questions.updatedAt ?? Date.now(),
  };
}

export function buildLiveEventPacket(
  progress: GameProgress,
  event: LiveGameEvent
): SyncPacket {
  return {
    kind: 'LIVE_EVENT',
    protocolVersion: SYNC_PROTOCOL_VERSION,
    deviceId: progress.deviceId,
    role: progress.role,
    event,
  };
}

export function encodeSyncPacket(packet: SyncPacket): string {
  return JSON.stringify(packet);
}

/**
 * Encodes a SyncPacket into one or more UTF-8 safe frames bounded by `maxFrameBytes`
 * (keeping packets well below Google Nearby Connections' 32 KB byte payload ceiling).
 */
export function encodePacketFrames(
  packet: SyncPacket,
  maxFrameBytes = NEARBY_SAFE_FRAME_BYTES
): string[] {
  const json = encodeSyncPacket(packet);
  const rawBytes = new TextEncoder().encode(json);
  const effectiveMax = Math.max(512, maxFrameBytes);
  if (rawBytes.length <= effectiveMax) {
    return [json];
  }

  const b64 = bytesToBase64(rawBytes);
  const payloadSliceLen = Math.max(256, effectiveMax - 200);
  const total = Math.ceil(b64.length / payloadSliceLen);
  let randHex = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    randHex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    randHex = Math.random().toString(36).slice(2, 10);
  }
  const msgId = `m-${Date.now().toString(36)}-${randHex}`;

  const frames: string[] = [];
  for (let index = 0; index < total; index += 1) {
    const start = index * payloadSliceLen;
    const frame: ChunkFrame = {
      kind: 'CHUNK',
      protocolVersion: SYNC_PROTOCOL_VERSION,
      msgId,
      index,
      total,
      encoding: 'b64',
      payload: b64.slice(start, start + payloadSliceLen),
    };
    frames.push(JSON.stringify(frame));
  }
  return frames;
}

const isSafeId = isSafeIdentifier;

function isValidRole(val: unknown): val is DeviceRole {
  return val === 'wife' || val === 'husband';
}

function isValidLiveEvent(raw: unknown): raw is LiveGameEvent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const ev = raw as Record<string, unknown>;
  switch (ev.type) {
    case 'QUESTION_ANSWERED_LIVE':
      return (
        isSafeId(ev.realmId) &&
        isSafeId(ev.setId) &&
        isSafeId(ev.questionId) &&
        Array.isArray(ev.selectedIds) &&
        ev.selectedIds.length <= 32 &&
        ev.selectedIds.every((id) => isSafeId(id)) &&
        typeof ev.updatedAt === 'number'
      );
    case 'SET_RESET_LIVE':
      return isSafeId(ev.setId) && typeof ev.updatedAt === 'number';
    case 'ALL_RESET_LIVE':
      return typeof ev.updatedAt === 'number';
    case 'CARD_DRAWN':
      return (
        isSafeId(ev.deckId) &&
        isSafeId(ev.cardId) &&
        isValidRole(ev.drawnBy) &&
        typeof ev.timestamp === 'number'
      );
    case 'CARD_STATUS':
      return (
        isSafeId(ev.cardId) &&
        (ev.status === 'accepted' || ev.status === 'completed' || ev.status === 'skipped') &&
        typeof ev.timestamp === 'number'
      );
    case 'DIALOGUE_TOPIC':
      return (
        isSafeId(ev.topicId) &&
        (ev.action === 'open' || ev.action === 'favorite' || ev.action === 'next') &&
        typeof ev.timestamp === 'number'
      );
    case 'CHALLENGE_TIMER':
      return (
        isSafeId(ev.challengeId) &&
        (ev.action === 'start' || ev.action === 'pause' || ev.action === 'complete') &&
        typeof ev.durationSec === 'number' &&
        typeof ev.startedAt === 'number'
      );
    case 'CHAT_MESSAGE':
      return (
        isSafeId(ev.messageId, 64) &&
        typeof ev.senderName === 'string' &&
        ev.senderName.trim().length > 0 &&
        ev.senderName.length <= 24 &&
        typeof ev.text === 'string' &&
        ev.text.trim().length > 0 &&
        ev.text.length <= 1000 &&
        typeof ev.createdAt === 'number' &&
        ev.createdAt >= 0
      );
    case 'CHAT_ACK':
      return isSafeId(ev.messageId, 64) && typeof ev.receivedAt === 'number';
    case 'CHAT_CLEAR':
      return typeof ev.clearedAt === 'number' && ev.clearedAt >= 0;
    default:
      return false;
  }
}

export function parseSyncPacket(raw: string): SyncPacket | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (!isSafeId(parsed.deviceId, 64)) return null;

    const protocolVersion =
      typeof parsed.protocolVersion === 'number'
        ? parsed.protocolVersion
        : SYNC_PROTOCOL_VERSION;

    if (parsed.kind === 'HELLO') {
      if (!isValidRole(parsed.role)) return null;
      return {
        kind: 'HELLO',
        protocolVersion,
        deviceId: parsed.deviceId,
        role: parsed.role,
        playerName:
          typeof parsed.playerName === 'string' && parsed.playerName.trim()
            ? parsed.playerName.trim().slice(0, 24)
            : 'الشريك',
        questionsUpdatedAt:
          typeof parsed.questionsUpdatedAt === 'number' ? parsed.questionsUpdatedAt : null,
        sentAt: typeof parsed.sentAt === 'number' ? parsed.sentAt : Date.now(),
      };
    }

    if (parsed.kind === 'SYNC_ANSWERS') {
      if (!isValidRole(parsed.role)) return null;
      const cleanCompleted = Array.isArray(parsed.completedSetIds)
        ? Array.from(
            new Set(
              parsed.completedSetIds.filter((id): id is string => isSafeId(id)).slice(0, 500)
            )
          )
        : [];
      return {
        kind: 'SYNC_ANSWERS',
        protocolVersion,
        deviceId: parsed.deviceId,
        role: parsed.role,
        playerName:
          typeof parsed.playerName === 'string' && parsed.playerName.trim()
            ? parsed.playerName.trim().slice(0, 24)
            : 'الشريكة',
        answersBySet: sanitizeAnswersBySet(parsed.answersBySet),
        completedSetIds: cleanCompleted,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      };
    }

    if (parsed.kind === 'LIVE_EVENT') {
      if (!isValidRole(parsed.role) || !isValidLiveEvent(parsed.event)) return null;
      return {
        kind: 'LIVE_EVENT',
        protocolVersion,
        deviceId: parsed.deviceId,
        role: parsed.role,
        event: parsed.event,
      };
    }

    if (parsed.kind === 'ACK') {
      return {
        kind: 'ACK',
        protocolVersion,
        deviceId: parsed.deviceId,
        receivedAt: typeof parsed.receivedAt === 'number' ? parsed.receivedAt : Date.now(),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Reassembles multi-frame CHUNK packets while passing standard single-frame packets straight through.
 */
export interface ChunkAssemblerOptions {
  onExpired?: (msgId: string, receivedCount: number, total: number) => void;
}

export class ChunkAssembler {
  private pending = new Map<
    string,
    { total: number; parts: (string | undefined)[]; createdAt: number }
  >();
  private readonly onExpired?: (msgId: string, receivedCount: number, total: number) => void;

  constructor(options?: ChunkAssemblerOptions) {
    this.onExpired = options?.onExpired;
  }

  getPendingCount(): number {
    return this.pending.size;
  }

  reset(): void {
    this.pending.clear();
  }

  ingest(raw: string, now = Date.now()): SyncPacket | null {
    if (!raw || typeof raw !== 'string') return null;

    // Evict expired incomplete buffers and surface partial frame loss
    for (const [key, entry] of this.pending.entries()) {
      if (now - entry.createdAt > CHUNK_TTL_MS) {
        const receivedCount = entry.parts.filter((p) => p !== undefined).length;
        this.pending.delete(key);
        this.onExpired?.(key, receivedCount, entry.total);
      }
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    if (parsed.kind !== 'CHUNK') {
      return parseSyncPacket(raw);
    }

    if (
      !isSafeId(parsed.msgId, 64) ||
      typeof parsed.index !== 'number' ||
      typeof parsed.total !== 'number' ||
      !Number.isInteger(parsed.index) ||
      !Number.isInteger(parsed.total) ||
      parsed.total < 1 ||
      parsed.total > MAX_CHUNKS_PER_MESSAGE ||
      parsed.index < 0 ||
      parsed.index >= parsed.total ||
      parsed.encoding !== 'b64' ||
      typeof parsed.payload !== 'string'
    ) {
      return null;
    }

    let bucket = this.pending.get(parsed.msgId);
    if (!bucket || bucket.total !== parsed.total) {
      if (this.pending.size >= 8) {
        const oldestKey = this.pending.keys().next().value;
        if (oldestKey) this.pending.delete(oldestKey);
      }
      bucket = {
        total: parsed.total,
        parts: new Array<string | undefined>(parsed.total).fill(undefined),
        createdAt: now,
      };
      this.pending.set(parsed.msgId, bucket);
    }

    bucket.parts[parsed.index] = parsed.payload;
    if (bucket.parts.some((p) => p === undefined)) {
      return null;
    }

    this.pending.delete(parsed.msgId);
    try {
      const joinedB64 = bucket.parts.join('');
      const bytes = base64ToBytes(joinedB64);
      const decodedJson = new TextDecoder().decode(bytes);
      return parseSyncPacket(decodedJson);
    } catch {
      return null;
    }
  }
}
