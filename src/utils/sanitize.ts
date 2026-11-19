export const MAX_IDENTIFIER_LENGTH = 96;

export const FORBIDDEN_RECORD_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

export function isSafeIdentifier(val: unknown, maxLen = MAX_IDENTIFIER_LENGTH): val is string {
  return (
    typeof val === 'string' &&
    val.trim().length > 0 &&
    val.length <= maxLen &&
    !FORBIDDEN_RECORD_KEYS.has(val)
  );
}

export function sanitizeShortName(name: string, fallback: string, maxLen = 24): string {
  const trimmed = name.trim();
  return (trimmed || fallback).slice(0, maxLen);
}

export function sanitizeDeviceId(deviceId: string, maxLen = 64): string {
  const trimmed = deviceId.trim();
  return (trimmed || 'lw-device').slice(0, maxLen);
}
