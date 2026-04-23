import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { PX_PER_M, TEMP_CHAIN_HEIGHT_M } from './building-manager';

@Injectable({ providedIn: 'root' })
export class IsoSurfaceWorker {
  readonly isIsoPointsActive = signal(true);
  readonly isIsoMeshesActive = signal(false);

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

  // buildIsoSurfaceMesh(
  //   data: Float32Array,
  //   nx: number,
  //   ny: number,
  //   nz: number,
  //   idx: (x: number, y: number, z: number) => number,
  //   iso = 0
  // ): THREE.Mesh {
  //   const resolution = Math.max(nx, ny, nz);

  //   // Create marching cubes volume
  //   const mc = new MarchingCubes(resolution, this.material, true, true);

  //   mc.isolation = iso;

  //   // IMPORTANT: we fill scalar field manually
  //   const field = mc.field;
  //   field.fill(0);

  //   // Map your non-cubic grid → cubic MC grid
  //   for (let z = 0; z < resolution; z++) {
  //     for (let y = 0; y < resolution; y++) {
  //       for (let x = 0; x < resolution; x++) {
  //         const gx = Math.floor((x / (resolution - 1)) * (nx - 1));
  //         const gy = Math.floor((y / (resolution - 1)) * (ny - 1));
  //         const gz = Math.floor((z / (resolution - 1)) * (nz - 1));

  //         const value = data[idx(gx, gy, gz)];

  //         const id = x + y * resolution + z * resolution * resolution;

  //         field[id] = value;
  //       }
  //     }
  //   }

  //   mc.enableUvs = false;
  //   mc.enableColors = false;

  //   mc.update();

  //   return mc;
  // }

  // applyWorldTransformToMesh(
  //   mesh: THREE.Object3D,
  //   bounds: { x: number; y: number },
  //   height: number,
  //   nx: number,
  //   ny: number,
  //   nz: number
  // ) {
  //   // const scaleX = bounds.x / PX_PER_M / (nx - 1);
  //   // const scaleY = bounds.y / PX_PER_M / (ny - 1);
  //   // const scaleZ = -height / (nz - 1);
  //   const scaleX = bounds.x / PX_PER_M / 2;
  //   const scaleY = bounds.y / PX_PER_M / 2;
  //   const scaleZ = -height / 2;

  //   mesh.scale.set(scaleX, scaleY, scaleZ);

  //   // mesh.position.set(0, -height, 0);
  //   mesh.position.set(scaleX, -1 + scaleZ, scaleY);

  //   mesh.rotation.x = Math.PI / 2;
  // }

  buildMarchingCubes(
    data: Float32Array,
    nx: number,
    ny: number,
    nz: number,
    idx: (x: number, y: number, z: number) => number,
    minTemp: number,
    maxTemp: number,
    isoTemp = 0,
    resolution = 120
  ): THREE.Mesh {
    if (!this.marching) {
      this.marching = new MarchingCubes(resolution, this.material, true, true, 200000);
      this.marching.enableUvs = false;
      this.marching.enableColors = false;
    }

    const mc = this.marching;
    mc.reset();

    const range = maxTemp - minTemp || 1;
    const isoLevel = (isoTemp - minTemp) / range;
    const size = resolution;
    const field = mc.field;

    for (let mz = 0; mz < size; mz++) {
      for (let my = 0; my < size; my++) {
        for (let mx = 0; mx < size; mx++) {
          const fx = (mx / (size - 1)) * (nx - 1);
          const fy = (my / (size - 1)) * (ny - 1);
          const fz = (mz / (size - 1)) * (nz - 1);

          const value = this.sampleField(data, nx, ny, nz, idx, fx, fy, fz);
          const density = (value - minTemp) / range;

          field[mx + my * size + mz * size * size] = density;
        }
      }
    }

    mc.isolation = isoLevel;
    mc.update();

    return mc;
  }

  private sampleField(
    data: Float32Array,
    nx: number,
    ny: number,
    nz: number,
    idx: (x: number, y: number, z: number) => number,
    fx: number,
    fy: number,
    fz: number
  ): number {
    const x0 = Math.floor(fx),
      x1 = Math.min(x0 + 1, nx - 1);
    const y0 = Math.floor(fy),
      y1 = Math.min(y0 + 1, ny - 1);
    const z0 = Math.floor(fz),
      z1 = Math.min(z0 + 1, nz - 1);

    const tx = fx - x0,
      ty = fy - y0,
      tz = fz - z0;

    const c000 = data[idx(x0, y0, z0)];
    const c100 = data[idx(x1, y0, z0)];
    const c010 = data[idx(x0, y1, z0)];
    const c110 = data[idx(x1, y1, z0)];

    const c001 = data[idx(x0, y0, z1)];
    const c101 = data[idx(x1, y0, z1)];
    const c011 = data[idx(x0, y1, z1)];
    const c111 = data[idx(x1, y1, z1)];

    const c00 = c000 * (1 - tx) + c100 * tx;
    const c10 = c010 * (1 - tx) + c110 * tx;
    const c01 = c001 * (1 - tx) + c101 * tx;
    const c11 = c011 * (1 - tx) + c111 * tx;

    const c0 = c00 * (1 - ty) + c10 * ty;
    const c1 = c01 * (1 - ty) + c11 * ty;

    return c0 * (1 - tz) + c1 * tz;
  }

  // ──────────────────────────────────────────────────────────────
  // TRANSFORM — now identical logic for points AND marching cubes
  // (this is why the mesh was too small before — the resolution factor was missing)
  // ──────────────────────────────────────────────────────────────
  applyWorldTransformToMesh(
    mesh: THREE.Mesh,
    bounds: { x: number; y: number },
    height: number,
    resolution: number // marching-cubes internal resolution
  ) {
    // Same physical size as the point cloud (100 px/m → 12 m depth)
    const scaleX = bounds.x / PX_PER_M;
    const scaleY = bounds.y / PX_PER_M;
    const scaleZ = -height;

    mesh.scale.set(scaleX, scaleY, scaleZ);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(0, -height, 0);
  }

  // dispose() {
  //   if (this.marching) {
  //     this.marching.geometry.dispose();
  //     this.material.dispose();
  //     this.marching = undefined;
  //   }
  // }
}
