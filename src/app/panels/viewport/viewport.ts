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
import { ThreeContext } from '../../shared/services/three-context';
import { ViewCube } from './view-cube/view-cube';
import { MapWorker } from '../../shared/services/map-worker';
import { BuildingManager } from '../../shared/services/building-manager';
import { CameraControl } from './utils/camera-control';

@Component({
  selector: 'app-viewport',
  imports: [ViewCube],
  templateUrl: './viewport.html',
  styleUrl: './viewport.scss',
})
export class Viewport implements OnDestroy {
  private readonly mapWorker = inject(MapWorker);
  private readonly buildingManager = inject(BuildingManager);
  private readonly cameraControl = inject(CameraControl);
  private readonly three = inject(ThreeContext);

  container = viewChild.required<ElementRef<HTMLDivElement>>('container');

  constructor() {
    // Initialize Three.js only once the DOM element exists
    afterNextRender(() => {
      const el = this.container().nativeElement;
      el.addEventListener('pointerdown', this.cameraControl.onPointerDown);
      el.addEventListener('pointermove', this.cameraControl.onPointerMove);
      el.addEventListener('pointerup', this.cameraControl.onPointerUp);
      this.three.init(el);

      // Optional: handle resize (you can also use @HostListener('window:resize'))
      const ro = new ResizeObserver(() => this.three.resize());
      ro.observe(el);

      this.addScene();
    });

    effect(() => {
      const fov = this.cameraControl.fov();

      const camera = this.three.camera as THREE.PerspectiveCamera;

      camera.fov = fov;
      camera.updateProjectionMatrix();
    });
  }

  private addScene() {
    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(6, 10, 8);
    this.three.scene.add(dirLight);

    // this.three.scene.add(new THREE.GridHelper(20, 20, 0x888888, 0x444444));
    // const axesHelper = new THREE.AxesHelper(4);
    // axesHelper.name = 'axesHelper';

    // Building from SVG
    const outline = this.mapWorker.getOutlineNode();
    if (!outline) {
      console.warn('No outline found');
      // this.three.scene.add(axesHelper);
      return;
    }
    const rectNode = outline.children.find((c) => ['rect', 'polygon'].includes(c.name));

    if (!rectNode) {
      console.warn('No rect/polygon found in outline');
      return;
    } else {
      // this.three.scene.remove(axesHelper);
    }

    // Supports
    const supports = this.mapWorker.getSupportNodes();
    if (supports?.children) {
      for (var support of supports!.children) {
        const shape = this.buildingManager.SVGToShape(support);
        const supportMesh = this.buildingManager.createSupport(shape);
        this.three.scene.add(supportMesh);
      }
    }

    // Temp chains
    const tempChains = this.mapWorker.getTempChainNodes();
    if (tempChains?.length) {
      for (var tempChain of tempChains) {
        const shapeCenter = this.buildingManager.getTempChainCoords(tempChain);
        const tempChainRef = this.buildingManager.createTempChain(shapeCenter!);
        this.three.scene.add(tempChainRef);
      }
    }

    // Building
    const shape = this.buildingManager.SVGToShape(rectNode);
    // const building = this.buildingManager.createBuildingMesh(shape, buildingMaterials);
    const building = this.buildingManager.createBuilding(shape);
    this.three.scene.add(building);

    // Create grid on floor level under the building
    const { center, size } = this.createRectangularGrid(building);

    // Center camera on the building
    this.cameraControl.centerCamera(center, size);
  }

  private createRectangularGrid(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    const step = 1; // grid spacing

    // 👉 Base size + 20% per side
    let width = size.x * 1.4;
    let depth = size.z * 1.4;

    // 👉 Snap to grid step (VERY important)
    width = Math.ceil(width / step) * step;
    depth = Math.ceil(depth / step) * step;

    // 👉 Add one extra step so outer lines "close"
    width += step;
    depth += step;

    const halfW = width / 2;
    const halfD = depth / 2;

    const lines: number[] = [];

    // ---- Vertical lines (along Z) ----
    for (let x = -halfW; x <= halfW; x += step) {
      lines.push(x, 0, -halfD, x, 0, halfD);
    }

    // ---- Horizontal lines (along X) ----
    for (let z = -halfD; z <= halfD; z += step) {
      lines.push(-halfW, 0, z, halfW, 0, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.8,
    });

    const grid = new THREE.LineSegments(geometry, material);

    grid.position.set(center.x, 0, center.z);

    this.three.scene.add(grid);

    return { center, size };
  }

  ngOnDestroy() {
    this.three.dispose();
  }
}
