import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { GameProgress } from '../data/types';
import { toArabicDigits } from '../game/engine';
import {
  registerCapacitorAppStateListener,
  setNativePrivacyScreenEnabled,
} from '../sync/capacitorBridge';
import {
  attemptPinUnlock,
  clearSecurityConfig,
  createInitialSecurityConfig,
  generatePinSalt,
  getPinLockoutRemainingMs,
  hashPinWithSalt,
  loadSecurityConfig,
  saveSecurityConfig,
  verifyPinDigest,
  type SecurityConfig,
} from '../utils/security';
import { nocturnalAudio } from '../utils/sound';
import type { PinSetupMode } from '../components/PrivacyLockOverlay';

interface UsePrivacyLockParams {
  progressRef: MutableRefObject<GameProgress>;
  privacyCurtainEnabled: boolean;
  onCollapseOverlays: () => void;
  onSyncOnlineState: (online: boolean) => void;
  setAppModal: Dispatch<SetStateAction<'none' | 'settings' | 'sync'>>;
  triggerHaptic: () => void;
  onPinFeedback?: (action: 'created' | 'changed' | 'disabled') => void;
}

export function usePrivacyLock({
  progressRef,
  privacyCurtainEnabled,
  onCollapseOverlays,
  onSyncOnlineState,
  setAppModal,
  triggerHaptic,
  onPinFeedback,
}: UsePrivacyLockParams) {
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(() => loadSecurityConfig());
  const onPinFeedbackRef = useRef(onPinFeedback);
  onPinFeedbackRef.current = onPinFeedback;
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const initial = loadSecurityConfig();
    return initial.pinEnabled;
  });
  const [pinModalMode, setPinModalMode] = useState<PinSetupMode | null>(null);
  const [isAppInBackground, setIsAppInBackground] = useState<boolean>(false);
  const [securityNowTs, setSecurityNowTs] = useState<number>(() => Date.now());

  const securityRef = useRef<SecurityConfig>(securityConfig);
  securityRef.current = securityConfig;
  const isLockedRef = useRef<boolean>(isLocked);
  isLockedRef.current = isLocked;
  const onCollapseOverlaysRef = useRef(onCollapseOverlays);
  onCollapseOverlaysRef.current = onCollapseOverlays;
  const onSyncOnlineStateRef = useRef(onSyncOnlineState);
  onSyncOnlineStateRef.current = onSyncOnlineState;

  const didMountSecurityRef = useRef(false);
  const skipNextSecurityPersistRef = useRef(false);

  useEffect(() => {
    if (!didMountSecurityRef.current) {
      didMountSecurityRef.current = true;
      return;
    }
    if (skipNextSecurityPersistRef.current) {
      skipNextSecurityPersistRef.current = false;
      return;
    }
    saveSecurityConfig(securityConfig);
  }, [securityConfig]);

  useEffect(() => {
    setNativePrivacyScreenEnabled(Boolean(privacyCurtainEnabled || securityConfig.pinEnabled));
  }, [privacyCurtainEnabled, securityConfig.pinEnabled]);

  const lockAppCleanly = useCallback(() => {
    onCollapseOverlaysRef.current();
    setAppModal('none');
    setPinModalMode(null);
    isLockedRef.current = true;
    setIsLocked(true);
  }, [setAppModal]);

  // Privacy curtain + optional immediate PIN lock when entering background (Browser + Capacitor Android)
  useEffect(() => {
    const handleVisibilityOrBackground = (inBackground: boolean) => {
      setIsAppInBackground(inBackground);
      if (!inBackground && typeof navigator !== 'undefined') {
        onSyncOnlineStateRef.current(navigator.onLine);
      }
      if (inBackground && securityRef.current.pinEnabled && securityRef.current.lockOnBackground) {
        lockAppCleanly();
      }
    };

    const onVisibilityChange = () => {
      handleVisibilityOrBackground(document.hidden);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    const unsubNativeAppState = registerCapacitorAppStateListener((isActive) => {
      handleVisibilityOrBackground(!isActive);
    });

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      unsubNativeAppState();
    };
  }, [lockAppCleanly]);

  const lockoutRemainingMs = getPinLockoutRemainingMs(securityConfig, securityNowTs);
  useEffect(() => {
    if (!isLocked || lockoutRemainingMs <= 0) return;
    const timer = window.setInterval(() => {
      setSecurityNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isLocked, lockoutRemainingMs]);

  const handleSubmitPinUnlock = useCallback(
    (pin: string) => {
      const now = Date.now();
      setSecurityNowTs(now);
      const res = attemptPinUnlock(securityRef.current, pin, progressRef.current.deviceId, now);
      setSecurityConfig(res.nextConfig);
      if (res.unlocked) {
        nocturnalAudio.playConfirm(progressRef.current.settings.soundEnabled);
        triggerHaptic();
        setIsLocked(false);
        return { unlocked: true };
      }
      nocturnalAudio.playDeselect(progressRef.current.settings.soundEnabled);
      if (res.remainingLockoutMs > 0) {
        return {
          unlocked: false,
          errorMessage: 'تم إيقاف المحاولات مؤقتاً · انتظر ٣٠ ثانية',
        };
      }
      return {
        unlocked: false,
        errorMessage: `الرمز غير صحيح · تبقّت ${toArabicDigits(res.attemptsLeft)} محاولات`,
      };
    },
    [progressRef, triggerHaptic]
  );

  const verifyCurrentPin = useCallback(
    (pin: string) =>
      verifyPinDigest(
        pin,
        securityConfig.pinSalt ?? progressRef.current.deviceId,
        securityConfig.pinHash,
        progressRef.current.deviceId
      ),
    [progressRef, securityConfig.pinHash, securityConfig.pinSalt]
  );

  const saveNewPin = useCallback(
    (newPin: string) => {
      const wasEnabled = securityRef.current.pinEnabled;
      nocturnalAudio.playConfirm(progressRef.current.settings.soundEnabled);
      triggerHaptic();
      const nextSalt = generatePinSalt();
      const digest = hashPinWithSalt(newPin, nextSalt);
      setSecurityConfig((prev) => ({
        ...prev,
        pinEnabled: true,
        pinSalt: nextSalt,
        pinHash: digest,
        failedAttempts: 0,
        lockedUntil: null,
      }));
      onPinFeedbackRef.current?.(wasEnabled ? 'changed' : 'created');
    },
    [progressRef, triggerHaptic]
  );

  const disablePin = useCallback(() => {
    nocturnalAudio.playDeselect(progressRef.current.settings.soundEnabled);
    triggerHaptic();
    setSecurityConfig((prev) => ({
      ...prev,
      pinEnabled: false,
      pinHash: null,
      pinSalt: null,
      failedAttempts: 0,
      lockedUntil: null,
    }));
    setIsLocked(false);
    onPinFeedbackRef.current?.('disabled');
  }, [progressRef, triggerHaptic]);

  const toggleLockOnBackground = useCallback(() => {
    setSecurityConfig((prev) => ({
      ...prev,
      lockOnBackground: !prev.lockOnBackground,
    }));
  }, []);

  const wipeSecurityState = useCallback(() => {
    skipNextSecurityPersistRef.current = true;
    clearSecurityConfig();
    setSecurityConfig(createInitialSecurityConfig());
    setPinModalMode(null);
    isLockedRef.current = false;
    setIsLocked(false);
  }, []);

  return {
    securityConfig,
    isLocked,
    isLockedRef,
    pinModalMode,
    setPinModalMode,
    isAppInBackground,
    lockoutRemainingMs,
    lockAppCleanly,
    handleSubmitPinUnlock,
    verifyCurrentPin,
    saveNewPin,
    disablePin,
    toggleLockOnBackground,
    wipeSecurityState,
  };
}
