import * as THREE from 'three';

interface InkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class CephalopodInkSystem {
  public group: THREE.Group;
  private particleCount = 450;
  private particles: InkParticle[] = [];
  private pointMesh: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -9999; // Hidden
      this.positions[i * 3 + 2] = 0;

      this.colors[i * 3] = 0;
      this.colors[i * 3 + 1] = 0;
      this.colors[i * 3 + 2] = 0;

      this.particles.push({
        position: new THREE.Vector3(0, -9999, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(0x00ffcc),
        size: 0.3,
        alpha: 0,
        life: 0,
        maxLife: 2.5
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.pointMesh = new THREE.Points(geo, mat);
    this.group.add(this.pointMesh);
  }

  public discharge(origin: THREE.Vector3, direction: THREE.Vector3, primaryHex: number, secondaryHex: number) {
    const burstCount = 120;
    const c1 = new THREE.Color(primaryHex);
    const c2 = new THREE.Color(secondaryHex);

    let spawned = 0;
    for (let i = 0; i < this.particleCount && spawned < burstCount; i++) {
      const p = this.particles[i];
      if (p.life <= 0) {
        // Spawn around siphon nozzle
        p.position.copy(origin).add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8
        ));

        // Billow outwards with turbulent cone
        const speed = 6 + Math.random() * 10;
        const spread = new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6
        );

        p.velocity.copy(direction).normalize().add(spread).normalize().multiplyScalar(speed);
        p.color.copy(Math.random() > 0.5 ? c1 : c2);
        p.alpha = 1.0;
        p.maxLife = 2.0 + Math.random() * 1.5;
        p.life = p.maxLife;
        spawned++;
      }
    }
  }

  public update(delta: number) {
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      if (p.life > 0) {
        p.life -= delta;
        p.position.addScaledVector(p.velocity, delta);

        // Hydrodynamic / spacetime drag
        p.velocity.multiplyScalar(0.96);

        // Alpha fade out
        p.alpha = Math.max(0, p.life / p.maxLife);

        this.positions[i * 3] = p.position.x;
        this.positions[i * 3 + 1] = p.position.y;
        this.positions[i * 3 + 2] = p.position.z;

        // Fading color
        this.colors[i * 3] = p.color.r * p.alpha;
        this.colors[i * 3 + 1] = p.color.g * p.alpha;
        this.colors[i * 3 + 2] = p.color.b * p.alpha;

        if (p.life <= 0) {
          this.positions[i * 3 + 1] = -9999;
        }
      }
    }

    this.pointMesh.geometry.attributes.position.needsUpdate = true;
    this.pointMesh.geometry.attributes.color.needsUpdate = true;
  }
}
