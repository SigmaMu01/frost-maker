import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';

import * as THREE from 'three';
import { ThreeContext } from '../../../shared/services/three-context';

@Component({
  selector: 'app-view-cube',
  imports: [],
  template: '',
  styleUrl: './view-cube.scss',
})
export class ViewCube implements OnInit, OnDestroy {
  private three = inject(ThreeContext);

  private miniScene = new THREE.Scene();
  private miniCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  private cube!: THREE.Mesh;

  private cubeSize = 2;
  private distance = this.cubeSize * 2.8;

  private size = 140;

  ngOnInit() {
    this.miniCamera.position.set(0, 0, this.distance);

    const materials = [
      this.faceMaterial('+X', '#ff4444'), // red
      this.faceMaterial('-X', '#cc2222'),
      this.faceMaterial('+Z', '#4444ff'), // blue
      this.faceMaterial('-Z', '#2222cc'),
      this.faceMaterial('-Y', '#22cc22'),
      this.faceMaterial('+Y', '#44ff44'), // green
    ];

    this.cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), materials);

    this.miniScene.add(this.cube);

    // Optional: add small edges for better readability
    const edges = new THREE.EdgesGeometry(this.cube.geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    this.cube.add(line);

    // Register as **post-render** overlay
    this.three.registerPostRenderer(this.renderFn);
    this.three.registerUpdater(() => {
      this.three.controls.update();
    });
  }

  private faceMaterial(label: string, bgColor: string) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 140px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return new THREE.MeshBasicMaterial({ map: texture });
  }

  private render() {
    if (!this.three.renderer || !this.three.camera || !this.cube) return;

    // Sync rotation – invert so cube shows **world** orientation
    this.cube.quaternion.copy(this.three.camera.quaternion).invert();

    const renderer = this.three.renderer;
    const canvas = renderer.domElement;

    const x = 8; // padding from left
    const y = canvas.clientHeight - this.size - x; // padding from top

    // Preserve main depth buffer, only clear depth for this mini render
    renderer.clearDepth();

    renderer.setScissorTest(true);
    renderer.setScissor(x, y, this.size, this.size);
    renderer.setViewport(x, y, this.size, this.size);

    renderer.render(this.miniScene, this.miniCamera);

    // Reset to full canvas
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  private renderFn = () => this.render();

  ngOnDestroy() {
    this.three.unregisterPostRenderer(this.renderFn);
  }
}
