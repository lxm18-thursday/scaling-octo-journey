import * as THREE from 'three';

// --- Global State & Configuration ---
interface OctoTentacle {
  segments: THREE.Vector3[];
  line: THREE.Line;
  angleOffset: number;
  length: number;
}

class ScalingOctoEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  
  // Objects
  private coreMesh!: THREE.Mesh;
  private tentacles: OctoTentacle[] = [];
  private particleSystem!: THREE.Points;
  private particleCount = 2000;
  
  // Interactive variables
  private mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private scaleExponent = -9; // Starts at nanometer / deep bio scale
  private pulseFactor = 0;
  private clock = new THREE.Clock();
  private frameCount = 0;
  private lastFpsUpdate = 0;
  
  // Audio synth context (lazy loaded on user interaction)
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030712, 0.035);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 18);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.initLights();
    this.initOctoCore();
    this.initTentacles();
    this.initCosmicParticles();
    this.setupEventListeners();
    this.updateHUD();

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private initLights() {
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.0);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00ffcc, 4, 50);
    pointLight.position.set(0, 0, 5);
    this.scene.add(pointLight);

    const pinkLight = new THREE.PointLight(0xff0077, 3, 50);
    pinkLight.position.set(0, 5, -5);
    this.scene.add(pinkLight);
  }

  private initOctoCore() {
    // Bioluminescent cyber core
    const coreGeo = new THREE.IcosahedronGeometry(1.6, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      wireframe: true,
      emissive: 0x006655,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.8
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.scene.add(this.coreMesh);

    // Inner glowing sphere
    const innerGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff0077,
      transparent: true,
      opacity: 0.6
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    this.coreMesh.add(innerSphere);
  }

  private initTentacles() {
    const tentacleCount = 8;
    const segmentCount = 30;
    const tentacleLength = 8.5;

    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];

      for (let s = 0; s < segmentCount; s++) {
        points.push(new THREE.Vector3(0, 0, 0));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Dynamic cyber gradient for tentacles
      const material = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0x00ffcc : 0xff0077,
        linewidth: 2,
        transparent: true,
        opacity: 0.85
      });

      const line = new THREE.Line(geometry, material);
      this.scene.add(line);

      this.tentacles.push({
        segments: points,
        line,
        angleOffset: angle,
        length: tentacleLength
      });
    }
  }

  private initCosmicParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const radius = 10 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      positions[i3] = radius * Math.cos(theta) * Math.cos(phi);
      positions[i3 + 1] = radius * Math.sin(phi);
      positions[i3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

      const isCyan = Math.random() > 0.4;
      colors[i3] = isCyan ? 0.0 : 1.0;
      colors[i3 + 1] = isCyan ? 1.0 : 0.0;
      colors[i3 + 2] = isCyan ? 0.8 : 0.4;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geo, mat);
    this.scene.add(this.particleSystem);
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      this.scaleExponent = Math.min(26, Math.max(-18, this.scaleExponent + delta));
      this.updateHUD();
      this.triggerScalePulse();
    }, { passive: false });

    const statusCore = document.querySelector('.status-core');
    statusCore?.addEventListener('click', () => {
      this.pulseCore();
      this.playSynthPing();
    });
  }

  private pulseCore() {
    this.pulseFactor = 1.0;
    const label = document.getElementById('status-label');
    if (label) {
      label.innerText = `DIMENSIONAL WARP DISCHARGED (EXP: 10^${this.scaleExponent}m)`;
      setTimeout(() => {
        label.innerText = 'OCTO NEURAL LINK SYNCHRONIZED';
      }, 1500);
    }
  }

  private triggerScalePulse() {
    this.pulseFactor = Math.max(this.pulseFactor, 0.5);
  }

  private playSynthPing() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Cyber chord harmonic
      const baseFreq = 220 * Math.pow(2, (this.scaleExponent % 12) / 12);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch {
      // Audio might be blocked by autoplay policies
    }
  }

  private updateHUD() {
    const scaleExpEl = document.getElementById('scale-exp');
    if (scaleExpEl) {
      scaleExpEl.innerText = `${this.scaleExponent}`;
    }
  }

  private animate() {
    requestAnimationFrame(this.animate);

    const elapsedTime = this.clock.getElapsedTime();
    this.frameCount++;

    // FPS calculation
    if (elapsedTime - this.lastFpsUpdate >= 0.5) {
      const fps = Math.round(this.frameCount / (elapsedTime - this.lastFpsUpdate));
      const fpsEl = document.getElementById('telemetry-fps');
      if (fpsEl) {
        fpsEl.innerText = `${fps} FPS`;
      }
      this.frameCount = 0;
      this.lastFpsUpdate = elapsedTime;
    }

    // Smooth camera / orientation follow mouse
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;
    
    this.camera.position.x = this.mouse.x * 4;
    this.camera.position.y = this.mouse.y * 3;
    this.camera.lookAt(0, 0, 0);

    // Pulse decay
    if (this.pulseFactor > 0) {
      this.pulseFactor *= 0.94;
      if (this.pulseFactor < 0.01) this.pulseFactor = 0;
    }

    // Rotate core with pulse distortion
    const scale = 1.0 + Math.sin(elapsedTime * 2.5) * 0.08 + this.pulseFactor * 0.4;
    this.coreMesh.scale.set(scale, scale, scale);
    this.coreMesh.rotation.x = elapsedTime * 0.35;
    this.coreMesh.rotation.y = elapsedTime * 0.45;

    // Undulate 8 tentacles with inverse kinematics wave formula
    this.tentacles.forEach((tentacle) => {
      const { segments, line, angleOffset, length } = tentacle;
      const count = segments.length;

      for (let s = 0; s < count; s++) {
        const t = s / (count - 1);
        const dist = t * length * (1 + this.pulseFactor * 0.3);
        
        // Compound wave dynamics
        const wave1 = Math.sin(elapsedTime * 3.0 + t * 6.0 + angleOffset) * (0.8 + t * 1.5);
        const wave2 = Math.cos(elapsedTime * 2.0 - t * 4.0) * (0.5 + t);

        const x = Math.cos(angleOffset) * dist + Math.sin(angleOffset) * wave1;
        const y = Math.sin(angleOffset) * dist - Math.cos(angleOffset) * wave1;
        const z = wave2 - Math.sin(t * Math.PI) * 1.5;

        segments[s].set(x, y, z);
      }

      line.geometry.setFromPoints(segments);
    });

    // Rotate background cosmic particles
    if (this.particleSystem) {
      this.particleSystem.rotation.y = elapsedTime * 0.03;
      this.particleSystem.rotation.x = elapsedTime * 0.015;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new ScalingOctoEngine();
});
