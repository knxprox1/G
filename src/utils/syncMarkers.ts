import { FORBIDDEN_RECORD_KEYS } from './sanitize';
import {
  isLocalVaultWriteProtected,
  isStorageQuotaError,
  recordBootStorageIssue,
  reportStorageWriteIssue,
  sealLocalStoragePayload,
  shouldBlockEncryptedStorageOverwrite,
  unsealLocalStoragePayload,
} from './security';

export const NEW_SYNC_SETS_STORAGE_KEY = 'layali_new_sync_sets_v1';

export function parseUpdatedSyncSetIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const unsealed = unsealLocalStoragePayload(raw);
    const parsed = JSON.parse(unsealed);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed.filter(
          (x): x is string =>
            typeof x === 'string' && x.length > 0 && x.length <= 96 && !FORBIDDEN_RECORD_KEYS.has(x)
        )
      )
    );
  } catch {
    return [];
  }
}

export function loadUpdatedSyncSetIds(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(NEW_SYNC_SETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = parseUpdatedSyncSetIds(raw);
    if (isLocalVaultWriteProtected()) {
      recordBootStorageIssue('write-protected', NEW_SYNC_SETS_STORAGE_KEY);
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveUpdatedSyncSetIds(ids: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (shouldBlockEncryptedStorageOverwrite(NEW_SYNC_SETS_STORAGE_KEY)) {
    reportStorageWriteIssue('write-protected', NEW_SYNC_SETS_STORAGE_KEY);
    return;
  }
  try {
    const sealed = sealLocalStoragePayload(JSON.stringify(ids));
    window.localStorage.setItem(NEW_SYNC_SETS_STORAGE_KEY, sealed);
  } catch (err) {
    reportStorageWriteIssue(
      isStorageQuotaError(err) ? 'quota' : 'error',
      NEW_SYNC_SETS_STORAGE_KEY
    );
  }
}

export function clearUpdatedSyncSetIds(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(NEW_SYNC_SETS_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}
