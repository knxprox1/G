import type { DeviceRole, GameProgress } from '../data/types';
import {
  buildAnswersSnapshotPacket,
  buildHelloPacket,
  buildLiveEventPacket,
  SYNC_PROTOCOL_VERSION,
  type LiveGameEvent,
  type SyncPacket,
} from './protocol';

export type TransportKind = 'capacitor-nearby';

export type LinkConnectionStatus =
  | 'idle'
  | 'discovering'
  | 'waiting-peer'
  | 'connecting'
  | 'connected'
  | 'error';

export interface DiscoveredPeer {
  endpointId: string;
  label: string;
  role?: DeviceRole;
}

export interface PairingVerificationRequest {
  endpointId: string;
  label: string;
  role?: DeviceRole;
  authDigits: string;
}

export interface SyncTransport {
  readonly kind: TransportKind;
  sendPacket: (packet: SyncPacket) => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface LiveBusState {
  status: LinkConnectionStatus;
  transportKind: TransportKind | null;
  peerDeviceId: string | null;
  peerName: string | null;
  peerRole: DeviceRole | null;
  lastAckAt: number | null;
  errorMessage: string | null;
}

type LiveEventListener = (event: LiveGameEvent, fromDeviceId: string) => void;
type SnapshotListener = (packet: Extract<SyncPacket, { kind: 'SYNC_ANSWERS' }>) => void;
type HelloListener = (packet: Extract<SyncPacket, { kind: 'HELLO' }>) => void;
type StateListener = (state: LiveBusState) => void;

const SAME_ROLE_ERROR_MESSAGE =
  'لا يمكن الاقتران بجهازين يحملان نفس النسخة؛ يجب أن يكون أحد الجهازين «نسخة الزوجة» والآخر «نسخة الزوج».';

const UNTRUSTED_DEVICE_ERROR_MESSAGE =
  'تم رفض الاتصال: هذا الجهاز لا يطابق الهاتف الموثوق المقترن مسبقاً. يمكنك فك تثبيت الجهاز من نافذة الاقتران لربط هاتف جديد.';

/**
 * Central event bus unifying offline P2P answer synchronization and future
 * real-time multi-device modes over Capacitor Nearby (Bluetooth + Wi-Fi Direct).
 */
export class LiveSessionBus {
  private transport: SyncTransport | null = null;
  private activeSessionPeerId: string | null = null;
  private progressGetter: () => GameProgress;
  private eventListeners = new Set<LiveEventListener>();
  private snapshotListeners = new Set<SnapshotListener>();
  private helloListeners = new Set<HelloListener>();
  private stateListeners = new Set<StateListener>();

  private state: LiveBusState = {
    status: 'idle',
    transportKind: null,
    peerDeviceId: null,
    peerName: null,
    peerRole: null,
    lastAckAt: null,
    errorMessage: null,
  };

  constructor(progressGetter: () => GameProgress) {
    this.progressGetter = progressGetter;
  }

  getState(): LiveBusState {
    return this.state;
  }

  subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  subscribeSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  subscribeHello(listener: HelloListener): () => void {
    this.helloListeners.add(listener);
    return () => {
      this.helloListeners.delete(listener);
    };
  }

  subscribeLiveEvent(listener: LiveEventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  private setState(partial: Partial<LiveBusState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.stateListeners) {
      listener(this.state);
    }
  }

  setStatus(status: LinkConnectionStatus, errorMessage: string | null = null): void {
    this.setState({ status, errorMessage });
  }

  private async rejectAndDisconnect(reason: string): Promise<void> {
    const activeTransport = this.transport;
    this.transport = null;
    this.activeSessionPeerId = null;
    if (activeTransport) {
      try {
        await activeTransport.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.setState({
      status: 'error',
      transportKind: null,
      peerDeviceId: null,
      peerName: null,
      peerRole: null,
      errorMessage: reason,
    });
  }

  async attachTransport(transport: SyncTransport): Promise<void> {
    if (this.transport && this.transport !== transport) {
      try {
        await this.transport.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.transport = transport;
    this.activeSessionPeerId = null;
    this.setState({
      status: 'connected',
      transportKind: transport.kind,
      peerDeviceId: null,
      peerName: null,
      peerRole: null,
      errorMessage: null,
    });

    const current = this.progressGetter();
    await this.safeSend(buildHelloPacket(current));
    if (current.role === 'wife') {
      await this.safeSend(buildAnswersSnapshotPacket(current));
    }
  }

  async handleIncomingPacket(packet: SyncPacket): Promise<void> {
    const current = this.progressGetter();

    if (packet.deviceId === current.deviceId) {
      return;
    }

    // Reject packets from any foreign device when a trusted partner device is already pinned
    const pinnedDeviceId = current.partnerSnapshot.pairedDeviceId;
    if (pinnedDeviceId && packet.deviceId !== pinnedDeviceId) {
      await this.rejectAndDisconnect(UNTRUSTED_DEVICE_ERROR_MESSAGE);
      return;
    }

    // Reject mid-session deviceId or role impersonation on the currently attached transport
    if (this.activeSessionPeerId && packet.deviceId !== this.activeSessionPeerId) {
      await this.rejectAndDisconnect(UNTRUSTED_DEVICE_ERROR_MESSAGE);
      return;
    }

    if (packet.kind === 'HELLO') {
      if (packet.role === current.role) {
        await this.rejectAndDisconnect(SAME_ROLE_ERROR_MESSAGE);
        return;
      }
      if (this.state.peerRole && packet.role !== this.state.peerRole) {
        await this.rejectAndDisconnect(UNTRUSTED_DEVICE_ERROR_MESSAGE);
        return;
      }
      this.activeSessionPeerId = packet.deviceId;
      this.setState({
        peerDeviceId: packet.deviceId,
        peerName: packet.playerName,
        peerRole: packet.role,
        errorMessage: null,
      });
      for (const listener of this.helloListeners) {
        listener(packet);
      }
      if (current.role === 'wife') {
        await this.safeSend(buildAnswersSnapshotPacket(current));
      }
      return;
    }

    if (packet.kind === 'SYNC_ANSWERS') {
      if (packet.role === current.role) {
        await this.rejectAndDisconnect(SAME_ROLE_ERROR_MESSAGE);
        return;
      }
      if (this.state.peerRole && packet.role !== this.state.peerRole) {
        await this.rejectAndDisconnect(UNTRUSTED_DEVICE_ERROR_MESSAGE);
        return;
      }
      this.activeSessionPeerId = packet.deviceId;
      this.setState({
        peerDeviceId: packet.deviceId,
        peerName: packet.playerName,
        peerRole: packet.role,
        errorMessage: null,
      });
      for (const listener of this.snapshotListeners) {
        listener(packet);
      }
      await this.safeSend({
        kind: 'ACK',
        protocolVersion: SYNC_PROTOCOL_VERSION,
        deviceId: current.deviceId,
        receivedAt: Date.now(),
      });
      return;
    }

    if (packet.kind === 'LIVE_EVENT') {
      if (packet.role === current.role) {
        await this.rejectAndDisconnect(SAME_ROLE_ERROR_MESSAGE);
        return;
      }
      if (this.state.peerRole && packet.role !== this.state.peerRole) {
        await this.rejectAndDisconnect(UNTRUSTED_DEVICE_ERROR_MESSAGE);
        return;
      }
      if (!this.activeSessionPeerId) {
        this.activeSessionPeerId = packet.deviceId;
      }
      for (const listener of this.eventListeners) {
        listener(packet.event, packet.deviceId);
      }
      return;
    }

    if (packet.kind === 'ACK') {
      this.setState({ lastAckAt: packet.receivedAt });
    }
  }

  async sendHelloNow(): Promise<boolean> {
    if (!this.transport || this.state.status !== 'connected') return false;
    const current = this.progressGetter();
    await this.safeSend(buildHelloPacket(current));
    return true;
  }

  async sendSnapshotNow(): Promise<boolean> {
    if (!this.transport || this.state.status !== 'connected') return false;
    const current = this.progressGetter();
    if (current.role !== 'wife') return false;
    await this.safeSend(buildAnswersSnapshotPacket(current));
    return true;
  }

  async emitLiveEvent(event: LiveGameEvent): Promise<boolean> {
    if (!this.transport || this.state.status !== 'connected') return false;
    const current = this.progressGetter();
    await this.safeSend(buildLiveEventPacket(current, event));
    return true;
  }

  async disconnect(): Promise<void> {
    this.activeSessionPeerId = null;
    if (this.transport) {
      try {
        await this.transport.disconnect();
      } catch {
        // Ignore transport close errors
      }
      this.transport = null;
    }
    this.setState({
      status: 'idle',
      transportKind: null,
      peerDeviceId: null,
      peerName: null,
      peerRole: null,
      errorMessage: null,
    });
  }

  private async safeSend(packet: SyncPacket): Promise<void> {
    if (!this.transport) return;
    try {
      await this.transport.sendPacket(packet);
    } catch {
      this.setStatus('error', 'تعذّر إرسال حزمة المزامنة عبر القناة النشطة');
    }
  }
}
