import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { CyberOcto, COLOR_THEMES } from './octo';
import { MultiScaleEnvironment, BIOMES } from './environment';
import { OctoAudioSynth } from './audio';
import { DimensionalQuantaSystem } from './quanta';
import { CephalopodInkSystem } from './ink';
import { CinematicDirector } from './cinematic';

class ScalingOctoJourneyApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;

  // Systems
  private octo: CyberOcto;
  private env: MultiScaleEnvironment;
  private audio: OctoAudioSynth;
  private quanta: DimensionalQuantaSystem;
  private ink: CephalopodInkSystem;
  private cinematic: CinematicDirector;

  // Lighting
  private ambientLight!: THREE.AmbientLight;
  private keyLight!: THREE.PointLight;
  private rimLight!: THREE.PointLight;

  // Interactive controls
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

  // Loop & Telemetry
  private clock = new THREE.Clock();
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentBiomeIdx = 1;
  private harvestCount = 0;

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

    // 3. High-Performance Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // Antialiasing handled efficiently with postprocessing
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 4. Postprocessing Pipeline (Unreal Bloom Glow)
    this.initPostprocessing();

    // 5. Lighting Setup
    this.initLights();

    // 6. Subsystems Initialization
    this.audio = new OctoAudioSynth();
    this.env = new MultiScaleEnvironment(this.scene);
    this.octo = new CyberOcto(this.scene);
    this.ink = new CephalopodInkSystem(this.scene);
    this.cinematic = new CinematicDirector(this.camera);

    this.quanta = new DimensionalQuantaSystem(this.scene, (total) => {
      this.harvestCount = total;
      this.audio.playHarvestChime(total);
      this.updateHarvestUI(total);
    });

    // 7. Event & UI Wiring
    this.setupEventListeners();
    this.setupUI();

    // 8. Start Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private initPostprocessing() {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // High-end Cyber Bloom Pass
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.15, // Strength
      0.45, // Radius
      0.65  // Threshold
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  private initLights() {
    this.ambientLight = new THREE.AmbientLight(0x0a101f, 2.5);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.PointLight(0x00ffcc, 5, 70);
    this.keyLight.position.set(0, 5, 12);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.PointLight(0xff0077, 4.5, 70);
    this.rimLight.position.set(0, -6, -10);
    this.scene.add(this.rimLight);
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.composer.setSize(width, height);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;

      if (this.mouse.isDragging && !this.cinematic.getIsCinematic()) {
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

    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.isDragging = true;
      this.mouse.prevX = e.clientX;
      this.mouse.prevY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDragging = false;
    });

    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      if (delta > 0 && this.currentBiomeIdx < BIOMES.length - 1) {
        this.switchBiome(this.currentBiomeIdx + 1);
      } else if (delta < 0 && this.currentBiomeIdx > 0) {
        this.switchBiome(this.currentBiomeIdx - 1);
      }
    }, { passive: false });

    // Keyboard controls:
    // 1-4: Dimension biomes
    // Space: Discharge ink plasma
    // M: Sound toggle
    // C: Cinematic mode
    // T: Codex drawer toggle
    window.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        this.switchBiome(idx);
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.triggerNeuralPulse();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleSound();
      } else if (e.key === 'c' || e.key === 'C') {
        this.toggleCinematic();
      } else if (e.key === 't' || e.key === 'T') {
        this.toggleCodex();
      }
    });
  }

  private setupUI() {
    // Dimension pills
    const dimPills = document.querySelectorAll('.dim-pill');
    dimPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const idx = parseInt(pill.getAttribute('data-biome') || '0');
        this.switchBiome(idx);
      });
    });

    // Neural discharge button
    const dischargeBtn = document.getElementById('btn-discharge');
    dischargeBtn?.addEventListener('click', () => {
      this.triggerNeuralPulse();
    });

    // Sound toggle
    const soundBtn = document.getElementById('btn-sound');
    soundBtn?.addEventListener('click', () => {
      this.toggleSound();
    });

    // Cinematic toggle
    const cineBtn = document.getElementById('btn-cinematic');
    cineBtn?.addEventListener('click', () => {
      this.toggleCinematic();
    });

    // Codex toggle
    const codexBtn = document.getElementById('btn-codex');
    const closeCodexBtn = document.getElementById('btn-close-codex');
    codexBtn?.addEventListener('click', () => this.toggleCodex());
    closeCodexBtn?.addEventListener('click', () => this.toggleCodex(false));

    // Theme dots
    const themeDots = document.querySelectorAll('.theme-dot');
    themeDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const theme = dot.getAttribute('data-theme') || 'biolum';
        this.octo.setTheme(theme);

        themeDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');

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

    const subTitleEl = document.getElementById('biome-subtitle');
    if (subTitleEl) {
      subTitleEl.innerText = `${biome.subName} (${biome.scaleLabel})`;
    }

    const scaleExpEl = document.getElementById('scale-exp');
    if (scaleExpEl) {
      scaleExpEl.innerText = `${biome.scaleExp}`;
    }

    const dimPills = document.querySelectorAll('.dim-pill');
    dimPills.forEach((p) => {
      const bIdx = parseInt(p.getAttribute('data-biome') || '-1');
      if (bIdx === idx) p.classList.add('active');
      else p.classList.remove('active');
    });

    this.audio.updateDroneByScale(biome.scaleExp);
    this.audio.playSonarPing(0.85 + idx * 0.15);
    this.cinematic.triggerCameraShake(0.8);
    this.targetCameraDistance = 14 + (idx % 2) * 5;

    // Update Codex Lore Text
    const codexLoreEl = document.getElementById('codex-biome-lore');
    if (codexLoreEl) {
      codexLoreEl.innerText = biome.subName;
    }
  }

  private triggerNeuralPulse() {
    this.octo.triggerDischarge();
    this.audio.playWarpDischarge();
    this.cinematic.triggerCameraShake(1.5);

    // Eject volumetric ink plasma
    const siphonPos = this.octo.getSiphonPosition();
    const currentTheme = this.octo.getCurrentTheme();
    this.ink.discharge(
      siphonPos,
      new THREE.Vector3(0, -1, -0.6), // Thrust direction
      currentTheme.primary,
      currentTheme.secondary
    );

    const label = document.getElementById('status-label');
    if (label) {
      label.innerText = '⚡ WARP SINGULARITY DISCHARGED · PLASMA JET ENGAGED';
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

  private toggleCinematic() {
    const active = this.cinematic.toggle();
    const cineBtn = document.getElementById('btn-cinematic');
    const cineLabel = document.getElementById('cinematic-label');
    if (cineBtn && cineLabel) {
      if (active) {
        cineBtn.classList.add('active');
        cineLabel.innerText = 'ODYSSEY: AUTO';
      } else {
        cineBtn.classList.remove('active');
        cineLabel.innerText = 'ODYSSEY: MANUAL';
      }
    }
  }

  private toggleCodex(forceState?: boolean) {
    const drawer = document.getElementById('codex-drawer');
    if (!drawer) return;
    if (forceState !== undefined) {
      if (forceState) drawer.classList.add('open');
      else drawer.classList.remove('open');
    } else {
      drawer.classList.toggle('open');
    }
  }

  private updateHarvestUI(total: number) {
    const harvestEl = document.getElementById('telemetry-quanta');
    if (harvestEl) harvestEl.innerText = `${total} QUANTA`;
    const codexHarvestEl = document.getElementById('codex-quanta-harvested');
    if (codexHarvestEl) codexHarvestEl.innerText = `${total}`;
  }

  private animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    this.frameCount++;

    // Telemetry calculations
    if (elapsedTime - this.lastFpsTime >= 0.5) {
      const fps = Math.round(this.frameCount / (elapsedTime - this.lastFpsTime));
      const fpsEl = document.getElementById('telemetry-fps');
      if (fpsEl) fpsEl.innerText = `${fps} FPS`;
      this.frameCount = 0;
      this.lastFpsTime = elapsedTime;

      // Update Cephalopod Heart Rates
      const heartAEl = document.getElementById('codex-heart-a');
      const heartBEl = document.getElementById('codex-heart-b');
      if (heartAEl) heartAEl.innerText = `${56 + Math.round(Math.sin(elapsedTime * 0.5) * 6)} BPM`;
      if (heartBEl) heartBEl.innerText = `${52 + Math.round(Math.cos(elapsedTime * 0.5) * 5)} BPM`;
    }

    // Audio heart pulse rhythm
    this.audio.updateHeartbeat(elapsedTime, 56);

    // Smooth Orbit & Mouse tracking in manual mode
    if (!this.cinematic.getIsCinematic()) {
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

      this.orbitAngles.theta += (this.orbitAngles.targetTheta - this.orbitAngles.theta) * 0.08;
      this.orbitAngles.phi += (this.orbitAngles.targetPhi - this.orbitAngles.phi) * 0.08;
      this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.05;

      const radius = this.cameraDistance;
      const cosPhi = Math.cos(this.orbitAngles.phi);
      this.camera.position.x = radius * cosPhi * Math.sin(this.orbitAngles.theta) + this.mouse.x * 2.0;
      this.camera.position.y = radius * Math.sin(this.orbitAngles.phi) + this.mouse.y * 1.5;
      this.camera.position.z = radius * cosPhi * Math.cos(this.orbitAngles.theta);
      this.camera.lookAt(0, 0, 0);
    } else {
      // Cinematic Camera Director update
      const shotInfo = this.cinematic.update(delta);
      const shotLabel = document.getElementById('cinematic-shot-name');
      if (shotLabel && shotInfo) {
        shotLabel.innerText = shotInfo.currentShotName;
      }
    }

    // Target direction for Octo gaze
    const targetDir = new THREE.Vector3(this.mouse.x * 8, this.mouse.y * 6, 12);

    // Check Nearest Quanta for Octo Tentacle Attraction
    const nearestOrb = this.quanta.getNearestOrbPosition(new THREE.Vector3(0, 0, 0));
    this.octo.setNearestTarget(nearestOrb);

    // Update Subsystems
    this.octo.update(delta, elapsedTime, targetDir);
    this.env.update(delta, elapsedTime);
    this.quanta.update(delta, elapsedTime);
    this.ink.update(delta);

    // Check Tentacle tips harvesting interaction
    const tentacleTips = this.octo.getTentacleTips();
    this.quanta.checkHarvestInteractions(tentacleTips, 2.4);

    // Render with Bloom Postprocessing
    this.composer.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ScalingOctoJourneyApp();
});
