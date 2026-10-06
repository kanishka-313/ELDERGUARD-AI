// Web Audio API Synthesizer - 100% reliable, zero external file dependency

class AudioService {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  getAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.isMuted = muted;
  }

  // Gentle reminder chime (C5 -> E5 -> G5)
  playChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.45);
      });
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  // Friendly Voice Assistant Activation Ping
  playVoicePing() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  // Urgent Emergency Siren (Two-tone alternating alarm)
  playSiren() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      
      const freqs = [880, 660, 880, 660, 880, 660];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);

        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.19);
      });
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  // Warning Alert Ping (Attention reminder)
  playWarningBeep() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  // Melodic Alarm Ringtone (Gentle ascending repeating alarm tone)
  playAlarmRingtone() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + idx * 0.14 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.14 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 0.38);
      });
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  // Realistic Telephone Ringing Dual Tone (440Hz + 480Hz)
  playPhoneRing() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 1.45);
      osc2.stop(ctx.currentTime + 1.45);
    } catch (e) {
      console.warn('Phone ring error:', e);
    }
  }

  startPhoneRingLoop(intervalMs = 3500) {
    this.stopPhoneRingLoop();
    this.playPhoneRing();
    this.phoneRingInterval = setInterval(() => {
      this.playPhoneRing();
    }, intervalMs);
  }

  stopPhoneRingLoop() {
    if (this.phoneRingInterval) {
      clearInterval(this.phoneRingInterval);
      this.phoneRingInterval = null;
    }
  }

  // Start repeating alarm ringtone until silenced
  startAlarmRingtoneLoop(intervalMs = 4000) {
    this.stopAlarmRingtoneLoop();
    this.playAlarmRingtone();
    this.alarmLoopInterval = setInterval(() => {
      this.playAlarmRingtone();
    }, intervalMs);
  }

  // Stop repeating alarm ringtone
  stopAlarmRingtoneLoop() {
    if (this.alarmLoopInterval) {
      clearInterval(this.alarmLoopInterval);
      this.alarmLoopInterval = null;
    }
  }

  // Success celebratory sound
  playSuccessFanfare() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      chords.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.4);
      });
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }
}

export const audioService = new AudioService();

