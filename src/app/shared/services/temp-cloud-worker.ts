import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { binary3DCloudData } from '../../core/models/temp-cloud';
import { TemperatureControl } from './temperature-control';
import { Canvas, FabricImage } from 'fabric';
import { MapWorker } from './map-worker';
import { buildImageData, printSliceMatrix } from '../../panels/grid/grid-draw';
import { DataConnector } from './data-connector';

@Injectable({
  providedIn: 'root',
})
export class TempCloudWorker {
  private readonly temperatureControl = inject(TemperatureControl);
  private readonly dataConnector = inject(DataConnector);
  private readonly mapWorker = inject(MapWorker);

  private tempImage?: FabricImage;

  private readonly data = signal<binary3DCloudData | undefined>(undefined);
  private readonly nx = signal<number | undefined>(undefined);
  private readonly ny = signal<number | undefined>(undefined);
  private readonly nz = signal<number | undefined>(undefined);
  private readonly nt = signal<number | undefined>(undefined);

  readonly sliceIndex = signal<number>(0);

  readonly isBinLoaded = signal(false);

  constructor() {
    // effect(() => {
    //   const jsonLoaded = this.dataConnector.isJSONLoaded();
    //   const svgLoaded = this.mapWorker.isSVGLoaded();

    //   if (!jsonLoaded || !svgLoaded) {
    //     console.log('Tests');
    //     this.tempImage = undefined;
    //   }
    // });

    effect(() => {
      // untracked(() => console.log(this.data()?.length, this.nx(), this.ny(), this.nz(), this.nt()));
      if (this.data() && this.nx() && this.ny() && this.nz() && this.nt()) {
        untracked(() => this.isBinLoaded.set(true));
      } else this.isBinLoaded.set(false);
    });

    effect(() => {
      // Update on key values change
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
    const z = this.sliceIndex();

    let slice = this.getXYSlice(t, z);

    // Optional smoothing
    slice = this.getSmoothedXYSlice(t, z, true);

    const width = this.nx()!;
    const height = this.ny()!;

    const min = this.temperatureControl.minTemp();
    const max = this.temperatureControl.maxTemp();

    // printSliceMatrix(slice, width, height);
    // const imgData = buildImageData(slice, width, height, (temp) =>
    //   this.temperatureControl.getECMWFColor(temp, min, max)
    // );
    const imgData = buildImageData(slice, width, height, (temp) =>
      this.temperatureControl.getECMWFColor(temp, min, max)
    );

    // Scale to SVG space
    const bounds = this.mapWorker.getBounds();
    const scaleX = bounds.x / width;
    const scaleY = bounds.y / height;

    if (create) this.tempImage = undefined;
    this.updateOrCreateImage(imgData, scaleX, scaleY);
  }

  private updateOrCreateImage(imageData: ImageData, scaleX: number, scaleY: number) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;

    const ctx = tempCanvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    const canvas = this.mapWorker.getCanvas();

    if (this.tempImage) {
      console.error('All good! Update');
      // Update existing image
      this.tempImage.setElement(tempCanvas);
      this.tempImage.set({
        scaleX,
        scaleY,
      });

      this.tempImage.dirty = true; // Force redraw
    } else {
      // Create once
      console.error('All good! Create new');
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
    }

    canvas.requestRenderAll();
  }

  getXYSlice(t: number, z: number): binary3DCloudData {
    // XY → width = nx, height = ny
    const slice = new Float32Array(this.nx()! * this.ny()!) as binary3DCloudData;

    let i = 0;
    for (let y = 0; y < this.ny()!; y++) {
      for (let x = 0; x < this.nx()!; x++) {
        slice[i++] = this.data()![this.idx(t, x, y, z)];
      }
    }

    return slice;
  }

  getXZSlice(t: number, y: number): binary3DCloudData {
    // XZ → width = nx, height = nz
    const slice = new Float32Array(this.nx()! * this.nz()!) as binary3DCloudData;

    let i = 0;
    for (let z = 0; z < this.nz()!; z++) {
      for (let x = 0; x < this.nx()!; x++) {
        slice[i++] = this.data()![this.idx(t, x, y, z)];
      }
    }

    return slice;
  }

  getYZSlice(t: number, x: number): binary3DCloudData {
    // YZ → width = ny, height = nz
    const slice = new Float32Array(this.ny()! * this.nz()!) as binary3DCloudData;

    let i = 0;
    for (let z = 0; z < this.nz()!; z++) {
      for (let y = 0; y < this.ny()!; y++) {
        slice[i++] = this.data()![this.idx(t, x, y, z)];
      }
    }

    return slice;
  }

  // ==================================
  // PCHIP interpolation (optional)
  // ==================================

  private pchip1D(values: Float32Array): Float32Array {
    const n = values.length;
    if (n < 2) return values;

    const d = new Float32Array(n - 1);
    const m = new Float32Array(n);

    // Slopes
    for (let i = 0; i < n - 1; i++) {
      d[i] = values[i + 1] - values[i];
    }

    // Endpoints
    m[0] = d[0];
    m[n - 1] = d[n - 2];

    // Internal tangents
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) {
        m[i] = 0;
      } else {
        m[i] = (d[i - 1] + d[i]) / 2;
      }
    }

    // Evaluate AT ORIGINAL POINTS ONLY
    const out = new Float32Array(n);

    for (let i = 0; i < n - 1; i++) {
      const a = values[i];
      const b = values[i + 1];

      const t = 0.5; // midpoint smoothing

      const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
      const h10 = t ** 3 - 2 * t ** 2 + t;
      const h01 = -2 * t ** 3 + 3 * t ** 2;
      const h11 = t ** 3 - t ** 2;

      out[i] = h00 * a + h10 * m[i] + h01 * b + h11 * m[i + 1];
    }

    out[n - 1] = values[n - 1];

    return out;
  }

  getSmoothedXYSlice(t: number, z: number, smooth: boolean): binary3DCloudData {
    let slice = this.getXYSlice(t, z);

    if (!smooth) return slice;

    slice = this.smoothSliceX(slice, this.nx()!, this.ny()!);
    slice = this.smoothSliceY(slice, this.nx()!, this.ny()!);

    return slice;
  }

  private smoothSliceX(slice: binary3DCloudData, width: number, height: number): binary3DCloudData {
    const out = new Float32Array(slice.length) as binary3DCloudData;

    for (let y = 0; y < height; y++) {
      const row = slice.subarray(y * width, (y + 1) * width);

      const smoothed = this.pchip1D(row);

      out.set(smoothed, y * width);
    }

    return out;
  }

  private smoothSliceY(slice: binary3DCloudData, width: number, height: number): Float32Array {
    const out = new Float32Array(slice.length) as binary3DCloudData;

    for (let x = 0; x < width; x++) {
      const column = new Float32Array(height) as binary3DCloudData;

      for (let y = 0; y < height; y++) {
        column[y] = slice[y * width + x];
      }

      const smoothed = this.pchip1D(column);

      for (let y = 0; y < height; y++) {
        out[y * width + x] = smoothed[y];
      }
    }

    return out;
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
