import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import * as THREE from 'three';

type GlobeStatus = 'idle' | 'locating' | 'rotating' | 'located' | 'unavailable';

const EARTH_TEXTURE_URL = 'assets/globe/earth-texture.jpg';
const EARTH_NORMAL_MAP_URL = 'assets/globe/earth_normal_2048.jpg';
const EARTH_SPECULAR_MAP_URL = 'assets/globe/earth_specular_2048.jpg';

// Idle rotation, expressed in radians/second so it stays smooth regardless
// of the display's refresh rate (frame-rate independent).
const IDLE_ROTATION_RADIANS_PER_SECOND = 0.05;
// "Casual" eased rotation toward a resolved location, expressed in seconds.
const LOCATE_ROTATION_DURATION_MS = 2200;

const SPHERE_RADIUS = 1.6;
const FOV_DEGREES = 42;
// >1 keeps the sphere's silhouette slightly larger than the frustum so it
// comfortably fills (and very slightly overflows) the full viewport height
// with no gap at the top/bottom edges, instead of leaving a sliver of
// background showing or, worse, sitting so close that only a distorted,
// fisheye-like crop of the surface is visible (the earlier scaling bug).
const HEIGHT_FILL_FACTOR = 1.06;
const CAMERA_DISTANCE = computeCameraDistanceForFullHeightSphere(
  SPHERE_RADIUS,
  FOV_DEGREES,
  HEIGHT_FILL_FACTOR,
);
// Large enough (relative to the sphere) to be clearly visible once the
// globe stops rotating, rather than a barely-visible speck.
const MARKER_RADIUS = SPHERE_RADIUS * 0.045;
const MARKER_RING_RADIUS = MARKER_RADIUS * 2.2;

/** Distance at which a sphere of `radius` exactly fills the vertical field of view of a camera with the given `fovDegrees`; dividing by `fillFactor` (>1) pulls the camera slightly closer so the sphere slightly overfills instead of just touching the frame edges. */
function computeCameraDistanceForFullHeightSphere(
  radius: number,
  fovDegrees: number,
  fillFactor: number,
): number {
  const halfFovRadians = (fovDegrees / 2) * (Math.PI / 180);
  const exactFitDistance = radius / Math.sin(halfFovRadians);
  return exactFitDistance / fillFactor;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

/** Smooth ease-in-out-cubic, used to make the "casual" rotation toward a resolved location feel natural rather than linear/mechanical. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * A real, textured 3D Earth rendered with three.js/WebGL, sized so its
 * silhouette matches the full height of the page. Rotates slowly and
 * smoothly by default; if the browser grants geolocation access, it fades
 * out, snaps to face the user's real-world location (dropping a marker
 * there), and fades back in. Purely decorative — never calls the guestbook
 * API.
 */
@Component({
  selector: 'gkb-globe',
  template: `
    <div class="globe" #wrapper aria-hidden="true">
      <canvas #canvas class="globe__canvas"></canvas>
    </div>
    @if (status() === 'located') {
      <p class="globe-caption">Rotated to your location</p>
    }
  `,
  styleUrl: './globe.scss',
})
export class Globe {
  private readonly wrapperRef = viewChild.required<ElementRef<HTMLDivElement>>('wrapper');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  protected readonly status = signal<GlobeStatus>('idle');

  private readonly prefersReducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private globeGroup?: THREE.Group;
  private locationMarker?: THREE.Group;
  private resizeObserver?: ResizeObserver;
  private animationFrameId?: number;
  private lastFrameTimeMs?: number;
  private rotationAnimation?: {
    fromQuaternion: THREE.Quaternion;
    toQuaternion: THREE.Quaternion;
    startMs: number;
    durationMs: number;
  };

  constructor() {
    afterNextRender(() => {
      this.initScene();
      this.requestUserLocation();
    });

    this.destroyRef.onDestroy(() => this.dispose());
  }

  private initScene(): void {
    const wrapper = this.wrapperRef().nativeElement;
    const canvas = this.canvasRef().nativeElement;

    // WebGL is unavailable in some environments (e.g. the jsdom-based unit
    // test runner, or browsers/devices without GPU support) — degrade
    // gracefully instead of throwing.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      this.status.set('unavailable');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV_DEGREES, 1, 0.1, 100);
    camera.position.z = CAMERA_DISTANCE;

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const textureLoader = new THREE.TextureLoader();
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      map: textureLoader.load(EARTH_TEXTURE_URL),
      normalMap: textureLoader.load(EARTH_NORMAL_MAP_URL),
      normalScale: new THREE.Vector2(0.6, 0.6),
      specularMap: textureLoader.load(EARTH_SPECULAR_MAP_URL),
      specular: new THREE.Color(0x333333),
      shininess: 8,
    });
    const earth = new THREE.Mesh(geometry, material);
    globeGroup.add(earth);

    const marker = new THREE.Group();
    const markerDot = new THREE.Mesh(
      new THREE.SphereGeometry(MARKER_RADIUS, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff8a3d }),
    );
    const markerRing = new THREE.Mesh(
      new THREE.RingGeometry(MARKER_RADIUS * 1.4, MARKER_RING_RADIUS, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff8a3d,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      }),
    );
    marker.add(markerDot, markerRing);
    marker.visible = false;
    globeGroup.add(marker);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 2, 5);
    scene.add(sun);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.globeGroup = globeGroup;
    this.locationMarker = marker;

    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(wrapper);
    }

    this.renderLoop();
  }

  private resize(): void {
    const wrapper = this.wrapperRef().nativeElement;
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;
    if (!width || !height || !this.renderer || !this.camera) {
      return;
    }
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private readonly renderLoop = (timestampMs?: number): void => {
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
    const group = this.globeGroup;
    if (!group || !this.renderer || !this.scene || !this.camera) {
      return;
    }

    const now = timestampMs ?? performance.now();
    const deltaSeconds = this.lastFrameTimeMs === undefined ? 0 : (now - this.lastFrameTimeMs) / 1000;
    this.lastFrameTimeMs = now;

    const shouldIdleRotate =
      !this.prefersReducedMotion &&
      (this.status() === 'idle' || this.status() === 'locating' || this.status() === 'unavailable');
    if (shouldIdleRotate) {
      group.rotation.y += IDLE_ROTATION_RADIANS_PER_SECOND * deltaSeconds;
    } else if (this.rotationAnimation) {
      const { fromQuaternion, toQuaternion, startMs, durationMs } = this.rotationAnimation;
      const elapsed = now - startMs;
      const t = Math.min(elapsed / durationMs, 1);
      group.quaternion.slerpQuaternions(fromQuaternion, toQuaternion, easeInOutCubic(t));
      if (t >= 1) {
        this.rotationAnimation = undefined;
        this.status.set('located');
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  /** Test-only helper: forces the globe to the given coordinates via the same eased-rotation flow as a real geolocation resolve. */
  setLocationForTesting(latitude: number, longitude: number): void {
    this.onLocationResolved(latitude, longitude);
  }

  private requestUserLocation(): void {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.status.set('unavailable');
      return;
    }
    this.status.set('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => this.onLocationResolved(position.coords.latitude, position.coords.longitude),
      () => this.status.set('unavailable'),
      { timeout: 8000, maximumAge: 300_000 },
    );
  }

  private onLocationResolved(latitude: number, longitude: number): void {
    const point = this.latLonToVector3(latitude, longitude, SPHERE_RADIUS);
    const targetQuaternion = this.computeFacingQuaternion(point);
    const markerPosition = point.clone().multiplyScalar(1.01);

    // Drop the marker in place immediately (it rotates along with the
    // globe group, so it stays correctly anchored to the surface).
    this.applyLocation(markerPosition);

    const fromQuaternion = this.globeGroup?.quaternion.clone() ?? new THREE.Quaternion();

    if (this.prefersReducedMotion || !this.renderer) {
      this.globeGroup?.quaternion.copy(targetQuaternion);
      this.status.set('located');
      return;
    }

    this.status.set('rotating');
    this.rotationAnimation = {
      fromQuaternion,
      toQuaternion: targetQuaternion,
      startMs: performance.now(),
      durationMs: LOCATE_ROTATION_DURATION_MS,
    };
  }

  /** Computes the globe-group orientation (yaw around Y, then pitch around X) that rotates `point` to face the camera at +Z, tilting the globe vertically as well as spinning it horizontally. */
  private computeFacingQuaternion(point: THREE.Vector3): THREE.Quaternion {
    const yaw = Math.atan2(-point.x, point.z);
    const ringRadius = Math.sqrt(Math.max(SPHERE_RADIUS * SPHERE_RADIUS - point.y * point.y, 0));
    const pitch = Math.atan2(point.y, ringRadius);

    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(X_AXIS, pitch);
    // Apply yaw first, then pitch, so the point ends up centered on the
    // camera both horizontally and vertically.
    return pitchQuaternion.multiply(yawQuaternion);
  }

  private applyLocation(markerPosition: THREE.Vector3): void {
    if (this.locationMarker) {
      this.locationMarker.position.copy(markerPosition);
      // Orient the ring so it lies flush against the sphere's surface,
      // facing outward along the radial direction through its position.
      this.locationMarker.lookAt(0, 0, 0);
      this.locationMarker.visible = true;
    }
  }

  /** Converts latitude/longitude to a point on the sphere matching the default UV mapping of `THREE.SphereGeometry`. */
  private latLonToVector3(latitude: number, longitude: number, radius: number): THREE.Vector3 {
    const phi = (90 - latitude) * (Math.PI / 180);
    const theta = (longitude + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    );
  }

  private dispose(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.scene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material.dispose();
        }
      }
    });
  }
}
