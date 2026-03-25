import { effect, Injectable, signal } from '@angular/core';
import { INode } from 'svgson';
import * as THREE from 'three';

const FLOOR_HEIGHT = 2;
const PILE_HEIGHT = (0.3 / 2.7) * FLOOR_HEIGHT; // Lift building by 30 cm to account for bearing piles

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
    const scaleCoords = (x: number) => x / 100;

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

      // Split by ANY whitespace
      const tokens = raw.trim().split(/\s+/).map(Number);

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

  createBuildingMesh(shape: THREE.Shape, material?: THREE.Material | THREE.Material[]) {
    this.currentShape = shape;
    this.currentMaterial = material;

    const depth = this.floorNum() * FLOOR_HEIGHT;

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
    });

    geometry.center();

    if (!material) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xb0b0b0,
        roughness: 0.8,
        metalness: 0.1,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);

    mesh.rotation.x = Math.PI / 2; // Rotate so extrusion goes UP (Y axis)
    const height = this.floorNum() * FLOOR_HEIGHT;

    this.buildingMesh = mesh;
    this.buildingMesh.position.y = height / 2 + PILE_HEIGHT; // Adjust for building height

    return mesh;
  }

  updateBuilding() {
    if (!this.buildingMesh || !this.currentShape) return;

    const depth = this.floorNum() * FLOOR_HEIGHT;

    this.buildingMesh.geometry.dispose();

    const newGeometry = new THREE.ExtrudeGeometry(this.currentShape, {
      depth,
      bevelEnabled: false,
    });

    newGeometry.center();

    this.buildingMesh.geometry = newGeometry;

    const height = this.floorNum() * FLOOR_HEIGHT;

    this.buildingMesh.position.y = height / 2 + PILE_HEIGHT; // Adjust for building height
  }
}
