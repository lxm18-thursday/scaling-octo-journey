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

interface Tentacle {
  baseAngle: number;
  segments: THREE.Vector3[];
  tubeMesh: THREE.Line;
  length: number;
  curlDirection: number;
  tipPosition: THREE.Vector3;
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
  
  // Shockwave ring
  private shockwaveRing!: THREE.Mesh;
  private shockwaveScale = 0;
  private shockwaveOpacity = 0;

  // State
  private currentTheme: ColorTheme = COLOR_THEMES.biolum;
  private swimPhase = 0;
  private propulsionBoost = 0;
  private lookTarget = new THREE.Vector3(0, 0, 10);
  private nearestTarget: THREE.Vector3 | null = null;
  
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
    // Elegant cephalopod mantle
    const mantleGeo = new THREE.ConeGeometry(1.55, 4.4, 32, 16, true);
    mantleGeo.rotateX(Math.PI);
    mantleGeo.translate(0, 1.3, 0);

    const mantleMat = new THREE.MeshStandardMaterial({
      color: this.currentTheme.primary,
      wireframe: true,
      emissive: this.currentTheme.primary,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.9,
      transparent: true,
      opacity: 0.88
    });
    this.primaryMaterials.push(mantleMat);

    this.mantleOuter = new THREE.Mesh(mantleGeo, mantleMat);
    this.mantleGroup.add(this.mantleOuter);

    // Inner glowing brain / singularity sphere
    const coreGeo = new THREE.IcosahedronGeometry(1.15, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: this.currentTheme.secondary,
      emissive: this.currentTheme.secondary,
      emissiveIntensity: 1.4,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.8
    });
    this.secondaryMaterials.push(coreMat);

    this.mantleCore = new THREE.Mesh(coreGeo, coreMat);
    this.mantleCore.position.set(0, 0.6, 0);
    this.mantleGroup.add(this.mantleCore);
  }

  private createEyes() {
    const eyeGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const pupilGeo = new THREE.SphereGeometry(0.2, 16, 16);

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
    leftEye.position.set(-1.15, -0.4, 0.75);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, 0.3);
    leftEye.add(leftPupil);
    this.mantleGroup.add(leftEye);

    // Right eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(1.15, -0.4, 0.75);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, 0.3);
    rightEye.add(rightPupil);
    this.mantleGroup.add(rightEye);

    this.eyes = { left: leftEye, right: rightEye };
  }

  private createNeuralRings() {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringGeo = new THREE.TorusGeometry(1.85 + i * 0.38, 0.025, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? this.currentTheme.primary : this.currentTheme.secondary,
        transparent: true,
        opacity: 0.6
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
    const segmentCount = 36;
    const totalSuckers = tentacleCount * segmentCount;

    // Glowing suction cup instanced nodes
    const suckerGeo = new THREE.SphereGeometry(0.09, 8, 8);
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
        opacity: 0.85
      });
      if (i % 2 === 0) this.primaryMaterials.push(lineMat);
      else this.secondaryMaterials.push(lineMat);

      const line = new THREE.Line(lineGeo, lineMat);
      this.group.add(line);

      this.tentacles.push({
        baseAngle: angle,
        segments: points,
        tubeMesh: line,
        length: 11.0,
        curlDirection: i % 2 === 0 ? 1 : -1,
        tipPosition: new THREE.Vector3(0, 0, 0)
      });
    }
  }

  private createShockwave() {
    const geo = new THREE.RingGeometry(0.6, 1.1, 48);
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

  public getSiphonPosition(): THREE.Vector3 {
    return new THREE.Vector3(0, 1.2, 0).applyMatrix4(this.group.matrixWorld);
  }

  public getTentacleTips(): THREE.Vector3[] {
    return this.tentacles.map(t => t.tipPosition.clone().applyMatrix4(this.group.matrixWorld));
  }

  public setNearestTarget(target: THREE.Vector3 | null) {
    this.nearestTarget = target;
  }

  public getCurrentTheme(): ColorTheme {
    return this.currentTheme;
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
    this.lookTarget.lerp(targetDir, 0.06);

    // Cephalopod hydrodynamic breathing & propulsion
    this.swimPhase += delta * (1.9 + this.propulsionBoost * 3.5);
    const contract = Math.sin(this.swimPhase);
    const mantleSquashY = 1.0 + contract * 0.18 + this.propulsionBoost * 0.35;
    const mantleSquashXZ = 1.0 - contract * 0.14 - this.propulsionBoost * 0.25;

    this.mantleOuter.scale.set(mantleSquashXZ, mantleSquashY, mantleSquashXZ);
    this.mantleCore.rotation.y = elapsedTime * 0.9;
    this.mantleCore.rotation.z = Math.sin(elapsedTime) * 0.3;

    // Rotate neural rings
    this.neuralRings.forEach((ring, idx) => {
      ring.rotation.z = elapsedTime * (0.45 + idx * 0.25);
    });

    // Eye gaze tracking
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
      this.shockwaveScale += delta * 20;
      this.shockwaveOpacity *= 0.91;
      this.shockwaveRing.scale.set(this.shockwaveScale, this.shockwaveScale, this.shockwaveScale);
      (this.shockwaveRing.material as THREE.MeshBasicMaterial).opacity = this.shockwaveOpacity;
    } else {
      (this.shockwaveRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // Update 8 tentacles with bioluminescent wave dynamics & target attraction
    const dummyMatrix = new THREE.Matrix4();
    let suckerIndex = 0;

    this.tentacles.forEach((tentacle, tentacleIdx) => {
      const { baseAngle, segments, tubeMesh, length, curlDirection } = tentacle;
      const segCount = segments.length;

      // Base anchor on bottom rim of mantle
      const baseRadius = 1.15;
      const rootX = Math.cos(baseAngle) * baseRadius;
      const rootZ = Math.sin(baseAngle) * baseRadius;
      const rootY = -0.85;

      segments[0].set(rootX, rootY, rootZ);

      // Continuous bioluminescent wave travelling down tentacle
      const travellingWave = (elapsedTime * 4.0 - tentacleIdx * 0.4) % (Math.PI * 2);

      for (let s = 1; s < segCount; s++) {
        const t = s / (segCount - 1);
        const currentDist = t * length;

        // Wave dynamics
        const waveProgress = this.swimPhase - t * 4.8;
        const undulation = Math.sin(waveProgress) * (0.45 + t * 2.0);
        const flare = Math.cos(waveProgress * 0.7) * (0.35 + t * 1.3);

        const streamline = (1.0 - contract * 0.45) * (1.0 - this.propulsionBoost * 0.5);

        let x = Math.cos(baseAngle) * (baseRadius + currentDist * 0.35 * streamline) +
                Math.sin(baseAngle) * undulation * curlDirection;
        let z = Math.sin(baseAngle) * (baseRadius + currentDist * 0.35 * streamline) -
                Math.cos(baseAngle) * undulation * curlDirection;
        let y = rootY - currentDist * (0.82 + contract * 0.22) + flare;

        // Interactive Target Reaching (IK attraction towards nearest energy orb)
        if (this.nearestTarget && t > 0.5) {
          const reachWeight = Math.pow((t - 0.5) * 2, 2) * 0.35;
          x += (this.nearestTarget.x - x) * reachWeight;
          y += (this.nearestTarget.y - y) * reachWeight;
          z += (this.nearestTarget.z - z) * reachWeight;
        }

        segments[s].set(x, y, z);

        // Suction cup matrix transform with travelling neural pulse
        const pulseHighlight = Math.abs(Math.sin(travellingWave - t * 5));
        const suckerScale = (1.0 - t * 0.65) * (0.8 + pulseHighlight * 0.4);
        dummyMatrix.makeScale(suckerScale, suckerScale, suckerScale);
        dummyMatrix.setPosition(x, y, z);
        this.suckersInstanced.setMatrixAt(suckerIndex++, dummyMatrix);
      }

      // Record tip position
      tentacle.tipPosition.copy(segments[segCount - 1]);
      tubeMesh.geometry.setFromPoints(segments);
    });

    this.suckersInstanced.instanceMatrix.needsUpdate = true;

    // Hydrodynamic celestial drift
    this.group.position.y = Math.sin(elapsedTime * 1.3) * 0.45;
    this.group.rotation.y = Math.sin(elapsedTime * 0.6) * 0.18;
  }
}
