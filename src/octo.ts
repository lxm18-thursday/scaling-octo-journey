import * as THREE from 'three';

export interface ColorTheme {
  name: string;
  primary: number;
  secondary: number;
  accent: number;
  core: number;
}

export const COLOR_THEMES: Record<string, ColorTheme> = {
  biolum: {
    name: 'Bioluminescence',
    primary: 0x00ffcc,
    secondary: 0xff0077,
    accent: 0x7928ca,
    core: 0x00e5ff
  },
  singularity: {
    name: 'Singularity Void',
    primary: 0xa855f7,
    secondary: 0x3b82f6,
    accent: 0xec4899,
    core: 0x8b5cf6
  },
  abyssalGold: {
    name: 'Abyssal Gold',
    primary: 0xf59e0b,
    secondary: 0xef4444,
    accent: 0x10b981,
    core: 0xfbbf24
  },
  solarPlasma: {
    name: 'Solar Plasma',
    primary: 0xff3b30,
    secondary: 0xff9500,
    accent: 0xffcc00,
    core: 0xff2d55
  }
};

interface TentacleSegmentData {
  mesh: THREE.Mesh;
  suctionCups: THREE.Mesh[];
}

interface Tentacle {
  baseAngle: number;
  segments: THREE.Vector3[];
  tubeMesh: THREE.Line;
  nodes: THREE.InstancedMesh;
  length: number;
  curlDirection: number;
}

export class CyberOcto {
  public group: THREE.Group;
  
  // Meshes
  private mantleGroup: THREE.Group;
  private mantleOuter!: THREE.Mesh;
  private mantleCore!: THREE.Mesh;
  private neuralRings: THREE.Mesh[] = [];
  private eyes: { left: THREE.Mesh; right: THREE.Mesh } | null = null;
  private tentacles: Tentacle[] = [];
  private suckersInstanced!: THREE.InstancedMesh;
  
  // Discharge / Ink plasma shockwave
  private shockwaveRing!: THREE.Mesh;
  private shockwaveScale = 0;
  private shockwaveOpacity = 0;

  // State
  private currentTheme: ColorTheme = COLOR_THEMES.biolum;
  private swimPhase = 0;
  private propulsionBoost = 0;
  private lookTarget = new THREE.Vector3(0, 0, 10);
  
  // Materials list for theme updates
  private primaryMaterials: THREE.Material[] = [];
  private secondaryMaterials: THREE.Material[] = [];

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.mantleGroup = new THREE.Group();
    this.group.add(this.mantleGroup);

    this.createMantle();
    this.createEyes();
    this.createNeuralRings();
    this.createTentacles();
    this.createShockwave();

    scene.add(this.group);
  }

  private createMantle() {
    // Elegant cephalopod mantle (elongated dome)
    const mantleGeo = new THREE.ConeGeometry(1.5, 4.2, 32, 16, true);
    mantleGeo.rotateX(Math.PI); // Point mantle upwards / backwards
    mantleGeo.translate(0, 1.2, 0);

    const mantleMat = new THREE.MeshStandardMaterial({
      color: this.currentTheme.primary,
      wireframe: true,
      emissive: this.currentTheme.primary,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85
    });
    this.primaryMaterials.push(mantleMat);

    this.mantleOuter = new THREE.Mesh(mantleGeo, mantleMat);
    this.mantleGroup.add(this.mantleOuter);

    // Inner glowing brain / singularity sphere
    const coreGeo = new THREE.IcosahedronGeometry(1.1, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: this.currentTheme.secondary,
      emissive: this.currentTheme.secondary,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.75
    });
    this.secondaryMaterials.push(coreMat);

    this.mantleCore = new THREE.Mesh(coreGeo, coreMat);
    this.mantleCore.position.set(0, 0.6, 0);
    this.mantleGroup.add(this.mantleCore);
  }

  private createEyes() {
    const eyeGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const pupilGeo = new THREE.SphereGeometry(0.18, 16, 16);

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x050b14,
      roughness: 0.1,
      metalness: 0.9
    });

    const pupilMat = new THREE.MeshBasicMaterial({
      color: this.currentTheme.primary
    });
    this.primaryMaterials.push(pupilMat);

    // Left eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-1.1, -0.4, 0.7);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, 0.28);
    leftEye.add(leftPupil);
    this.mantleGroup.add(leftEye);

    // Right eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(1.1, -0.4, 0.7);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, 0.28);
    rightEye.add(rightPupil);
    this.mantleGroup.add(rightEye);

    this.eyes = { left: leftEye, right: rightEye };
  }

  private createNeuralRings() {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringGeo = new THREE.TorusGeometry(1.8 + i * 0.35, 0.02, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? this.currentTheme.primary : this.currentTheme.secondary,
        transparent: true,
        opacity: 0.5
      });
      if (i % 2 === 0) this.primaryMaterials.push(ringMat);
      else this.secondaryMaterials.push(ringMat);

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 0.6, 0);
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.25;
      ring.rotation.y = (i * Math.PI) / 3;
      this.mantleGroup.add(ring);
      this.neuralRings.push(ring);
    }
  }

  private createTentacles() {
    const tentacleCount = 8;
    const segmentCount = 35;
    const totalSuckers = tentacleCount * segmentCount;

    // Glowing suction cup instanced nodes
    const suckerGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const suckerMat = new THREE.MeshBasicMaterial({
      color: this.currentTheme.primary
    });
    this.primaryMaterials.push(suckerMat);

    this.suckersInstanced = new THREE.InstancedMesh(suckerGeo, suckerMat, totalSuckers);
    this.suckersInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.suckersInstanced);

    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];

      for (let s = 0; s < segmentCount; s++) {
        points.push(new THREE.Vector3(0, 0, 0));
      }

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? this.currentTheme.primary : this.currentTheme.secondary,
        linewidth: 2,
        transparent: true,
        opacity: 0.8
      });
      if (i % 2 === 0) this.primaryMaterials.push(lineMat);
      else this.secondaryMaterials.push(lineMat);

      const line = new THREE.Line(lineGeo, lineMat);
      this.group.add(line);

      this.tentacles.push({
        baseAngle: angle,
        segments: points,
        tubeMesh: line,
        nodes: this.suckersInstanced,
        length: 10.5,
        curlDirection: i % 2 === 0 ? 1 : -1
      });
    }
  }

  private createShockwave() {
    const geo = new THREE.RingGeometry(0.5, 0.9, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: this.currentTheme.primary,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    this.primaryMaterials.push(mat);

    this.shockwaveRing = new THREE.Mesh(geo, mat);
    this.shockwaveRing.rotation.x = Math.PI / 2;
    this.group.add(this.shockwaveRing);
  }

  public triggerDischarge() {
    this.propulsionBoost = 1.0;
    this.shockwaveScale = 0.5;
    this.shockwaveOpacity = 1.0;
  }

  public setTheme(themeKey: string) {
    const theme = COLOR_THEMES[themeKey];
    if (!theme) return;
    this.currentTheme = theme;

    this.primaryMaterials.forEach(m => {
      if ('color' in m) (m as THREE.MeshBasicMaterial).color.setHex(theme.primary);
      if ('emissive' in m) (m as THREE.MeshStandardMaterial).emissive.setHex(theme.primary);
    });

    this.secondaryMaterials.forEach(m => {
      if ('color' in m) (m as THREE.MeshBasicMaterial).color.setHex(theme.secondary);
      if ('emissive' in m) (m as THREE.MeshStandardMaterial).emissive.setHex(theme.secondary);
    });
  }

  public update(delta: number, elapsedTime: number, targetDir: THREE.Vector3) {
    // Interpolate look direction
    this.lookTarget.lerp(targetDir, 0.05);

    // Cephalopod swimming cycle: rhythmic mantle contraction & propulsion
    this.swimPhase += delta * (1.8 + this.propulsionBoost * 3.0);
    const contract = Math.sin(this.swimPhase);
    const mantleSquashY = 1.0 + contract * 0.18 + this.propulsionBoost * 0.3;
    const mantleSquashXZ = 1.0 - contract * 0.12 - this.propulsionBoost * 0.2;

    this.mantleOuter.scale.set(mantleSquashXZ, mantleSquashY, mantleSquashXZ);
    this.mantleCore.rotation.y = elapsedTime * 0.8;
    this.mantleCore.rotation.z = Math.sin(elapsedTime) * 0.3;

    // Rotate neural rings
    this.neuralRings.forEach((ring, idx) => {
      ring.rotation.z = elapsedTime * (0.4 + idx * 0.2);
    });

    // Make eyes look towards pointer
    if (this.eyes) {
      this.eyes.left.lookAt(this.lookTarget);
      this.eyes.right.lookAt(this.lookTarget);
    }

    // Decay propulsion boost
    if (this.propulsionBoost > 0) {
      this.propulsionBoost *= 0.94;
      if (this.propulsionBoost < 0.01) this.propulsionBoost = 0;
    }

    // Shockwave expansion
    if (this.shockwaveOpacity > 0.01) {
      this.shockwaveScale += delta * 18;
      this.shockwaveOpacity *= 0.92;
      this.shockwaveRing.scale.set(this.shockwaveScale, this.shockwaveScale, this.shockwaveScale);
      (this.shockwaveRing.material as THREE.MeshBasicMaterial).opacity = this.shockwaveOpacity;
    } else {
      (this.shockwaveRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // Update 8 tentacles inverse wave kinematics
    const dummyMatrix = new THREE.Matrix4();
    let suckerIndex = 0;

    this.tentacles.forEach((tentacle) => {
      const { baseAngle, segments, tubeMesh, length, curlDirection } = tentacle;
      const segCount = segments.length;

      // Base anchor at bottom rim of mantle
      const baseRadius = 1.1;
      const rootX = Math.cos(baseAngle) * baseRadius;
      const rootZ = Math.sin(baseAngle) * baseRadius;
      const rootY = -0.8;

      segments[0].set(rootX, rootY, rootZ);

      for (let s = 1; s < segCount; s++) {
        const t = s / (segCount - 1); // 0.0 at root, 1.0 at tip
        const currentDist = t * length;

        // Wave propagation along tentacle
        const waveProgress = this.swimPhase - t * 4.5;
        const undulation = Math.sin(waveProgress) * (0.4 + t * 1.8);
        const flare = Math.cos(waveProgress * 0.7) * (0.3 + t * 1.2);

        // Jetting stream effect during swim contraction
        const streamline = (1.0 - contract * 0.4) * (1.0 - this.propulsionBoost * 0.5);

        const x = Math.cos(baseAngle) * (baseRadius + currentDist * 0.35 * streamline) +
                  Math.sin(baseAngle) * undulation * curlDirection;
        const z = Math.sin(baseAngle) * (baseRadius + currentDist * 0.35 * streamline) -
                  Math.cos(baseAngle) * undulation * curlDirection;
        const y = rootY - currentDist * (0.8 + contract * 0.2) + flare;

        segments[s].set(x, y, z);

        // Suction cup matrix transform
        const suckerScale = (1.0 - t * 0.7) * (0.9 + Math.sin(elapsedTime * 4 + s) * 0.15);
        dummyMatrix.makeScale(suckerScale, suckerScale, suckerScale);
        dummyMatrix.setPosition(x, y, z);
        this.suckersInstanced.setMatrixAt(suckerIndex++, dummyMatrix);
      }

      tubeMesh.geometry.setFromPoints(segments);
    });

    this.suckersInstanced.instanceMatrix.needsUpdate = true;

    // Slight celestial floating drift of the entire octo body
    this.group.position.y = Math.sin(elapsedTime * 1.2) * 0.4;
    this.group.rotation.y = Math.sin(elapsedTime * 0.5) * 0.15;
  }
}
