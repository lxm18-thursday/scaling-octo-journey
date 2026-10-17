import * as THREE from 'three';

export interface CameraShot {
  name: string;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startLookAt: THREE.Vector3;
  endLookAt: THREE.Vector3;
}

export class CinematicDirector {
  private isCinematic: boolean = false;
  private camera: THREE.PerspectiveCamera;
  
  // Shots definition
  private shots: CameraShot[] = [
    {
      name: 'MANTLE & EYE MACRO',
      duration: 7.0,
      startPos: new THREE.Vector3(2.5, 0.8, 4.2),
      endPos: new THREE.Vector3(-2.8, -0.4, 3.8),
      startLookAt: new THREE.Vector3(0, 0.5, 0),
      endLookAt: new THREE.Vector3(0, -0.2, 0)
    },
    {
      name: 'TENTACLE UNDERBELLY TRACK',
      duration: 8.0,
      startPos: new THREE.Vector3(0, -12, 6),
      endPos: new THREE.Vector3(5, -9, 8),
      startLookAt: new THREE.Vector3(0, -1, 0),
      endLookAt: new THREE.Vector3(0, 1, 0)
    },
    {
      name: 'CELESTIAL VORTEX VISTA',
      duration: 9.0,
      startPos: new THREE.Vector3(14, 12, 18),
      endPos: new THREE.Vector3(-16, 8, 16),
      startLookAt: new THREE.Vector3(0, 0, 0),
      endLookAt: new THREE.Vector3(0, 0, 0)
    },
    {
      name: 'WARP SINGULARITY DIVE',
      duration: 6.0,
      startPos: new THREE.Vector3(0, 0, 24),
      endPos: new THREE.Vector3(0, 0, 6),
      startLookAt: new THREE.Vector3(0, 0, 0),
      endLookAt: new THREE.Vector3(0, 0, 0)
    }
  ];

  private currentShotIdx = 0;
  private shotTime = 0;
  private shakeIntensity = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public toggle(): boolean {
    this.isCinematic = !this.isCinematic;
    if (this.isCinematic) {
      this.currentShotIdx = 0;
      this.shotTime = 0;
    }
    return this.isCinematic;
  }

  public getIsCinematic(): boolean {
    return this.isCinematic;
  }

  public triggerCameraShake(intensity = 1.0) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public update(delta: number): { currentShotName: string } | null {
    if (!this.isCinematic) {
      // Decay shake in manual mode as well
      if (this.shakeIntensity > 0) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * 0.4;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.4;
        this.shakeIntensity *= 0.9;
        if (this.shakeIntensity < 0.01) this.shakeIntensity = 0;
      }
      return null;
    }

    const currentShot = this.shots[this.currentShotIdx];
    this.shotTime += delta;

    const progress = Math.min(1.0, this.shotTime / currentShot.duration);
    // Smooth cosine ease in-out
    const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);

    // Interpolate position
    this.camera.position.lerpVectors(currentShot.startPos, currentShot.endPos, ease);

    // Interpolate lookAt
    const currentLookAt = new THREE.Vector3().lerpVectors(currentShot.startLookAt, currentShot.endLookAt, ease);
    this.camera.lookAt(currentLookAt);

    // Camera shake
    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.5;
      this.shakeIntensity *= 0.92;
      if (this.shakeIntensity < 0.01) this.shakeIntensity = 0;
    }

    // Advance to next shot
    if (this.shotTime >= currentShot.duration) {
      this.shotTime = 0;
      this.currentShotIdx = (this.currentShotIdx + 1) % this.shots.length;
    }

    return { currentShotName: currentShot.name };
  }
}
