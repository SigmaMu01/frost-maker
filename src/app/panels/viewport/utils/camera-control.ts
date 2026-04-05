import { inject, Injectable, signal } from '@angular/core';

import * as THREE from 'three';
import { ThreeContext } from '../../../shared/services/three-context';
import { MapWorker } from '../../../shared/services/map-worker';

@Injectable({
  providedIn: 'root',
})
export class CameraControl {
  private readonly three = inject(ThreeContext);
  private readonly mapWorker = inject(MapWorker);

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private pointerDownPos = new THREE.Vector2();
  private pointerUpPos = new THREE.Vector2();
  private dragThreshold = 4; // Pixel threshold for move/select

  readonly fov = signal<number>(60);

  private isDragging = false; // Differentiate between camera control and mouse click on interactive elements

  centerCamera(center: THREE.Vector3, size: THREE.Vector3) {
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 0.75; // The distance from the camera and the building at the scene init

    const camera = this.three.camera;

    camera.position.set(center.x + distance, center.y + distance, center.z + distance);

    camera.lookAt(center);

    if (this.three.controls) {
      this.three.controls.target.copy(center);
      this.three.controls.update();
    }
  }

  raycast() {
    this.raycaster.setFromCamera(this.mouse, this.three.camera);

    const intersects = this.raycaster.intersectObjects(this.three.scene.children, true);

    // Handle VOID click
    if (!intersects.length) {
      this.mapWorker.clearSelection();
      return;
    }

    // Find first relevant hit
    const hit = intersects.find((i) => i.object.userData?.['type'] === 'tempChain');

    if (hit) {
      this.mapWorker.setSelectedObjectId(hit.object.userData['id']);
    } else {
      this.mapWorker.clearSelection();
    }
  }

  onPointerDown = (event: PointerEvent) => {
    this.isDragging = false;

    this.pointerDownPos.set(event.clientX, event.clientY);
  };

  onPointerMove = (event: PointerEvent) => {
    this.pointerUpPos.set(event.clientX, event.clientY);

    const dx = this.pointerUpPos.x - this.pointerDownPos.x;
    const dy = this.pointerUpPos.y - this.pointerDownPos.y;

    const distanceSq = dx * dx + dy * dy;

    if (distanceSq > this.dragThreshold * this.dragThreshold) {
      this.isDragging = true;
    }
  };

  onPointerUp = (event: PointerEvent) => {
    const canvas = this.three.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging) return;

    this.raycast();
  };
}
