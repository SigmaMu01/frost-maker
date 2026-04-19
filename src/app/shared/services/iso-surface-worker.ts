import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { PX_PER_M, TEMP_CHAIN_HEIGHT_M } from './building-manager';

@Injectable({ providedIn: 'root' })
export class IsoSurfaceWorker {
  readonly isIsoPointsActive = signal(true);
  readonly isIsoMeshesActive = signal(true);

  private marching?: MarchingCubes;

  private material = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    transparent: false,
    opacity: 1,
    side: THREE.DoubleSide,
    // depthWrite: false,
    // roughness: 0.4,
    // metalness: 0.1,
  });

  buildZeroCrossingPoints(
    data: Float32Array,
    nx: number,
    ny: number,
    nz: number,
    idx: (x: number, y: number, z: number) => number,
    iso = 0
  ): Float32Array {
    const points: number[] = [];

    const sample = (x: number, y: number, z: number) => data[idx(x, y, z)] - iso;

    // 1. Interior edge crossings
    for (let z = 0; z < nz - 1; z++) {
      for (let y = 0; y < ny - 1; y++) {
        for (let x = 0; x < nx - 1; x++) {
          const v000 = sample(x, y, z);

          // --- X EDGE ---
          const v100 = sample(x + 1, y, z);
          if (v000 * v100 < 0) {
            const t = v000 / (v000 - v100);
            points.push(x + t, y, z);
          }

          // --- Y EDGE ---
          const v010 = sample(x, y + 1, z);
          if (v000 * v010 < 0) {
            const t = v000 / (v000 - v010);
            points.push(x, y + t, z);
          }

          // --- Z EDGE ---
          const v001 = sample(x, y, z + 1);
          if (v000 * v001 < 0) {
            const t = v000 / (v000 - v001);
            points.push(x, y, z + t);
          }
        }
      }
    }

    // 2. Boundary faces
    const epsilon = 0.01;

    // A. Max-X face (x = nx-1), check Y and Z directions
    for (let z = 0; z < nz - 1; z++) {
      for (let y = 0; y < ny - 1; y++) {
        const x = nx - 1;
        const v = sample(x, y, z);

        // Along Y on this face
        const vy = sample(x, y + 1, z);
        if (v * vy < 0) {
          const t = v / (v - vy);
          points.push(x, y + t, z);
        }

        // Along Z on this face
        const vz = sample(x, y, z + 1);
        if (v * vz < 0) {
          const t = v / (v - vz);
          points.push(x, y, z + t);
        }

        // Exact zero at this point
        if (Math.abs(v) <= epsilon) {
          points.push(x, y, z);
        }
      }
    }

    // B. Max-Y face (y = ny-1), check X and Z
    for (let z = 0; z < nz - 1; z++) {
      for (let x = 0; x < nx - 1; x++) {
        const y = ny - 1;
        const v = sample(x, y, z);

        // Along X
        const vx = sample(x + 1, y, z);
        if (v * vx < 0) {
          const t = v / (v - vx);
          points.push(x + t, y, z);
        }

        // Along Z
        const vz = sample(x, y, z + 1);
        if (v * vz < 0) {
          const t = v / (v - vz);
          points.push(x, y, z + t);
        }

        if (Math.abs(v) <= epsilon) points.push(x, y, z);
      }
    }

    // C. Max-Z face (z = nz-1), check X and Y  ← this is the one you mentioned
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        const z = nz - 1;
        const v = sample(x, y, z);

        // Along X
        const vx = sample(x + 1, y, z);
        if (v * vx < 0) {
          const t = v / (v - vx);
          points.push(x + t, y, z);
        }

        // Along Y
        const vy = sample(x, y + 1, z);
        if (v * vy < 0) {
          const t = v / (v - vy);
          points.push(x, y + t, z);
        }

        if (Math.abs(v) <= epsilon) points.push(x, y, z);
      }
    }

    return new Float32Array(points);
  }

  createPointCloud(positions: Float32Array): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.05,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
  }

  buildIsoPoints(
    data: Float32Array,
    nx: number,
    ny: number,
    nz: number,
    idx: (x: number, y: number, z: number) => number,
    isoTemp: number,
    epsilon = 0.2 // tolerance band
  ): THREE.Points {
    const positions: number[] = [];

    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const value = data[idx(x, y, z)];

          const v = value;
          const vx = data[idx(Math.min(x + 1, nx - 1), y, z)];
          const vy = data[idx(x, Math.min(y + 1, ny - 1), z)];
          const vz = data[idx(x, y, Math.min(z + 1, nz - 1))];

          const crosses =
            (v - isoTemp) * (vx - isoTemp) < 0 ||
            (v - isoTemp) * (vy - isoTemp) < 0 ||
            (v - isoTemp) * (vz - isoTemp) < 0;

          if (crosses) {
            // if (Math.abs(value - isoTemp) < epsilon) {
            positions.push(x, z, y); // NOTE axis swap (see below)
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      color: 0x00ffff,
      transparent: false,
      opacity: 1,
      // depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  applyPointCloudTransform(
    points: THREE.Points,
    bounds: { x: number; y: number },
    height: number,
    nx: number,
    ny: number,
    nz: number
  ) {
    points.scale.set(bounds.x / PX_PER_M / (nx - 1), height / (1 - nz), bounds.y / PX_PER_M / (ny - 1));

    // flip vertical axis
    points.scale.y *= -1;

    points.position.set(0, -TEMP_CHAIN_HEIGHT_M, 0);
  }

  // updateIsosurface(
  //   data: Float32Array,
  //   nx: number,
  //   ny: number,
  //   nz: number,
  //   idx: (x: number, y: number, z: number) => number,
  //   minTemp: number,
  //   maxTemp: number,
  //   isoTemp = 0
  // ): THREE.Mesh {
  //   // const resolution = Math.max(nx, ny, nz);
  //   const resolution = 120;

  //   if (!this.marching) {
  //     this.marching = new MarchingCubes(resolution, this.material, true, true, 100000);
  //     this.marching.enableUvs = false;
  //     this.marching.enableColors = false;
  //   }

  //   const mc = this.marching;

  //   mc.reset();

  //   const range = maxTemp - minTemp || 1;
  //   const isoLevel = (isoTemp - minTemp) / range;

  //   const size = resolution;
  //   const field = mc.field;

  //   for (let z = 0; z < size; z++) {
  //     for (let y = 0; y < size; y++) {
  //       for (let x = 0; x < size; x++) {
  //         const fx = (x / (size - 1)) * (nx - 1);
  //         const fy = (y / (size - 1)) * (ny - 1);
  //         const fz = (z / (size - 1)) * (nz - 1);

  //         const value = this.sampleField(data, nx, ny, nz, idx, fx, fy, fz);

  //         const density = (value - minTemp) / range;

  //         field[x + y * size + z * size * size] = density;
  //       }
  //     }
  //   }

  //   mc.isolation = isoLevel;
  //   mc.update();

  //   return mc;
  // }

  applyWorldTransformToPoints(
    points: THREE.Points,
    bounds: { x: number; y: number },
    height: number,
    nx: number,
    ny: number,
    nz: number
  ) {
    // Convert grid → world scale
    const scaleX = bounds.x / PX_PER_M / (nx - 1);
    const scaleY = bounds.y / PX_PER_M / (ny - 1);
    const scaleZ = -height / (nz - 1);

    points.scale.set(scaleX, scaleY, scaleZ);

    // Align with your scene convention:
    // - building is centered in XZ
    // - Y goes downward (negative)
    points.position.set(
      0, // we’ll center via geometry instead
      -height, // shift down so top = 0
      0
    );

    // Rotate like your building (critical)
    points.rotation.x = Math.PI / 2;
  }

  // applyWorldTransform(
  //   mesh: THREE.Mesh,
  //   bounds: { x: number; y: number },
  //   height: number,
  //   nx: number,
  //   ny: number,
  //   nz: number
  // ) {
  //   mesh.scale.set(bounds.x / PX_PER_M / 2, bounds.y / PX_PER_M / 2, (-1 * height) / 2);
  //   mesh.rotation.x = Math.PI / 2;
  //   mesh.position.set(bounds.x / 2 / PX_PER_M, (-1 * height) / 2, bounds.y / 2 / PX_PER_M);
  // }

  // private sampleField(
  //   data: Float32Array,
  //   nx: number,
  //   ny: number,
  //   nz: number,
  //   idx: (x: number, y: number, z: number) => number,
  //   fx: number,
  //   fy: number,
  //   fz: number
  // ) {
  //   const x0 = Math.floor(fx),
  //     x1 = Math.min(x0 + 1, nx - 1);
  //   const y0 = Math.floor(fy),
  //     y1 = Math.min(y0 + 1, ny - 1);
  //   const z0 = Math.floor(fz),
  //     z1 = Math.min(z0 + 1, nz - 1);

  //   const tx = fx - x0;
  //   const ty = fy - y0;
  //   const tz = fz - z0;

  //   const c000 = data[idx(x0, y0, z0)];
  //   const c100 = data[idx(x1, y0, z0)];
  //   const c010 = data[idx(x0, y1, z0)];
  //   const c110 = data[idx(x1, y1, z0)];

  //   const c001 = data[idx(x0, y0, z1)];
  //   const c101 = data[idx(x1, y0, z1)];
  //   const c011 = data[idx(x0, y1, z1)];
  //   const c111 = data[idx(x1, y1, z1)];

  //   const c00 = c000 * (1 - tx) + c100 * tx;
  //   const c10 = c010 * (1 - tx) + c110 * tx;
  //   const c01 = c001 * (1 - tx) + c101 * tx;
  //   const c11 = c011 * (1 - tx) + c111 * tx;

  //   const c0 = c00 * (1 - ty) + c10 * ty;
  //   const c1 = c01 * (1 - ty) + c11 * ty;

  //   return c0 * (1 - tz) + c1 * tz;
  // }

  // createDebugBox(bounds: { x: number; y: number }, height: number) {
  //   const geometry = new THREE.BoxGeometry(bounds.x / PX_PER_M, height, bounds.y / PX_PER_M);

  //   const material = new THREE.MeshBasicMaterial({
  //     color: 0x00ff00,
  //     transparent: true,
  //     opacity: 0.15,
  //     wireframe: false,
  //   });

  //   const box = new THREE.Mesh(geometry, material);

  //   // CRITICAL: same convention as building
  //   box.position.set(bounds.x / PX_PER_M / 2, height / -2, bounds.y / PX_PER_M / 2);

  //   box.name = 'debugVolume';

  //   return box;
  // }

  // dispose() {
  //   if (this.marching) {
  //     this.marching.geometry.dispose();
  //     this.material.dispose();
  //     this.marching = undefined;
  //   }
  // }
}
