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

    // Optional: react to signals / state changes from UI controls
    // effect(() => { if (someSignal()) this.three.scene.add(...) });
  }

  private addScene() {
    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(6, 10, 8);
    this.three.scene.add(dirLight);

    this.three.scene.add(new THREE.GridHelper(20, 20, 0x888888, 0x444444));
    const axesHelper = new THREE.AxesHelper(4);
    // axesHelper.name = 'axesHelper';

    // Building from SVG
    const outline = this.mapWorker.getOutlineNode();
    if (!outline) {
      console.warn('No outline found');
      this.three.scene.add(axesHelper);
      return;
    }
    const rectNode = outline.children.find((c) => ['rect', 'polygon'].includes(c.name));

    if (!rectNode) {
      console.warn('No rect/polygon found in outline');
      return;
    } else {
      this.three.scene.remove(axesHelper);
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
  }

  ngOnDestroy() {
    this.three.dispose();
  }
}
