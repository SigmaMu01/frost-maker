import { effect, inject, Injectable, signal } from '@angular/core';
import { INode } from 'svgson';
import * as THREE from 'three';
import { TempProbe } from '../../core/models/probe';
import { TemperatureControl } from './temperature-control';

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
  private readonly temperatureControl = inject(TemperatureControl);

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

      shape.moveTo(x, y);
      shape.lineTo(x + w, y);
      shape.lineTo(x + w, y + h);
      shape.lineTo(x, y + h);
      shape.lineTo(x, y);

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
        const py = scaleCoords(y);

        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }

      shape.closePath();

      return shape;
    }
  }

  getTempChainCoords(group: INode): { id: string; x: number; y: number } {
    const scaleCoords = (x: number) => x / PX_PER_M;

    const circle = group.children.find((c) => c.name === 'circle');
    if (!circle) throw new Error('No shape present for temp chain. Use circle for each layer with unique id.');

    const cx = parseFloat(circle.attributes['cx'] || '0');
    const cy = parseFloat(circle.attributes['cy'] || '0');

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) throw new Error('Temp chain coordinates are out of bounds');

    const id = group.attributes['id'];
    const result = {
      id: id.substring(id.lastIndexOf('_') + 1), // Remove trailing anchor from the name
      x: scaleCoords(cx),
      y: scaleCoords(cy),
    };

    if (result['id']) return result;
    else throw new Error(`Temp chain with no ID found: ${result}`);
  }

  createShape(shape: THREE.Shape, height: number, material?: THREE.Material | THREE.Material[]) {
    this.currentShape = shape;
    this.currentMaterial = material;

    if (!height) {
      let height = 1;
    }

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    });

    // geometry.center();

    if (!material) {
      let material = new THREE.MeshStandardMaterial({
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

  // createTempChain(c: { id: string; x: number; y: number }) {
  //   const height = 12;
  //   const radius = 0.2;
  //   const cylinder = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);

  //   const tempMaterial = new THREE.MeshBasicMaterial({
  //     color: 0x00ffff,
  //     transparent: true,
  //     opacity: 0.9,
  //     side: THREE.DoubleSide,
  //   });

  //   const tempChain = new THREE.Mesh(cylinder, tempMaterial);
  //   tempChain.position.set(c.x, -height / 2, c.y);
  //   tempChain.userData = {
  //     type: 'tempChain',
  //     id: c.id, // Temp chain id
  //   };

  //   return tempChain;
  // }

  createTempChain(c: { id: string; x: number; y: number }, minTemp: number, maxTemp: number, probes: TempProbe[]) {
    const height = 12;
    const radius = 0.2;

    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      64,
      probes.length ? probes.length : 1, // Optional: more vertical resolution
      probes.length ? true : false // Cylinder caps (top and bottom)
    );

    let material = {} as THREE.MeshBasicMaterial;

    if (probes.length) {
      const texture = this.createTempGradientTexture(probes, minTemp, maxTemp);

      material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);

    // Align top at y = 0 (as you already do)
    mesh.position.set(c.x, -height / 2, c.y);

    mesh.userData = {
      type: 'tempChain',
      id: c.id,
    };

    return mesh;
  }

  createTempGradientTexture(probes: TempProbe[], minTemp: number, maxTemp: number, height = 512): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(1, height);

    const maxDepth = 12;
    const steps = 64; // Quantization

    for (let y = 0; y < height; y++) {
      // Convert pixel to depth
      const percent = y / (height - 1);
      const depth = percent * maxDepth;

      const temp = this.temperatureControl.interpolateTemp(probes, depth);

      const color = this.temperatureControl.getECMWFColor(temp, minTemp, maxTemp, steps);

      // Parse rgb(...)
      const match = color.match(/\d+/g)!;
      const r = Number(match[0]);
      const g = Number(match[1]);
      const b = Number(match[2]);

      const i = y * 4;

      imageData.data[i + 0] = r;
      imageData.data[i + 1] = g;
      imageData.data[i + 2] = b;
      imageData.data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);

    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    texture.colorSpace = THREE.SRGBColorSpace;

    // 🔥 Important for crisp bands
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    return texture;
  }
}
