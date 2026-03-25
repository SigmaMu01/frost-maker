import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  viewChild,
  afterNextRender,
  ChangeDetectorRef,
  inject,
  effect,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThreeContext } from '../../shared/services/three-context';
import { ViewCube } from './view-cube/view-cube';
import { MapWorker } from '../../shared/services/map-worker';
import { BuildingManager } from '../../shared/services/building-manager';

@Component({
  selector: 'app-viewport',
  imports: [ViewCube],
  templateUrl: './viewport.html',
  styleUrl: './viewport.scss',
})
export class Viewport implements OnDestroy {
  private readonly mapWorker = inject(MapWorker);
  private readonly buildingManager = inject(BuildingManager);
  private readonly three = inject(ThreeContext);

  container = viewChild.required<ElementRef<HTMLDivElement>>('container');

  constructor() {
    // Initialize Three.js only once the DOM element exists
    afterNextRender(() => {
      const el = this.container().nativeElement;
      this.three.init(el);

      // Optional: handle resize (you can also use @HostListener('window:resize'))
      const ro = new ResizeObserver(() => this.three.resize());
      ro.observe(el);

      this.addScene();
    });

    // effect(() => {
    //   const floors = this.buildingManager.floorNum();
    //   this.buildingManager.updateBuilding();
    //   console.log(floors);
    // });

    // Optional: react to signals / state changes from UI controls
    // effect(() => { if (someSignal()) this.three.scene.add(...) });
  }

  private addScene() {
    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(6, 10, 8);
    this.three.scene.add(dirLight);

    this.three.scene.add(new THREE.GridHelper(20, 20, 0x888888, 0x444444));
    this.three.scene.add(new THREE.AxesHelper(4));

    // Building from SVG
    const outline = this.mapWorker.getOutlineNode();
    if (!outline) {
      console.warn('No outline found');
      return;
    }
    const rectNode = outline.children.find((c) => ['rect', 'polygon'].includes(c.name));
    console.dir(rectNode);
    if (!rectNode) {
      console.warn('No rect found in outline');
      return;
    }

    // Textures
    const textureLoader = new THREE.TextureLoader();

    const wallTexture = textureLoader.load('house_1.jpg');
    wallTexture.colorSpace = THREE.SRGBColorSpace; // important for correct colors
    wallTexture.wrapS = THREE.RepeatWrapping; // optional: how it tiles if UVs >1
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(0.5, 0.5);
    wallTexture.offset.set(0, 0.5);

    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      metalness: 0.1,
      roughness: 0.7,
    });
    const grayMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888, // medium gray – adjust to taste (e.g. 0xaaaaaa, 0x555555)
      metalness: 0.2,
      roughness: 0.8,
    });

    // Fallback: add a plain colored cube if texture fails
    // fallbackCube.position.set(0, 1, 0);
    // const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    // const fallbackCube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), fallbackMat);
    // this.three.scene.add(fallbackCube);

    // Simple gray material for top and bottom

    const cubeMaterials = [
      wallMaterial, // +X (right)
      wallMaterial, // -X (left)
      grayMaterial, // +Y (top)
      grayMaterial, // -Y (bottom)
      wallMaterial, // +Z (front)
      wallMaterial, // -Z (back)
    ];
    const buildingMaterials = [
      grayMaterial, // Top/bottom group
      wallMaterial, // Side group
    ];

    // Test cube
    const geometry = new THREE.BoxGeometry(2, 2, 2); // slightly larger so it's visible
    const cube = new THREE.Mesh(geometry, cubeMaterials);
    cube.position.set(0, 1, 0); // raise it a bit above the grid
    // this.three.scene.add(cube);

    // Building
    const shape = this.buildingManager.SVGToShape(rectNode);
    const building = this.buildingManager.createBuildingMesh(shape, buildingMaterials);

    building.position.y = 1; // lift above grid

    this.three.scene.add(building);
  }

  ngOnDestroy() {
    this.three.dispose();
  }
}
