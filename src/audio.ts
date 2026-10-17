/**
 * Procedural Web Audio Synthesizer 2.0 for Scaling Octo Journey
 * Generates:
 * - 3 Hearts Cephalopod Pulse (Lub-Dub low-frequency rhythm)
 * - Scale-adaptive harmonic drone & filter resonance
 * - Pentatonic chime harvest synthesizer
 * - High-energy ink/plasma warp discharge with sub-bass impact
 * - Sonar spatial ping
 */
export class OctoAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Continuous Ambient Synth
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  
  // Cephalopod 3-Heart Rhythm generator
  private heartGain: GainNode | null = null;
  private lastHeartbeat = 0;

  // State
  private isMuted: boolean = true;
  private isInitialized: boolean = false;

  // Pentatonic scale frequencies for energy harvest (C Lydian / Cosmic Pentatonic)
  private pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

  constructor() {}

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initDrone();
      this.initHeartSystem();
      this.isInitialized = true;
      this.isMuted = false;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked by browser policy:', e);
    }
  }

  private initDrone() {
    if (!this.ctx || !this.masterGain) return;

    this.droneOsc = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();
    this.droneFilter = this.ctx.createBiquadFilter();

    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(4.5, this.ctx.currentTime);

    this.droneGain.gain.setValueAtTime(0.09, this.ctx.currentTime);

    this.droneOsc.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc.start();
  }

  private initHeartSystem() {
    if (!this.ctx || !this.masterGain) return;
    this.heartGain = this.ctx.createGain();
    this.heartGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    this.heartGain.connect(this.masterGain);
  }

  /**
   * Called in animation loop: pulses cephalopod heartbeats synchronized with swim stroke
   */
  public updateHeartbeat(currentTime: number, bpm = 56) {
    if (!this.ctx || !this.heartGain || this.isMuted) return;
    const interval = 60 / bpm;

    if (currentTime - this.lastHeartbeat >= interval) {
      this.playHeartLubDub(currentTime);
      this.lastHeartbeat = currentTime;
    }
  }

  private playHeartLubDub(time: number) {
    if (!this.ctx || !this.heartGain) return;

    // "Lub" (Systemic Heart)
    this.playThump(time, 42, 0.15, 0.18);
    // "Dub" (Branchial Gill Hearts, delayed by 0.18s)
    this.playThump(time + 0.18, 52, 0.12, 0.14);
  }

  private playThump(startTime: number, freq: number, duration: number, gainVal: number) {
    if (!this.ctx || !this.heartGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(20, startTime + duration);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.heartGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Audio context might be inactive
    }
  }

  public updateDroneByScale(scaleExp: number) {
    if (!this.ctx || !this.droneOsc || !this.droneFilter) return;
    const now = this.ctx.currentTime;
    const normalized = (scaleExp + 15) / 41; // 0.0 to 1.0
    const targetFreq = 42 + normalized * 160;
    const targetCutoff = 120 + normalized * 900;

    this.droneOsc.frequency.setTargetAtTime(targetFreq, now, 0.25);
    this.droneFilter.frequency.setTargetAtTime(targetCutoff, now, 0.25);
  }

  /**
   * Sound effect when harvesting an energy quantum orb
   */
  public playHarvestChime(index = 0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const freq = this.pentatonicScale[index % this.pentatonicScale.length];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.05);
    osc.frequency.setValueAtTime(freq, now + 0.1);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    if (pan) {
      pan.pan.setValueAtTime((Math.random() - 0.5) * 1.2, now);
      osc.connect(pan);
      pan.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  public playSonarPing(intensity = 1.0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    const baseFreq = 920 * intensity;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.9);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.2, now);
    filter.Q.setValueAtTime(7.0, now);

    gain.gain.setValueAtTime(0.25 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  public playWarpDischarge() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 1. Sub-bass massive impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(180, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 1.1);

    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 1.2);

    // 2. High crystalline shimmer arpeggio
    const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chord.forEach((freq, idx) => {
      const chimeOsc = this.ctx!.createOscillator();
      const chimeGain = this.ctx!.createGain();
      const delay = idx * 0.07;

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, now + delay);

      chimeGain.gain.setValueAtTime(0.1, now + delay);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.8);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterGain!);

      chimeOsc.start(now + delay);
      chimeOsc.stop(now + delay + 0.8);
    });
  }

  public toggleMute(): boolean {
    if (!this.ctx) {
      this.init();
      return !this.isMuted;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return !this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}
