/**
 * Procedural Web Audio Synthesizer for Scaling Octo Journey
 * Zero external audio files: all sounds mathematically synthesized in real-time.
 */
export class OctoAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private isMuted: boolean = true;
  private isInitialized: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initDrone();
      this.isInitialized = true;
      this.isMuted = false;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  private initDrone() {
    if (!this.ctx || !this.masterGain) return;

    // Ambient sub-bass cosmic drone
    this.droneOsc = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();
    this.droneFilter = this.ctx.createBiquadFilter();

    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A

    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(160, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.droneGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.droneOsc.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc.start();
  }

  public updateDroneByScale(scaleExp: number) {
    if (!this.ctx || !this.droneOsc || !this.droneFilter) return;
    const now = this.ctx.currentTime;
    
    // Scale ranges from -15 to +26
    const normalized = (scaleExp + 15) / 41; // 0.0 to 1.0
    const targetFreq = 40 + normalized * 180;
    const targetCutoff = 100 + normalized * 800;

    this.droneOsc.frequency.setTargetAtTime(targetFreq, now, 0.2);
    this.droneFilter.frequency.setTargetAtTime(targetCutoff, now, 0.2);
  }

  public playSonarPing(intensity = 1.0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    const baseFreq = 880 * intensity;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.8);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.2, now);
    filter.Q.setValueAtTime(6.0, now);

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

    // Sub-bass impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(150, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.9);

    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 1.0);

    // High crystalline shimmer
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio
    chord.forEach((freq, idx) => {
      const chimeOsc = this.ctx!.createOscillator();
      const chimeGain = this.ctx!.createGain();
      const delay = idx * 0.08;

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, now + delay);

      chimeGain.gain.setValueAtTime(0.08, now + delay);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.7);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterGain!);

      chimeOsc.start(now + delay);
      chimeOsc.stop(now + delay + 0.7);
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
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
    return !this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}
