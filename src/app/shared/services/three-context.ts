import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

@Injectable({
  providedIn: 'root',
})
export class ThreeContext {
  // Core objects – everyone shares these
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;

  // Container reference (set once)
  private container: HTMLElement | null = null;

  // Animation loop control
  private rafId = 0;
  private running = false;

  // Allow components to register per-frame logic (position updates, animations, etc.)
  private updaters = new Set<() => void>();
  private postRenderers = new Set<() => void>();

  constructor() {
    this.scene.background = new THREE.Color(0x111122);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  }

  init(container: HTMLElement) {
    if (this.renderer?.domElement?.isConnected) return; // already initialized

    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.renderer.autoClear = false;
    this.renderer.autoClearColor = false;
    this.renderer.autoClearDepth = false;
    this.renderer.autoClearStencil = false;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;

    // Default camera position
    this.camera.position.set(5, 4, 7);
    this.camera.lookAt(0, 0, 0);

    this.start();
  }

  // Called by components that want something to happen every frame
  registerUpdate(fn: () => void) {
    this.updaters.add(fn);
  }

  unregisterUpdate(fn: () => void) {
    this.updaters.delete(fn);
  }

  private animate = () => {
    if (!this.running) return;

    this.rafId = requestAnimationFrame(this.animate);

    // === Phase 1: prepare frame ===
    // this.renderer.clear(true, true, true); // color + depth + stencil
    this.renderer.clear();

    // Update registered logic (animations, tweens, physics, controls, etc.)
    this.updaters.forEach((fn) => fn());

    // === Phase 2: main scene ===
    // this.controls.update();
    this.renderer.render(this.scene, this.camera);

    // === Phase 3: overlays / HUD / view cube ===
    this.postRenderers.forEach((fn) => fn());
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.animate();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  // Helpful: resize handling (call from component on window resize or container change)
  resize() {
    if (!this.container || !this.renderer) return;

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
  }

  registerUpdater(fn: () => void) {
    this.updaters.add(fn);
  }

  unregisterUpdater(fn: () => void) {
    this.updaters.delete(fn);
  }

  registerPostRenderer(fn: () => void) {
    this.postRenderers.add(fn);
  }

  unregisterPostRenderer(fn: () => void) {
    this.postRenderers.delete(fn);
  }

  // Cleanup (call from main component ngOnDestroy)
  dispose() {
    this.stop();
    this.updaters.clear();
    this.postRenderers.clear();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
      this.renderer = undefined as any;
    }

    this.controls?.dispose();
  }
}
