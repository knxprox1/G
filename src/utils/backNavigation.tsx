import React, { createContext, useContext, useEffect, useRef } from 'react';
import type { ScreenId } from '../data/types';

export interface AppHistoryEntry {
  seq: number;
  screen: ScreenId;
  realmId?: string;
  setId?: string;
  logSetId?: string | null;
  questionReturnScreen?: ScreenId;
  overlayId?: string;
}

export interface OverlayRecord {
  seq: number;
  onClose: () => void;
  consumed: boolean;
}

export interface BackNavigationApi {
  registerOverlay: (overlayId: string, onClose: () => void) => () => void;
}

const BackNavigationContext = createContext<BackNavigationApi | null>(null);

export const BackNavigationProvider = BackNavigationContext.Provider;

/**
 * Pure helper: computes a negative `window.history.go(delta)` step if `targetScreen`
 * is the immediate parent entry beneath the current screen (and any trailing overlays
 * on top of the current screen). Returns `0` when a direct fallback navigation is needed.
 */
export function findBackDelta(
  stack: readonly AppHistoryEntry[],
  targetScreen: ScreenId
): number {
  if (stack.length < 2) return 0;

  let currentScreenIdx = stack.length - 1;
  while (currentScreenIdx > 0 && stack[currentScreenIdx]?.overlayId) {
    currentScreenIdx -= 1;
  }

  if (stack[currentScreenIdx]?.overlayId) {
    return 0;
  }

  const overlayCount = stack.length - 1 - currentScreenIdx;
  const parentIdx = currentScreenIdx - 1;
  if (parentIdx < 0) return 0;

  const parentEntry = stack[parentIdx];
  if (!parentEntry || parentEntry.overlayId || parentEntry.screen !== targetScreen) {
    return 0;
  }

  return -(overlayCount + 1);
}

/**
 * Returns the immediate non-overlay parent screen beneath the active screen, or null.
 */
export function getImmediateParentScreen(
  stack: readonly AppHistoryEntry[]
): ScreenId | null {
  if (stack.length < 2) return null;

  let currentScreenIdx = stack.length - 1;
  while (currentScreenIdx > 0 && stack[currentScreenIdx]?.overlayId) {
    currentScreenIdx -= 1;
  }

  const parentIdx = currentScreenIdx - 1;
  if (parentIdx < 0) return null;
  const parentEntry = stack[parentIdx];
  return parentEntry && !parentEntry.overlayId ? parentEntry.screen : null;
}

/**
 * Computes negative `history.go(delta)` step to return cleanly to the root `home`
 * entry when collapsing deeper stacks or trailing overlays down to `[home, targetRootTab]`.
 */
export function computeCollapseToHomeDelta(
  stack: readonly AppHistoryEntry[]
): number {
  if (stack.length <= 1) return 0;
  if (stack[0]?.screen !== 'home') return 0;
  return -(stack.length - 1);
}

/**
 * Pure helper: computes how many contiguous trailing overlay entries on `stack`
 * belong to the pending unconsumed overlay sequence set being closed in the same commit.
 */
export function computeBatchOverlayPopCount(
  stack: readonly AppHistoryEntry[],
  unconsumedSeqs: ReadonlySet<number>
): number {
  if (unconsumedSeqs.size === 0 || stack.length === 0) return 0;
  let popCount = 0;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const entry = stack[i];
    if (!entry?.overlayId || !unconsumedSeqs.has(entry.seq)) {
      break;
    }
    popCount += 1;
  }
  return popCount;
}

/**
 * Registers an in-screen modal, bottom sheet, or dialog with the browser history stack
 * so pressing the mobile hardware/browser Back button closes the overlay instead of
 * leaving the current screen.
 */
export function useBackOverlay(
  isOpen: boolean,
  overlayId: string,
  onClose: () => void
): void {
  const api = useContext(BackNavigationContext);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !api) return;
    const unregister = api.registerOverlay(overlayId, () => {
      onCloseRef.current();
    });
    return unregister;
  }, [isOpen, overlayId, api]);
}
