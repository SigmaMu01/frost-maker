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
  untracked,
} from '@angular/core';
import * as THREE from 'three';
import { ThreeContext } from '../../shared/services/three-context';
import { ViewCube } from './view-cube/view-cube';
import { MapWorker } from '../../shared/services/map-worker';
import { BuildingManager, TEMP_CHAIN_HEIGHT_M } from '../../shared/services/building-manager';
import { CameraControl } from './utils/camera-control';
import { DataConnector } from '../../shared/services/data-connector';
import { TemperatureControl } from '../../shared/services/temperature-control';
import { IsoSurfaceWorker } from '../../shared/services/iso-surface-worker';
import { TempCloudWorker } from '../../shared/services/temp-cloud-worker';

@Component({
  selector: 'app-viewport',
  imports: [ViewCube],
  templateUrl: './viewport.html',
  styleUrl: './viewport.scss',
})
export class Viewport implements OnDestroy {
  private readonly mapWorker = inject(MapWorker);
  private readonly temperatureControl = inject(TemperatureControl);
  private readonly buildingManager = inject(BuildingManager);
  private readonly cameraControl = inject(CameraControl);
  private readonly dataConnector = inject(DataConnector);
  private readonly three = inject(ThreeContext);
  private readonly isoSurfaceWorker = inject(IsoSurfaceWorker);
  private readonly tempCloudWorker = inject(TempCloudWorker);

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

      // this.addScene();
    });

    // Create scene context on data load
    effect(() => {
      if (this.mapWorker.isSVGLoaded() && this.dataConnector.isJSONLoaded()) {
        untracked(() => this.cleanScene());
        this.addScene();
        console.log('Scene updated');
      }
    });

    // Redraw temperature textures on change
    effect(() => {
      const min = this.temperatureControl.minTemp();
      const max = this.temperatureControl.maxTemp();
      const _ = this.dataConnector.selectedFrame();

      this.updateTemperatureColumns(min, max);
    });

    // Purge scene on data clean
    effect(() => {
      if (!this.mapWorker.isSVGLoaded() || !this.dataConnector.isJSONLoaded()) {
        this.cleanScene();
      }
    });

    effect(() => {
      const fov = this.cameraControl.fov();

      const camera = this.three.camera as THREE.PerspectiveCamera;

      camera.fov = fov;
      camera.updateProjectionMatrix();
    });

    effect(() => {
      if (!this.tempCloudWorker.isBinLoaded() || !this.isoSurfaceWorker.isIsoPointsActive()) {
        const old = this.three.scene.getObjectByName('isoSurface0C');
        if (old) this.three.scene.remove(old);
        return;
      }

      const data = this.tempCloudWorker['data']()!;
      const nx = this.tempCloudWorker.nx()!;
      const ny = this.tempCloudWorker.ny()!;
      const nz = this.tempCloudWorker.nz()!;

      const positions = this.isoSurfaceWorker.buildZeroCrossingPoints(
        data,
        nx,
        ny,
        nz,
        (x, y, z) => this.tempCloudWorker['idx'](this.dataConnector.selectedFrame(), x, y, z),
        0
      );

      const points = this.isoSurfaceWorker.createPointCloud(positions);

      const bounds = this.mapWorker.getBounds();
      this.isoSurfaceWorker.applyWorldTransformToPoints(points, bounds, TEMP_CHAIN_HEIGHT_M, nx, ny, nz);

      points.name = 'isoSurface0C';

      const old = this.three.scene.getObjectByName('isoSurface0C');
      if (old) this.three.scene.remove(old);

      this.three.scene.add(points);
    });
  }

  private addScene() {
    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(6, 10, 8);
    this.three.scene.add(dirLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.three.scene.add(ambient);

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

    // Building
    const shape = this.buildingManager.SVGToShape(rectNode);
    // const building = this.buildingManager.createBuildingMesh(shape, buildingMaterials);
    const building = this.buildingManager.createBuilding(shape);
    building.userData['type'] = 'building';

    this.three.scene.add(building);
    this.buildingManager.setBuildingMesh(building);

    const floor = this.buildingManager.createFloor(shape);
    this.three.scene.add(floor);

    // Create grid on floor level under the building
    const grid = this.buildingManager.createRectangularGrid(building);
    grid.raycast = () => {}; // Pass through when clicking on temp chains
    this.three.scene.add(grid);

    // Temp chains
    let tempChainRef: THREE.Mesh = {} as THREE.Mesh;

    const tempChains = this.mapWorker.getTempChainNodes();

    if (tempChains?.length) {
      for (var tempChain of tempChains) {
        const shapeCenter = this.buildingManager.getTempChainCoords(tempChain);
        const data = untracked(() => this.dataConnector.getTempChainDataAsTempProbes(shapeCenter?.id));

        const min = untracked(() => this.temperatureControl.minTemp());
        const max = untracked(() => this.temperatureControl.maxTemp());

        tempChainRef = this.buildingManager.createTempChain(shapeCenter!, min, max, data);

        tempChainRef.userData['type'] = 'tempChain';
        // tempChainRef.userData['data'] = data;
        tempChainRef.userData['shapeCenter'] = shapeCenter;

        this.three.scene.add(tempChainRef);
      }
    }

    // Center camera on the building
    this.cameraControl.centerCamera();
  }

  private updateTemperatureColumns(min: number, max: number) {
    this.three.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.userData?.['type'] !== 'tempChain') return;

      // const data = obj.userData['data'];
      const shapeCenter = obj.userData['shapeCenter'];
      const data = untracked(() => this.dataConnector.getTempChainDataAsTempProbes(shapeCenter?.id));

      // Recreate only the materials (cheap compared to full mesh)
      const newMesh = this.buildingManager.createTempChain(shapeCenter, min, max, data);

      // Replace materials
      obj.material.dispose();
      obj.material = newMesh.material;

      // Uncomment for vertex colors or attributes
      // if (obj.geometry && newMesh.geometry) {
      //   obj.geometry.dispose();
      //   obj.geometry = newMesh.geometry;
      // }
    });
  }

  private cleanScene() {
    while (this.three.scene.children.length > 0) {
      this.three.scene.remove(this.three.scene.children[0]);
    }
  }

  ngOnDestroy() {
    this.three.dispose();
  }
}
