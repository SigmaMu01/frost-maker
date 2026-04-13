import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { binary3DCloudData } from '../../core/models/temp-cloud';
import { TemperatureControl } from './temperature-control';
import { Canvas, FabricImage, FabricObject } from 'fabric';
import { MapWorker } from './map-worker';
import { DataConnector } from './data-connector';
import { GridDraw } from '../../panels/grid/grid-draw';
import { PX_PER_M, TEMP_CHAIN_HEIGHT_M } from './building-manager';

@Injectable({
  providedIn: 'root',
})
export class TempCloudWorker {
  private readonly temperatureControl = inject(TemperatureControl);
  private readonly dataConnector = inject(DataConnector);
  private readonly mapWorker = inject(MapWorker);
  private readonly gridDraw = inject(GridDraw);

  private tempImage?: FabricImage;

  private axesObjects: FabricObject[] = [];

  readonly sliceMode = signal<'xy' | 'xz' | 'yz'>('xy');

  private readonly data = signal<binary3DCloudData | undefined>(undefined);
  readonly nx = signal<number | undefined>(undefined);
  readonly ny = signal<number | undefined>(undefined);
  readonly nz = signal<number | undefined>(undefined);
  readonly nt = signal<number | undefined>(undefined);

  readonly sliceIndexes = signal<{ xy: number; xz: number; yz: number }>({ xy: 0, xz: 0, yz: 0 });
  readonly sliceIndex = computed(() => this.sliceIndexes()[this.sliceMode()]);
  readonly currentSlice = signal<binary3DCloudData>({} as binary3DCloudData);

  readonly isBinLoaded = signal(false);

  constructor() {
    effect(() => {
      const slice = this.sliceMode();
      this.fitToTemperatureSlice();
    });

    effect(() => {
      // untracked(() => console.log(this.data()?.length, this.nx(), this.ny(), this.nz(), this.nt()));
      if (this.data() && this.nx() && this.ny() && this.nz() && this.nt()) {
        untracked(() => this.isBinLoaded.set(true));
      } else this.isBinLoaded.set(false);
    });

    effect(() => {
      // Update on key values change
      const mode = this.sliceMode();
      const min = this.temperatureControl.minTemp();
      const max = this.temperatureControl.maxTemp();
      const frame = this.dataConnector.selectedFrame();
      const sliceIndex = this.sliceIndex();

      if (!this.isBinLoaded() || !this.mapWorker.isSVGRendered() || !this.dataConnector.isJSONLoaded()) return;
      untracked(() => this.drawTemperatureSlice());
    });
  }

  loadShape(shape: number[]) {
    this.nx.set(shape[0]);
    this.ny.set(shape[1]);
    this.nz.set(shape[2]);
    this.nt.set(shape[3]);
    this.tempImage = undefined;
  }

  loadData(data: binary3DCloudData) {
    this.data.set(data);
    this.tempImage = undefined;
  }

  private idx(t: number, x: number, y: number, z: number) {
    return t * (this.nz()! * this.ny()! * this.nx()!) + z * (this.ny()! * this.nx()!) + y * this.nx()! + x;
  }

  drawTemperatureSlice(create: boolean = false) {
    if (!this.isBinLoaded()) return;

    const t = this.dataConnector.selectedFrame();
    // const z = this.sliceIndex();
    // let slice = this.getXYSlice(t, z);
    const mode = this.sliceMode();
    const i = this.sliceIndex();

    let slice: binary3DCloudData;
    let width: number;
    let height: number;

    if (mode === 'xy') {
      this.mapWorker.setBuildingVisible(true); // Draw building only when xy slicing is active
    } else {
      this.mapWorker.setBuildingVisible(false);
    }

    switch (mode) {
      case 'xy':
        slice = this.getXYSlice(t, i);
        width = this.nx()!;
        height = this.ny()!;
        break;

      case 'xz':
        slice = this.getXZSlice(t, i);
        width = this.nx()!;
        height = this.nz()!;
        break;

      case 'yz':
        slice = this.getYZSlice(t, i);
        width = this.ny()!;
        height = this.nz()!;
        break;
    }

    this.currentSlice.set(slice);

    // const width = this.nx()!;
    // const height = this.ny()!;

    const min = this.temperatureControl.minTemp();
    const max = this.temperatureControl.maxTemp();

    // printSliceMatrix(slice, width, height);
    const imgData = this.gridDraw.buildImageData(slice, width, height, (temp) =>
      this.temperatureControl.getECMWFColor(temp, min, max)
    );

    // Scale to SVG space
    const bounds = this.mapWorker.getBounds();

    let scaleX: number;
    let scaleY: number;

    switch (mode) {
      case 'xy':
        scaleX = bounds.x / this.nx()!;
        scaleY = bounds.y / this.ny()!;
        break;

      case 'xz':
        scaleX = bounds.x / this.nx()!;
        scaleY = (PX_PER_M * TEMP_CHAIN_HEIGHT_M) / this.nz()!; // ← using Y space for Z visually
        break;

      case 'yz':
        scaleX = bounds.y / this.ny()!;
        scaleY = (PX_PER_M * TEMP_CHAIN_HEIGHT_M) / this.nz()!;
        break;
    }

    if (create) this.tempImage = undefined;

    this.updateOrCreateImage(imgData, scaleX, scaleY);
    this.drawAxes(width, height, scaleX, scaleY);
  }

  private updateOrCreateImage(imageData: ImageData, scaleX: number, scaleY: number) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;

    const ctx = tempCanvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    const canvas = this.mapWorker.getCanvas();

    if (this.tempImage) {
      // console.log('All good! Update');
      // Update existing image
      this.tempImage.setElement(tempCanvas);
      this.tempImage.set({
        scaleX,
        scaleY,
      });

      this.tempImage.dirty = true; // Force redraw
    } else {
      // Create once
      // console.log('All good! Create new');
      this.tempImage = new FabricImage(tempCanvas, {
        left: 0,
        top: 0,
        scaleX,
        scaleY,
        selectable: false,
        evented: false,
      });

      canvas.add(this.tempImage);
      canvas.sendObjectToBack(this.tempImage);

      this.mapWorker.tempObjects = [this.tempImage]; // Save to layer
    }

    canvas.requestRenderAll();
  }

  fitToTemperatureSlice(padding = 40) {
    if (!this.tempImage) return;

    const mode = this.sliceMode();

    const bounds = this.mapWorker.getBounds();

    let width: number;
    let height: number;

    switch (mode) {
      case 'xy':
        width = bounds.x;
        height = bounds.y;
        break;

      case 'xz':
        width = bounds.x;
        height = PX_PER_M * TEMP_CHAIN_HEIGHT_M;
        break;

      case 'yz':
        width = bounds.y;
        height = PX_PER_M * TEMP_CHAIN_HEIGHT_M;
        break;
    }

    this.mapWorker.fitToBounds(
      {
        minX: 0,
        minY: 0,
        maxX: width,
        maxY: height,
      },
      padding
    );
  }

  getXYSlice(t: number, z: number): binary3DCloudData {
    // XY → width = nx, height = ny
    const slice = new Float32Array(this.nx()! * this.ny()!) as binary3DCloudData;

    let i = 0;
    for (let y = 0; y < this.ny()!; y++) {
      for (let x = 0; x < this.nx()!; x++) {
        slice[i++] = this.data()![this.idx(t, x, y, this.nz()! - 1 - z)];
      }
    }

    return slice;
  }

  getXZSlice(t: number, y: number): binary3DCloudData {
    const nx = this.nx()!;
    const nz = this.nz()!;
    const slice = new Float32Array(nx * nz) as binary3DCloudData;

    let i = 0;
    for (let z = nz - 1; z >= 0; z--) {
      // ← fixed: nz-1 downto 0 (surface at top)
      for (let x = 0; x < nx; x++) {
        slice[i++] = this.data()![this.idx(t, x, this.ny()! - 1 - y, z)];
      }
    }
    return slice;
  }

  getYZSlice(t: number, x: number): binary3DCloudData {
    const ny = this.ny()!;
    const nz = this.nz()!;
    const nx = this.nx()!;

    x = Math.max(0, Math.min(x, nx - 1));

    const slice = new Float32Array(ny * nz) as binary3DCloudData;

    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        const flippedZ = nz - 1 - z;

        const row = z;
        const col = y;

        slice[row * ny + col] = this.data()![this.idx(t, x, y, flippedZ)];
      }
    }

    return slice;
  }

  // getValueAt(worldX: number, worldY: number) {
  //   const mode = this.sliceMode();

  //   const nx = this.nx()!;
  //   const ny = this.ny()!;
  //   const nz = this.nz()!;

  //   const bounds = this.mapWorker.getBounds();

  //   let x = 0,
  //     y = 0,
  //     z = 0;

  //   switch (mode) {
  //     case 'xy': {
  //       x = Math.floor((worldX / bounds.x) * nx);
  //       y = Math.floor((worldY / bounds.y) * ny);
  //       z = this.sliceIndex();
  //       break;
  //     }

  //     case 'xz': {
  //       x = Math.floor((worldX / bounds.x) * nx);
  //       z = nz - 1 - Math.floor((worldY / bounds.y) * nz);
  //       y = this.sliceIndex();
  //       break;
  //     }

  //     case 'yz': {
  //       y = Math.floor((worldX / bounds.x) * ny);
  //       z = nz - 1 - Math.floor((worldY / bounds.y) * nz);
  //       x = this.sliceIndex();
  //       break;
  //     }
  //   }

  //   // Clamp
  //   x = Math.max(0, Math.min(x, nx - 1));
  //   y = Math.max(0, Math.min(y, ny - 1));
  //   z = Math.max(0, Math.min(z, nz - 1));

  //   const value = this.data()![this.idx(this.dataConnector.selectedFrame(), x, y, z)];

  //   return { x, y, z, value };
  // }

  private drawAxes(width: number, height: number, scaleX: number, scaleY: number) {
    const canvas = this.mapWorker.getCanvas();

    // Remove old axes
    this.axesObjects.forEach((obj) => canvas.remove(obj));
    this.axesObjects = [];

    const mode = this.sliceMode();

    let worldWidth: number;
    let worldHeight: number;
    let labels: { x: string; y: string };

    switch (mode) {
      case 'xy':
        worldWidth = width * scaleX;
        worldHeight = height * scaleY;
        labels = { x: 'X (m)', y: 'Y (m)' };
        break;

      case 'xz':
        worldWidth = width * scaleX;
        worldHeight = height * scaleY;
        labels = { x: 'X (m)', y: 'Z (m)' };
        break;

      case 'yz':
        worldWidth = width * scaleX;
        worldHeight = height * scaleY;
        labels = { x: 'Y (m)', y: 'Z (m)' };
        break;
    }

    const objs = this.gridDraw.drawAxes(canvas, worldWidth, worldHeight, labels);

    this.axesObjects = objs;
    this.mapWorker.axesObjects = this.axesObjects;

    // Ensure axes above image but below UI
    objs.forEach((obj) => canvas.bringObjectForward(obj));
  }

  clearMetadata() {
    this.nx.set(undefined);
    this.ny.set(undefined);
    this.nz.set(undefined);
    this.nt.set(undefined);
    this.data.set(undefined);
    this.tempImage = undefined;
  }
}
