import { useMemo } from 'react';
import { hasLayaliNearbyPlugin } from './capacitorBridge';

export function useHasNativeNearby(): boolean {
  return useMemo(() => hasLayaliNearbyPlugin(), []);
}
