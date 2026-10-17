import * as THREE from 'three';
import { CyberOcto, COLOR_THEMES } from './octo';
import { MultiScaleEnvironment, BIOMES } from './environment';
import { OctoAudioSynth } from './audio';

class ScalingOctoJourneyApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  // Components
  private octo: CyberOcto;
  private env: MultiScaleEnvironment;
  private audio: OctoAudioSynth;

  // Lighting
  private ambientLight!: THREE.AmbientLight;
  private keyLight!: THREE.PointLight;
  private rimLight!: THREE.PointLight;

  // Interactive controls state
  private mouse = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isDragging: false,
    prevX: 0,
    prevY: 0
  };
  private orbitAngles = { theta: 0, phi: 0, targetTheta: 0, targetPhi: 0 };
  private cameraDistance = 18;
  private targetCameraDistance = 18;

  // Animation & Telemetry
  private clock = new THREE.Clock();
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentBiomeIdx = 1;

  constructor() {
    this.canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;

    // 1. Scene & Fog Setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(BIOMES[1].fogColor, BIOMES[1].fogDensity);

    // 2. Camera Setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1200
    );
    this.camera.position.set(0, 0, this.cameraDistance);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Initialize Core Systems
    this.initLights();
    this.env = new MultiScaleEnvironment(this.scene);
    this.octo = new CyberOcto(this.scene);
    this.audio = new OctoAudioSynth();

    // 5. Setup Event Listeners & UI Binding
    this.setupEventListeners();
    this.setupUI();

    // 6. Start Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private initLights() {
    this.ambientLight = new THREE.AmbientLight(0x0a101f, 2.5);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.PointLight(0x00ffcc, 5, 60);
    this.keyLight.position.set(0, 4, 10);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.PointLight(0xff0077, 4, 60);
    this.rimLight.position.set(0, -6, -8);
    this.scene.add(this.rimLight);
  }

  private setupEventListeners() {
    // Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Mouse Move (Ray/Pointer orientation)
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;

      if (this.mouse.isDragging) {
        const deltaX = e.clientX - this.mouse.prevX;
        const deltaY = e.clientY - this.mouse.prevY;
        this.orbitAngles.targetTheta += deltaX * 0.006;
        this.orbitAngles.targetPhi = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, this.orbitAngles.targetPhi - deltaY * 0.006)
        );
        this.mouse.prevX = e.clientX;
        this.mouse.prevY = e.clientY;
      }
    });

    // Pointer drag for camera orbit
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.isDragging = true;
      this.mouse.prevX = e.clientX;
      this.mouse.prevY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDragging = false;
    });

    // Wheel: zoom camera and scale shift
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      if (delta > 0 && this.currentBiomeIdx < BIOMES.length - 1) {
        this.switchBiome(this.currentBiomeIdx + 1);
      } else if (delta < 0 && this.currentBiomeIdx > 0) {
        this.switchBiome(this.currentBiomeIdx - 1);
      }
    }, { passive: false });

    // Keyboard Shortcuts (1-4: Dimensions, Space: Pulse, M: Sound)
    window.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        this.switchBiome(idx);
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.triggerNeuralPulse();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleSound();
      }
    });
  }

  private setupUI() {
    // Dimension Navigation Pills
    const dimPills = document.querySelectorAll('.dim-pill');
    dimPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const idx = parseInt(pill.getAttribute('data-biome') || '0');
        this.switchBiome(idx);
      });
    });

    // Discharge Button
    const dischargeBtn = document.getElementById('btn-discharge');
    dischargeBtn?.addEventListener('click', () => {
      this.triggerNeuralPulse();
    });

    // Sound Toggle Button
    const soundBtn = document.getElementById('btn-sound');
    soundBtn?.addEventListener('click', () => {
      this.toggleSound();
    });

    // Theme Picker Dots
    const themeDots = document.querySelectorAll('.theme-dot');
    themeDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const theme = dot.getAttribute('data-theme') || 'biolum';
        this.octo.setTheme(theme);

        themeDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');

        // Update keylight color to match theme
        const activeTheme = COLOR_THEMES[theme];
        if (activeTheme) {
          this.keyLight.color.setHex(activeTheme.primary);
          this.rimLight.color.setHex(activeTheme.secondary);
        }
      });
    });
  }

  private switchBiome(idx: number) {
    if (idx < 0 || idx >= BIOMES.length) return;
    this.currentBiomeIdx = idx;
    this.env.setBiome(idx);

    const biome = BIOMES[idx];

    // Update Subtitle
    const subTitleEl = document.getElementById('biome-subtitle');
    if (subTitleEl) {
      subTitleEl.innerText = `${biome.subName} (${biome.scaleLabel})`;
    }

    // Update Scale Telemetry
    const scaleExpEl = document.getElementById('scale-exp');
    if (scaleExpEl) {
      scaleExpEl.innerText = `${biome.scaleExp}`;
    }

    // Update Pills Active State
    const dimPills = document.querySelectorAll('.dim-pill');
    dimPills.forEach((p) => {
      const bIdx = parseInt(p.getAttribute('data-biome') || '-1');
      if (bIdx === idx) p.classList.add('active');
      else p.classList.remove('active');
    });

    // Audio frequency update & discharge ping
    this.audio.updateDroneByScale(biome.scaleExp);
    this.audio.playSonarPing(0.8 + idx * 0.2);

    // Camera push forward/backward warp effect
    this.targetCameraDistance = 14 + (idx % 2) * 5;
  }

  private triggerNeuralPulse() {
    this.octo.triggerDischarge();
    this.audio.playWarpDischarge();

    const label = document.getElementById('status-label');
    if (label) {
      label.innerText = '⚡ WARP SINGULARITY DISCHARGED · DIMENSIONAL FLUX 100%';
      label.style.color = '#00ffcc';
      setTimeout(() => {
        label.innerText = 'NEURAL LINK ENGAGED · CLICK TO DISCHARGE';
        label.style.color = '#f1f5f9';
      }, 1600);
    }
  }

  private toggleSound() {
    const isNowPlaying = this.audio.toggleMute();
    const soundBtn = document.getElementById('btn-sound');
    const soundLabel = document.getElementById('sound-label');

    if (soundBtn && soundLabel) {
      if (isNowPlaying) {
        soundBtn.classList.add('active');
        soundLabel.innerText = 'AUDIO: ON';
      } else {
        soundBtn.classList.remove('active');
        soundLabel.innerText = 'AUDIO: OFF';
      }
    }
  }

  private animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    this.frameCount++;

    // Calculate FPS
    if (elapsedTime - this.lastFpsTime >= 0.5) {
      const fps = Math.round(this.frameCount / (elapsedTime - this.lastFpsTime));
      const fpsEl = document.getElementById('telemetry-fps');
      if (fpsEl) fpsEl.innerText = `${fps} FPS`;
      this.frameCount = 0;
      this.lastFpsTime = elapsedTime;
    }

    // Smooth Orbit & Mouse tracking
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    this.orbitAngles.theta += (this.orbitAngles.targetTheta - this.orbitAngles.theta) * 0.08;
    this.orbitAngles.phi += (this.orbitAngles.targetPhi - this.orbitAngles.phi) * 0.08;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.05;

    // Spherical camera position
    const radius = this.cameraDistance;
    const cosPhi = Math.cos(this.orbitAngles.phi);
    this.camera.position.x = radius * cosPhi * Math.sin(this.orbitAngles.theta) + this.mouse.x * 2.0;
    this.camera.position.y = radius * Math.sin(this.orbitAngles.phi) + this.mouse.y * 1.5;
    this.camera.position.z = radius * cosPhi * Math.cos(this.orbitAngles.theta);
    this.camera.lookAt(0, 0, 0);

    // Look vector for Octo eyes and head orientation
    const targetDir = new THREE.Vector3(this.mouse.x * 8, this.mouse.y * 6, 12);

    // Update Subsystems
    this.octo.update(delta, elapsedTime, targetDir);
    this.env.update(delta, elapsedTime);

    this.renderer.render(this.scene, this.camera);
  }
}

// Bootstrap application on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  new ScalingOctoJourneyApp();
});
