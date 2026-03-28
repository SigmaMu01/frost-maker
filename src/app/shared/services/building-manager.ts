import { effect, Injectable, signal } from '@angular/core';
import { INode } from 'svgson';
import * as THREE from 'three';

const FLOOR_HEIGHT = 2.7;
const SUPPORT_LIFT_Y = 0.3; // Lift building by 30 cm to account for bearing piles
const SUPPORT_HEIGHT = 2.3;
const PX_PER_M = 100; // Pixels per meter (svg convert)

const grayMaterial = new THREE.MeshStandardMaterial({
  color: 0x888888, // medium gray – adjust to taste (e.g. 0xaaaaaa, 0x555555)
  metalness: 0.2,
  roughness: 0.8,
});

@Injectable({
  providedIn: 'root',
})
export class BuildingManager {
  private buildingMesh: THREE.Mesh | null = null;
  private currentShape: THREE.Shape | null = null;
  private currentMaterial: THREE.Material | THREE.Material[] | undefined;

  readonly floorNum = signal<number>(1);

  constructor() {
    effect(() => {
      const _ = this.floorNum();
      this.updateBuilding();
    });
  }

  SVGToShape(node: INode): THREE.Shape {
    const scaleCoords = (x: number) => x / PX_PER_M;

    switch (node.name) {
      case 'rect':
        return rectToShape(node);
      case 'polygon':
        return polygonToShape(node);
      default:
        throw new Error("SVG 'outline' has wrong shape type. Rect or polygon expected.");
      // return polygonToShape(node)
    }

    function rectToShape(node: INode): THREE.Shape {
      const x = scaleCoords(parseFloat(node.attributes['x'] || '0'));
      const y = scaleCoords(parseFloat(node.attributes['y'] || '0'));
      const w = scaleCoords(parseFloat(node.attributes['width'] || '0'));
      const h = scaleCoords(parseFloat(node.attributes['height'] || '0'));

      const shape = new THREE.Shape();

      // Invert Y axis
      shape.moveTo(x, -y);
      shape.lineTo(x + w, -y);
      shape.lineTo(x + w, -(y + h));
      shape.lineTo(x, -(y + h));
      shape.lineTo(x, -y);

      return shape;
    }

    function polygonToShape(node: INode): THREE.Shape {
      const raw = node.attributes['points'];

      if (!raw) {
        throw new Error('Polygon has no points');
      }

      const tokens = raw.trim().split(/\s+/).map(Number); // Split by any whitespace

      if (tokens.length % 2 !== 0) {
        throw new Error('Invalid polygon: uneven coordinate count');
      }

      const shape = new THREE.Shape();

      for (let i = 0; i < tokens.length; i += 2) {
        const x = tokens[i];
        const y = tokens[i + 1];

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          console.error('Bad coordinate:', x, y, raw);
          continue;
        }

        const px = scaleCoords(x);
        const py = scaleCoords(-y); // invert Y

        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }

      shape.closePath();

      return shape;
    }
  }

  getTempChainCoords(group: INode): { id: string; x: number; y: number } | null {
    const scaleCoords = (x: number) => x / PX_PER_M;

    const circle = group.children.find((c) => c.name === 'circle');
    if (!circle) return null;

    const cx = parseFloat(circle.attributes['cx'] || '0');
    const cy = parseFloat(circle.attributes['cy'] || '0');

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

    const result = {
      id: group.name,
      x: scaleCoords(cx),
      y: scaleCoords(-cy), // Same Y inversion as building
    };

    return result;
  }

  createShape(shape: THREE.Shape, height: number, material?: THREE.Material | THREE.Material[]) {
    this.currentShape = shape;
    this.currentMaterial = material;

    if (!height) {
      const height = 1;
    }

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    });

    // geometry.center();

    if (!material) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xb0b0b0,
        roughness: 0.8,
        metalness: 0.1,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);

    mesh.rotation.x = Math.PI / 2; // Rotate so extrusion goes UP (Y axis)
    return mesh;
  }

  createBuilding(shape: THREE.Shape) {
    const textureLoader = new THREE.TextureLoader();

    const wallTexture = textureLoader.load('house_1.jpg');
    wallTexture.colorSpace = THREE.SRGBColorSpace; // important for correct colors
    wallTexture.wrapS = THREE.RepeatWrapping; // optional: how it tiles if UVs >1
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(1 / 2.7, 1 / 2.7);
    wallTexture.offset.set(0, 0.63);

    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      metalness: 0.1,
      roughness: 0.7,
    });

    const buildingMaterials = [
      grayMaterial, // Top/bottom group
      wallMaterial, // Side group
    ];

    const height = this.floorNum() * FLOOR_HEIGHT;

    this.buildingMesh = this.createShape(shape, height, buildingMaterials);
    // this.buildingMesh.position.y = height / 2 + SUPPORT_LIFT_Y; // Adjust for building height
    this.buildingMesh.position.y = height + SUPPORT_LIFT_Y; // Adjust for building height

    return this.buildingMesh;
  }

  updateBuilding() {
    if (!this.buildingMesh || !this.currentShape) return;

    const depth = this.floorNum() * FLOOR_HEIGHT;

    this.buildingMesh.geometry.dispose();

    const newGeometry = new THREE.ExtrudeGeometry(this.currentShape, {
      depth,
      bevelEnabled: false,
    });

    // newGeometry.center();

    this.buildingMesh.geometry = newGeometry;

    const height = this.floorNum() * FLOOR_HEIGHT;

    this.buildingMesh.position.y = height + SUPPORT_LIFT_Y; // Adjust for building height
  }

  createSupport(shape: THREE.Shape) {
    const height = SUPPORT_HEIGHT;
    console.log('Created support');
    const supportMesh = this.createShape(shape, height, [grayMaterial, grayMaterial]);
    supportMesh.position.y = SUPPORT_LIFT_Y;

    return supportMesh;
  }

  createTempChain(c: { id: string; x: number; y: number }) {
    const height = 12;
    const radius = 0.2;
    const cylinder = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);

    const tempMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });

    const tempChain = new THREE.Mesh(cylinder, tempMaterial);
    tempChain.position.set(c.x, -height / 2, c.y);
    tempChain.userData = {
      type: 'tempChain',
      id: c.id, // Temp chain id
    };

    return tempChain;
  }
}
