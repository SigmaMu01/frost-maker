import { inject, Injectable, signal } from '@angular/core';

import * as THREE from 'three';
import { ThreeContext } from '../../../shared/services/three-context';

@Injectable({
  providedIn: 'root',
})
export class CameraControl {
  private readonly three = inject(ThreeContext);

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

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
    // Mouse click control
    this.raycaster.setFromCamera(this.mouse, this.three.camera);

    const intersects = this.raycaster.intersectObjects(this.three.scene.children, true);

    if (!intersects.length) return;

    const hit = intersects[0].object;

    if (hit.userData?.['type'] === 'tempChain') {
      console.log('Selected temp chain:', hit.userData['id']);

      // Example highlight
      // const mat = hit.material as THREE.MeshBasicMaterial;
      // mat.color.set(0xff0000);
    }
  }

  onPointerDown = () => {
    this.isDragging = false;
  };

  onPointerMove = () => {
    this.isDragging = true;
  };

  onPointerUp = (event: PointerEvent) => {
    if (this.isDragging) return; // User was rotating camera

    const canvas = this.three.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycast();
  };
}
