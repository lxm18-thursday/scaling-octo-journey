import * as THREE from 'three';

export interface QuantumOrb {
  mesh: THREE.Group;
  outerMesh: THREE.Mesh;
  coreMesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  baseRadius: number;
  phase: number;
  isHarvested: boolean;
  harvestProgress: number;
}

export class DimensionalQuantaSystem {
  public group: THREE.Group;
  private orbs: QuantumOrb[] = [];
  private orbCount = 12;
  
  // Sparkling harvest burst particles
  private burstParticles!: THREE.Points;
  private burstCount = 300;
  private burstVelocities: THREE.Vector3[] = [];
  private burstLifetimes: number[] = [];

  // Callbacks
  private onHarvestCallback?: (totalHarvested: number) => void;
  public totalHarvested = 0;

  constructor(scene: THREE.Scene, onHarvest?: (totalHarvested: number) => void) {
    this.group = new THREE.Group();
    this.onHarvestCallback = onHarvest;
    scene.add(this.group);

    this.initOrbs();
    this.initBurstParticles();
  }

  private initOrbs() {
    for (let i = 0; i < this.orbCount; i++) {
      this.spawnOrb();
    }
  }

  private spawnOrb(customPos?: THREE.Vector3): QuantumOrb {
    const orbGroup = new THREE.Group();

    // Outer crystalline faceted cage
    const outerGeo = new THREE.OctahedronGeometry(0.55, 0);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    orbGroup.add(outerMesh);

    // Inner glowing singularity core
    const coreGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff0077,
      transparent: true,
      opacity: 0.95
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    orbGroup.add(coreMesh);

    // Initial position in a sphere around the octo
    const radius = 8 + Math.random() * 14;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI;

    const pos = customPos || new THREE.Vector3(
      radius * Math.cos(theta) * Math.cos(phi),
      radius * Math.sin(phi),
      radius * Math.sin(theta) * Math.cos(phi)
    );

    orbGroup.position.copy(pos);
    this.group.add(orbGroup);

    const orb: QuantumOrb = {
      mesh: orbGroup,
      outerMesh,
      coreMesh,
      position: pos,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      ),
      baseRadius: radius,
      phase: Math.random() * Math.PI * 2,
      isHarvested: false,
      harvestProgress: 0
    };

    this.orbs.push(orb);
    return orb;
  }

  private initBurstParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.burstCount * 3);
    const colors = new Float32Array(this.burstCount * 3);

    for (let i = 0; i < this.burstCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -9999; // Hide offscreen
      positions[i * 3 + 2] = 0;

      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 0.8;

      this.burstVelocities.push(new THREE.Vector3(0, 0, 0));
      this.burstLifetimes.push(0);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.burstParticles = new THREE.Points(geo, mat);
    this.group.add(this.burstParticles);
  }

  public triggerBurst(origin: THREE.Vector3, colorHex: number) {
    const burstSize = 25;
    const positions = this.burstParticles.geometry.attributes.position.array as Float32Array;
    const colors = this.burstParticles.geometry.attributes.color.array as Float32Array;
    const c = new THREE.Color(colorHex);

    let spawned = 0;
    for (let i = 0; i < this.burstCount && spawned < burstSize; i++) {
      if (this.burstLifetimes[i] <= 0) {
        positions[i * 3] = origin.x;
        positions[i * 3 + 1] = origin.y;
        positions[i * 3 + 2] = origin.z;

        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        // Random spherical explosion velocity
        const speed = 4 + Math.random() * 8;
        const dir = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize().multiplyScalar(speed);

        this.burstVelocities[i].copy(dir);
        this.burstLifetimes[i] = 1.0; // 1 second lifetime
        spawned++;
      }
    }

    this.burstParticles.geometry.attributes.position.needsUpdate = true;
    this.burstParticles.geometry.attributes.color.needsUpdate = true;
  }

  public getNearestOrbPosition(target: THREE.Vector3): THREE.Vector3 | null {
    let nearestDist = Infinity;
    let nearestPos: THREE.Vector3 | null = null;

    for (const orb of this.orbs) {
      if (orb.isHarvested) continue;
      const dist = orb.mesh.position.distanceTo(target);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPos = orb.mesh.position;
      }
    }

    return nearestPos;
  }

  public checkHarvestInteractions(tentacleTips: THREE.Vector3[], harvestRadius = 2.2): number {
    let harvestedCount = 0;

    for (const orb of this.orbs) {
      if (orb.isHarvested) continue;

      for (const tip of tentacleTips) {
        if (orb.mesh.position.distanceTo(tip) < harvestRadius) {
          orb.isHarvested = true;
          this.totalHarvested++;
          harvestedCount++;
          this.triggerBurst(orb.mesh.position, 0x00ffcc);

          if (this.onHarvestCallback) {
            this.onHarvestCallback(this.totalHarvested);
          }
          break;
        }
      }
    }

    return harvestedCount;
  }

  public update(delta: number, elapsedTime: number) {
    // 1. Update Orbs
    for (const orb of this.orbs) {
      if (orb.isHarvested) {
        // Implode when harvested then respawn
        orb.harvestProgress += delta * 3.5;
        const scale = Math.max(0, 1.0 - orb.harvestProgress);
        orb.mesh.scale.set(scale, scale, scale);

        if (orb.harvestProgress >= 1.0) {
          // Respawn orb in new position
          const radius = 10 + Math.random() * 12;
          const theta = Math.random() * Math.PI * 2;
          const phi = (Math.random() - 0.5) * Math.PI;

          orb.mesh.position.set(
            radius * Math.cos(theta) * Math.cos(phi),
            radius * Math.sin(phi),
            radius * Math.sin(theta) * Math.cos(phi)
          );
          orb.mesh.scale.set(1, 1, 1);
          orb.isHarvested = false;
          orb.harvestProgress = 0;
        }
      } else {
        // Floating gentle orbital drift
        orb.phase += delta * 0.8;
        orb.mesh.position.x += Math.sin(orb.phase + orb.baseRadius) * 0.02;
        orb.mesh.position.y += Math.cos(orb.phase * 0.7) * 0.015;
        orb.mesh.position.z += Math.sin(orb.phase * 0.5) * 0.02;

        orb.outerMesh.rotation.x += delta * 1.2;
        orb.outerMesh.rotation.y += delta * 1.8;

        const pulse = 1.0 + Math.sin(elapsedTime * 4 + orb.phase) * 0.2;
        orb.coreMesh.scale.set(pulse, pulse, pulse);
      }
    }

    // 2. Update Burst Particles
    const positions = this.burstParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.burstCount; i++) {
      if (this.burstLifetimes[i] > 0) {
        this.burstLifetimes[i] -= delta * 1.5;

        positions[i * 3] += this.burstVelocities[i].x * delta;
        positions[i * 3 + 1] += this.burstVelocities[i].y * delta;
        positions[i * 3 + 2] += this.burstVelocities[i].z * delta;

        // Velocity drag
        this.burstVelocities[i].multiplyScalar(0.95);

        if (this.burstLifetimes[i] <= 0) {
          positions[i * 3 + 1] = -9999;
        }
      }
    }
    this.burstParticles.geometry.attributes.position.needsUpdate = true;
  }
}
