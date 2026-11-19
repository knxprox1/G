class NocturnalAudio {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private withReadyContext(fn: (ctx: AudioContext) => void): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state === 'closed') return;
    const safeInvoke = () => {
      try {
        if (ctx.state === 'running') {
          fn(ctx);
        }
      } catch {
        // Ignore browser audio policy errors cleanly
      }
    };
    if (ctx.state === 'running') {
      safeInvoke();
      return;
    }
    if (ctx.state === 'suspended') {
      const requestedAt = Date.now();
      ctx
        .resume()
        .then(() => {
          // Only play if resumed promptly from a user gesture to prevent delayed sound bursts
          if (Date.now() - requestedAt < 250) {
            safeInvoke();
          }
        })
        .catch(() => {});
    }
  }

  public playSelect(enabled: boolean): void {
    if (!enabled) return;
    this.withReadyContext((ctx) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    });
  }

  public playDeselect(enabled: boolean): void {
    if (!enabled) return;
    this.withReadyContext((ctx) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.08);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    });
  }

  public playConfirm(enabled: boolean): void {
    if (!enabled) return;
    this.withReadyContext((ctx) => {
      const now = ctx.currentTime;
      [523.25, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        gain.gain.setValueAtTime(0.04, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.25);
      });
    });
  }

  public playComplete(enabled: boolean): void {
    if (!enabled) return;
    this.withReadyContext((ctx) => {
      const now = ctx.currentTime;
      [392.0, 493.88, 587.33, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.045, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.46);
      });
    });
  }
}

export const nocturnalAudio = new NocturnalAudio();
