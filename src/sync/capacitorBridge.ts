import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import type { DeviceRole } from '../data/types';
import {
  ChunkAssembler,
  encodePacketFrames,
  type SyncPacket,
} from './protocol';
import type {
  DiscoveredPeer,
  PairingVerificationRequest,
  SyncTransport,
} from './liveBus';

interface CapacitorPluginHandle {
  remove: () => Promise<void> | void;
}

type NearbyEventName =
  | 'onPeerFound'
  | 'onPeerLost'
  | 'onConnectionRequested'
  | 'onConnected'
  | 'onPayloadReceived'
  | 'onDisconnected';

/**
 * Native plugin contract for Android Nearby Connections
 * (combines Bluetooth + Wi-Fi Direct seamlessly with zero internet).
 */
export interface LayaliNearbyPlugin {
  startAdvertising: (options: {
    deviceName: string;
    role: DeviceRole;
    serviceId: string;
  }) => Promise<void>;
  startDiscovery: (options: {
    serviceId: string;
    deviceName?: string;
  }) => Promise<void>;
  connectToPeer: (options: { endpointId: string }) => Promise<void>;
  acceptConnection: (options: { endpointId: string }) => Promise<void>;
  rejectConnection: (options: { endpointId: string }) => Promise<void>;
  sendPayload: (options: { endpointId?: string; data: string }) => Promise<void>;
  stopAll: () => Promise<void>;
  setPrivacyScreenEnabled?: (options: { enabled: boolean }) => Promise<void>;
  addListener: (
    eventName: NearbyEventName,
    cb: (payload: Record<string, unknown>) => void
  ) => Promise<CapacitorPluginHandle> | CapacitorPluginHandle;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    LayaliNearby?: LayaliNearbyPlugin;
  };
}

export const LAYALI_NEARBY_SERVICE_ID = 'com.layalialward.nearby.v1';

const registeredLayaliNearby =
  typeof window !== 'undefined' ? registerPlugin<LayaliNearbyPlugin>('LayaliNearby') : null;

function getCapacitorGlobal(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap ?? null;
}

export function isCapacitorNative(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // Fallback below if running in non-DOM test runtime
  }
  const cap = getCapacitorGlobal();
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') {
    return Boolean(cap.isNativePlatform());
  }
  const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'web';
  return platform === 'android';
}

export function getCapacitorPlatform(): 'android' | 'web' {
  try {
    const raw = Capacitor.getPlatform();
    if (raw === 'android') return 'android';
  } catch {
    // Fallback below
  }
  const cap = getCapacitorGlobal();
  const raw = cap?.getPlatform?.();
  if (raw === 'android') return 'android';
  return 'web';
}

export function getLayaliNearbyPlugin(): LayaliNearbyPlugin | null {
  if (!isCapacitorNative()) return null;
  try {
    if (typeof Capacitor.isPluginAvailable === 'function' && !Capacitor.isPluginAvailable('LayaliNearby')) {
      return getCapacitorGlobal()?.Plugins?.LayaliNearby ?? null;
    }
  } catch {
    // Fallback below
  }
  const globalPlugin = getCapacitorGlobal()?.Plugins?.LayaliNearby;
  if (globalPlugin) return globalPlugin;
  return registeredLayaliNearby;
}

export function hasLayaliNearbyPlugin(): boolean {
  return getLayaliNearbyPlugin() !== null;
}

export function setNativePrivacyScreenEnabled(enabled: boolean): void {
  const plugin = getLayaliNearbyPlugin();
  if (!plugin || typeof plugin.setPrivacyScreenEnabled !== 'function') return;
  void plugin.setPrivacyScreenEnabled({ enabled }).catch(() => {
    // Ignore on platforms where FLAG_SECURE method is unavailable
  });
}

/**
 * Hooks Android hardware Back button when running inside a Capacitor native shell.
 * Delegates back action to browser history when overlays or inner screens are active,
 * and exits cleanly when already at the root screen.
 */
export function registerCapacitorBackButton(
  canNavigateBackInApp: () => boolean
): () => void {
  if (!isCapacitorNative()) {
    return () => {};
  }

  let disposed = false;
  let handle: CapacitorPluginHandle | null = null;

  try {
    const sub = CapacitorApp.addListener('backButton', () => {
      if (canNavigateBackInApp()) {
        window.history.back();
      } else {
        void CapacitorApp.exitApp();
      }
    });

    void sub
      .then((resolved) => {
        if (disposed) {
          void resolved.remove();
        } else {
          handle = resolved;
        }
      })
      .catch(() => {
        // Ignore on unsupported runtimes
      });
  } catch {
    return () => {};
  }

  return () => {
    disposed = true;
    if (handle) {
      void handle.remove();
      handle = null;
    }
  };
}

/**
 * Hooks Capacitor native app foreground/background transitions for privacy lock & curtain.
 */
export function registerCapacitorAppStateListener(
  onAppActiveChange: (isActive: boolean) => void
): () => void {
  if (!isCapacitorNative()) {
    return () => {};
  }

  let disposed = false;
  let handle: CapacitorPluginHandle | null = null;

  try {
    const sub = CapacitorApp.addListener('appStateChange', (state) => {
      onAppActiveChange(Boolean(state.isActive));
    });

    void sub
      .then((resolved) => {
        if (disposed) {
          void resolved.remove();
        } else {
          handle = resolved;
        }
      })
      .catch(() => {
        // Ignore on unsupported runtimes
      });
  } catch {
    return () => {};
  }

  return () => {
    disposed = true;
    if (handle) {
      void handle.remove();
      handle = null;
    }
  };
}

/**
 * Hooks Capacitor deep-link URLs (`appUrlOpen`) when opening #joinVault= links on Android.
 */
export function registerCapacitorAppUrlOpenListener(
  onUrl: (url: string) => void
): () => void {
  if (!isCapacitorNative()) {
    return () => {};
  }

  let disposed = false;
  let handle: CapacitorPluginHandle | null = null;

  try {
    const sub = CapacitorApp.addListener('appUrlOpen', (event) => {
      if (event?.url) {
        onUrl(event.url);
      }
    });

    void sub
      .then((resolved) => {
        if (disposed) {
          void resolved.remove();
        } else {
          handle = resolved;
        }
      })
      .catch(() => {
        // Ignore on unsupported runtimes
      });
  } catch {
    return () => {};
  }

  return () => {
    disposed = true;
    if (handle) {
      void handle.remove();
      handle = null;
    }
  };
}

export async function getCapacitorLaunchUrl(): Promise<string | null> {
  if (!isCapacitorNative()) return null;
  try {
    const res = await CapacitorApp.getLaunchUrl();
    return res?.url ?? null;
  } catch {
    return null;
  }
}

export interface NearbySessionControls {
  connectPeer: (endpointId: string) => Promise<void>;
  acceptConnection: (endpointId: string) => Promise<void>;
  rejectConnection: (endpointId: string) => Promise<void>;
  stop: () => Promise<void>;
}

const FRAME_SEND_TIMEOUT_MS = 8_000;
const FRAME_RETRY_DELAY_MS = 150;

/**
 * Translates raw Capacitor/Android Nearby Connections error messages into clear user-facing Arabic.
 */
export function formatNearbyErrorMessage(
  error: unknown,
  fallback = 'تعذّر إتمام الاتصال القريب الآن؛ تأكّد من تشغيل البلوتوث والموقع وحاول مجدداً.'
): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('permission') || lower.includes('denied')) {
    return 'يلزم منح أذونات البلوتوث والموقع القريب في إعدادات الهاتف لإتمام المزامنة القريبة.';
  }
  if (lower.includes('already_connected') || lower.includes('already connected')) {
    return 'الجهازان متصلان بالفعل عبر الربط القريب.';
  }
  if (lower.includes('endpointid is required')) {
    return 'تعذّر تحديد الجهاز المختار؛ يُرجى تحديث البحث واختياره مجدداً.';
  }
  if (lower.includes('no active nearby connection') || lower.includes('not connected')) {
    return 'لا يوجد اتصال قريب نشط حالياً مع الجهاز الآخر.';
  }
  if (lower.includes('payload size exceeded')) {
    return 'حجم حزمة المزامنة يتجاوز الحد المسموح عبر البلوتوث؛ يرجى المحاولة مجدداً.';
  }
  if (lower.includes('advertising')) {
    return 'تعذّر إظهار هذا الجهاز للأجهزة القريبة؛ تأكّد من تفعيل البلوتوث وأذونات القرب.';
  }
  if (lower.includes('discovery')) {
    return 'تعذّر بدء البحث عن الأجهزة القريبة؛ تأكّد من تفعيل البلوتوث والموقع.';
  }
  if (lower.includes('connect failed') || lower.includes('connection failed')) {
    return 'تعذّر الاتصال بالجهاز المختار؛ تأكّد من بقاء التطبيق مفتوحاً في كلا الهاتفين.';
  }
  if (lower.includes('accept failed')) {
    return 'تعذّر قبول طلب الاقتران القريب؛ حاول طلب الاقتران مجدداً.';
  }
  if (lower.includes('reject failed')) {
    return 'تعذّر رفض طلب الاقتران؛ يرجى المحاولة مجدداً.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'انتهت مهلة الاتصال القريب؛ تأكّد من قرب الهاتفين وحاول مجدداً.';
  }
  if (lower.includes('send failed') || lower.includes('sendpayload')) {
    return 'تعذّر إرسال حزمة البيانات عبر الاتصال القريب؛ تأكّد من قرب الهاتفين.';
  }
  return fallback;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Starts Capacitor Nearby Connections (Bluetooth + Wi-Fi Direct) discovery/advertising
 * with explicit 4-digit pairing confirmation and UTF-8 frame chunking.
 */
export async function startCapacitorNearbySession(options: {
  deviceName: string;
  role: DeviceRole;
  onPeerFound: (peer: DiscoveredPeer) => void;
  onPeerLost?: (endpointId: string) => void;
  onConnectionRequested?: (request: PairingVerificationRequest) => void;
  onPacket: (packet: SyncPacket) => void;
  onConnected: (transport: SyncTransport, endpointId: string) => void;
  onDisconnected: () => void;
  onTransferError?: (message: string) => void;
  onSessionControls?: (controls: NearbySessionControls) => void;
}): Promise<NearbySessionControls> {
  const plugin = getLayaliNearbyPlugin();
  if (!plugin) {
    throw new Error('إضافة الربط القريب (Bluetooth/Wi-Fi Direct) متاحة عند تغليف التطبيق بـ Capacitor.');
  }

  const assembler = new ChunkAssembler({
    onExpired: () => {
      options.onTransferError?.('انتهت مهلة استقبال حزمة المزامنة القريبة؛ يرجى إعادة المزامنة.');
    },
  });
  const handles: CapacitorPluginHandle[] = [];
  let stopped = false;
  let activeEndpointId: string | null = null;

  const stop = async () => {
    if (stopped) return;
    stopped = true;
    activeEndpointId = null;
    assembler.reset();
    for (const h of handles) {
      try {
        await h.remove();
      } catch {
        // Ignore
      }
    }
    handles.length = 0;
    try {
      await plugin.stopAll();
    } catch {
      // Ignore
    }
  };

  const controls: NearbySessionControls = {
    connectPeer: async (endpointId: string) => {
      try {
        await plugin.connectToPeer({ endpointId });
      } catch (err) {
        throw new Error(formatNearbyErrorMessage(err));
      }
    },
    acceptConnection: async (endpointId: string) => {
      try {
        await plugin.acceptConnection({ endpointId });
      } catch (err) {
        throw new Error(formatNearbyErrorMessage(err));
      }
    },
    rejectConnection: async (endpointId: string) => {
      try {
        await plugin.rejectConnection({ endpointId });
      } catch (err) {
        throw new Error(formatNearbyErrorMessage(err));
      }
    },
    stop,
  };

  options.onSessionControls?.(controls);

  const register = async (
    ev: NearbyEventName,
    cb: (payload: Record<string, unknown>) => void
  ) => {
    const res = await plugin.addListener(ev, cb);
    if (stopped) {
      await Promise.resolve(res.remove()).catch(() => {});
      return;
    }
    handles.push(res);
  };

  const sendFrameWithRetry = async (endpointId: string | undefined, data: string): Promise<void> => {
    const attemptSend = () =>
      withTimeout(
        plugin.sendPayload({ endpointId, data }),
        FRAME_SEND_TIMEOUT_MS,
        'انتهت مهلة إرسال حزمة البيانات القريبة'
      );
    try {
      await attemptSend();
    } catch {
      if (stopped || !activeEndpointId) {
        throw new Error('انقطع الاتصال القريب أثناء الإرسال');
      }
      await new Promise((resolve) => setTimeout(resolve, FRAME_RETRY_DELAY_MS));
      try {
        await attemptSend();
      } catch (retryErr) {
        options.onTransferError?.('تعذّر إرسال حزمة المزامنة عبر الاتصال القريب؛ تأكّد من قرب الهاتفين.');
        throw retryErr instanceof Error ? retryErr : new Error('تعذّر إرسال البيانات القريبة');
      }
    }
  };

  try {
    await register('onPeerFound', (payload) => {
      const endpointId = typeof payload.endpointId === 'string' ? payload.endpointId : '';
      const rawLabel = typeof payload.label === 'string' ? payload.label.trim().slice(0, 24) : '';
      const label = rawLabel || 'جهاز قريب';
      const role = payload.role === 'wife' || payload.role === 'husband' ? payload.role : undefined;
      if (endpointId) {
        options.onPeerFound({ endpointId, label, role });
      }
    });

    await register('onPeerLost', (payload) => {
      const endpointId = typeof payload.endpointId === 'string' ? payload.endpointId : '';
      if (endpointId) {
        options.onPeerLost?.(endpointId);
      }
    });

    await register('onConnectionRequested', (payload) => {
      const endpointId = typeof payload.endpointId === 'string' ? payload.endpointId : '';
      if (!endpointId) return;
      const rawLabel = typeof payload.label === 'string' ? payload.label.trim().slice(0, 24) : '';
      const label = rawLabel || 'جهاز قريب';
      const role = payload.role === 'wife' || payload.role === 'husband' ? payload.role : undefined;
      const authDigits =
        typeof payload.authDigits === 'string' ? payload.authDigits.trim() : '';
      if (!/^\d{4,6}$/.test(authDigits)) {
        void plugin.rejectConnection({ endpointId }).catch(() => {});
        return;
      }
      options.onConnectionRequested?.({
        endpointId,
        label,
        role,
        authDigits,
      });
    });

    await register('onPayloadReceived', (payload) => {
      const raw = typeof payload.data === 'string' ? payload.data : '';
      const parsed = assembler.ingest(raw);
      if (parsed) {
        options.onPacket(parsed);
      }
    });

    await register('onDisconnected', () => {
      activeEndpointId = null;
      assembler.reset();
      options.onDisconnected();
    });

    await register('onConnected', (payload) => {
      const endpointId = typeof payload.endpointId === 'string' ? payload.endpointId : '';
      activeEndpointId = endpointId;
      const transport: SyncTransport = {
        kind: 'capacitor-nearby',
        sendPacket: async (packet) => {
          const frames = encodePacketFrames(packet);
          for (const frame of frames) {
            await sendFrameWithRetry(activeEndpointId ?? undefined, frame);
          }
        },
        disconnect: stop,
      };
      options.onConnected(transport, endpointId);
    });

    await plugin.startAdvertising({
      deviceName: options.deviceName,
      role: options.role,
      serviceId: LAYALI_NEARBY_SERVICE_ID,
    });
    await plugin.startDiscovery({
      serviceId: LAYALI_NEARBY_SERVICE_ID,
      deviceName: options.deviceName,
    });
  } catch (err) {
    await stop();
    throw new Error(formatNearbyErrorMessage(err));
  }

  return controls;
}
