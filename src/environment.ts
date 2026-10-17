import * as THREE from 'three';

export interface DimensionBiome {
  id: number;
  name: string;
  subName: string;
  scaleExp: number;
  scaleLabel: string;
  fogColor: number;
  fogDensity: number;
  lightColor: number;
}

export const BIOMES: DimensionBiome[] = [
  {
    id: 0,
    name: 'QUANTUM FOAM',
    subName: '超维量子泡 · 普朗克微观奇点',
    scaleExp: -15,
    scaleLabel: '10^-15 m (subatomic)',
    fogColor: 0x070114,
    fogDensity: 0.045,
    lightColor: 0xa855f7
  },
  {
    id: 1,
    name: 'ABYSSAL TRENCH',
    subName: '深海渊裂 · 生物荧光黑潮',
    scaleExp: 1,
    scaleLabel: '10^1 m (deep oceanic)',
    fogColor: 0x01131b,
    fogDensity: 0.035,
    lightColor: 0x00ffcc
  },
  {
    id: 2,
    name: 'CYBER MATRIX',
    subName: '矩阵中枢 · 数字神经流网',
    scaleExp: 9,
    scaleLabel: '10^9 m (planetary network)',
    fogColor: 0x0a0518,
    fogDensity: 0.03,
    lightColor: 0xec4899
  },
  {
    id: 3,
    name: 'COSMIC NEBULA',
    subName: '群星深空 · 超维宇宙星系织造',
    scaleExp: 24,
    scaleLabel: '10^24 m (galactic observable)',
    fogColor: 0x02030a,
    fogDensity: 0.02,
    lightColor: 0x38bdf8
  }
];

export class MultiScaleEnvironment {
  public group: THREE.Group;
  private scene: THREE.Scene;

  // Particle systems for different biomes
  private quantumParticles!: THREE.Points;
  private marineSnowParticles!: THREE.Points;
  private cyberGrid!: THREE.GridHelper;
  private cosmicGalaxyParticles!: THREE.Points;
  private celestialRings: THREE.Mesh[] = [];

  // Environment state
  private activeBiomeIndex = 1; // Default to Abyssal
  private targetFogColor = new THREE.Color(BIOMES[1].fogColor);
  private targetFogDensity = BIOMES[1].fogDensity;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.initQuantumField();
    this.initMarineSnow();
    this.initCyberGrid();
    this.initCosmicGalaxy();
  }

  private initQuantumField() {
    const count = 1500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 35;
      positions[i3 + 1] = (Math.random() - 0.5) * 35;
      positions[i3 + 2] = (Math.random() - 0.5) * 35;

      colors[i3] = 0.6 + Math.random() * 0.4;
      colors[i3 + 1] = 0.1;
      colors[i3 + 2] = 0.9;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.quantumParticles = new THREE.Points(geo, mat);
    this.group.add(this.quantumParticles);
  }

  private initMarineSnow() {
    const count = 2200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 60;
      positions[i3 + 1] = (Math.random() - 0.5) * 60;
      positions[i3 + 2] = (Math.random() - 0.5) * 60;

      const isCyan = Math.random() > 0.3;
      colors[i3] = isCyan ? 0.0 : 0.4;
      colors[i3 + 1] = isCyan ? 0.9 : 0.8;
      colors[i3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.marineSnowParticles = new THREE.Points(geo, mat);
    this.group.add(this.marineSnowParticles);
  }

  private initCyberGrid() {
    // Cyber matrix plane
    this.cyberGrid = new THREE.GridHelper(70, 35, 0xff0077, 0x00ffcc);
    this.cyberGrid.position.y = -14;
    (this.cyberGrid.material as THREE.Material).transparent = true;
    (this.cyberGrid.material as THREE.Material).opacity = 0.45;
    this.group.add(this.cyberGrid);

    // Planetary digital rings
    for (let r = 0; r < 2; r++) {
      const ringGeo = new THREE.RingGeometry(18 + r * 6, 18.2 + r * 6, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: r === 0 ? 0x00ffcc : 0xff0077,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 3;
      ring.position.set(0, -2, -10);
      this.group.add(ring);
      this.celestialRings.push(ring);
    }
  }

  private initCosmicGalaxy() {
    const starCount = 3500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    // Generate logarithmic spiral arms of galaxy
    const arms = 3;
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), 2) * 50 + 2;
      const armAngle = ((i % arms) * (2 * Math.PI)) / arms;
      const angle = armAngle + r * 0.15 + (Math.random() - 0.5) * 0.4;

      positions[i3] = Math.cos(angle) * r;
      positions[i3 + 1] = (Math.random() - 0.5) * (r * 0.2 + 2);
      positions[i3 + 2] = Math.sin(angle) * r;

      // Color from galactic core (warm white) to outer arms (cyan / violet)
      const t = r / 50;
      colors[i3] = 0.5 + 0.5 * (1 - t);
      colors[i3 + 1] = 0.7 * (1 - t * 0.5);
      colors[i3 + 2] = 0.9;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.cosmicGalaxyParticles = new THREE.Points(geo, mat);
    this.cosmicGalaxyParticles.rotation.x = 0.4;
    this.group.add(this.cosmicGalaxyParticles);
  }

  public setBiome(index: number) {
    if (index < 0 || index >= BIOMES.length) return;
    this.activeBiomeIndex = index;
    const biome = BIOMES[index];
    this.targetFogColor.setHex(biome.fogColor);
    this.targetFogDensity = biome.fogDensity;
  }

  public getCurrentBiome(): DimensionBiome {
    return BIOMES[this.activeBiomeIndex];
  }

  public update(delta: number, elapsedTime: number) {
    // Smooth fog transition
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(this.targetFogColor, 0.05);
      this.scene.fog.density += (this.targetFogDensity - this.scene.fog.density) * 0.05;
    }

    // Biome visibility blending based on active index
    const qTarget = this.activeBiomeIndex === 0 ? 0.9 : 0.15;
    const mTarget = this.activeBiomeIndex === 1 ? 0.9 : 0.2;
    const cTarget = this.activeBiomeIndex === 2 ? 0.6 : 0.1;
    const gTarget = this.activeBiomeIndex === 3 ? 0.9 : 0.25;

    (this.quantumParticles.material as THREE.PointsMaterial).opacity +=
      (qTarget - (this.quantumParticles.material as THREE.PointsMaterial).opacity) * 0.05;
    (this.marineSnowParticles.material as THREE.PointsMaterial).opacity +=
      (mTarget - (this.marineSnowParticles.material as THREE.PointsMaterial).opacity) * 0.05;
    (this.cyberGrid.material as THREE.Material).opacity +=
      (cTarget - (this.cyberGrid.material as THREE.Material).opacity) * 0.05;
    (this.cosmicGalaxyParticles.material as THREE.PointsMaterial).opacity +=
      (gTarget - (this.cosmicGalaxyParticles.material as THREE.PointsMaterial).opacity) * 0.05;

    // Quantum jitter
    if (this.activeBiomeIndex === 0) {
      this.quantumParticles.rotation.y = elapsedTime * 0.12;
      this.quantumParticles.rotation.z = Math.sin(elapsedTime * 0.5) * 0.2;
    }

    // Marine snow gentle falling current
    const snowPositions = this.marineSnowParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 1; i < snowPositions.length; i += 3) {
      snowPositions[i] -= delta * 1.5;
      if (snowPositions[i] < -30) snowPositions[i] = 30;
    }
    this.marineSnowParticles.geometry.attributes.position.needsUpdate = true;

    // Cyber grid crawl
    this.cyberGrid.position.z = (elapsedTime * 4) % 2;

    // Celestial rings spin
    this.celestialRings.forEach((ring, idx) => {
      ring.rotation.z = elapsedTime * (0.05 + idx * 0.03);
    });

    // Cosmic galaxy vortex rotation
    this.cosmicGalaxyParticles.rotation.y = elapsedTime * 0.025;
  }
}
