import { Injectable, signal } from '@angular/core';
import { INode } from 'svgson';
import { isValidSVG } from '../../core/models/building';
import { Canvas, Group, Line } from 'fabric';
import { TempProbe } from '../../core/models/probe';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class MapWorker {
  private canvas!: Canvas; // Canvas pointer for working with objects

  private _svgData: INode | null = null; // Current building

  readonly selectedTempChainId = signal<string | null>(null); // Selected temperature chain
  readonly isSVGLoaded = signal(false); // Signal to the canvas that it can draw building from the file

  // Temperature borders
  readonly minTemp = signal<number | null>(null);
  readonly maxTemp = signal<number | null>(null);

  setSVGTemplate(template: INode) {
    this.isSVGLoaded.set(false);
    if (isValidSVG(template)) {
      this._svgData = template;
    }
    this.isSVGLoaded.set(true);
  }

  registerCanvas(canvas: Canvas) {
    this.canvas = canvas;
  }

  clearCanvas() {
    this.canvas.clear();
    this.drawGrid();
  }

  getSVGChildren(): INode[] {
    return this._svgData?.children ?? [];
  }

  setSelectedObjectId(id: string) {
    this.selectedTempChainId.set(id);
  }

  clearSelection() {
    this.selectedTempChainId.set(null);
  }

  // -----------------------
  // Grid (100px mesh)
  // -----------------------
  private drawGrid() {
    const gridSize = 100;
    const extent = 5000; // virtual world size

    for (let i = -extent; i <= extent; i += gridSize) {
      // vertical
      this.canvas.add(
        new Line([i, -extent, i, extent], {
          stroke: '#ddd',
          selectable: false,
          evented: false,
        })
      );
      // horizontal
      this.canvas.add(
        new Line([-extent, i, extent, i], {
          stroke: '#ddd',
          selectable: false,
          evented: false,
        })
      );
    }
    // this.canvas.getObjects().forEach(obj => obj.sendToBack());
  }

  // -------------------------
  // Temperature worker
  // -------------------------

  interpolateTemp(probes: TempProbe[], depth: number) {
    const arr = probes;

    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i];
      const b = arr[i + 1];

      if (depth >= a.depth && depth <= b.depth) {
        const t = (depth - a.depth) / (b.depth - a.depth);

        return a.temp + t * (b.temp - a.temp);
      }
    }

    return arr[arr.length - 1].temp;
  }

  findZeroCrossings(probes: TempProbe[]): TempProbe[] {
    const result: TempProbe[] = [];

    if (probes.length < 2) return result;

    for (let i = 0; i < probes.length - 1; i++) {
      const a = probes[i];
      const b = probes[i + 1];

      // Case 1: exact zero measurement
      if (a.temp === 0) {
        result.push({ depth: a.depth, temp: 0 });
        continue;
      }

      // Case 2: sign change => crossing
      if ((a.temp > 0 && b.temp < 0) || (a.temp < 0 && b.temp > 0)) {
        const t = (0 - a.temp) / (b.temp - a.temp);

        const depth = a.depth + t * (b.depth - a.depth);

        result.push({
          depth,
          temp: 0,
        });
      }
    }

    console.log('Found zeroes: ', result);
    return result;
  }

  getOutlineNode(): INode | null {
    return this._svgData?.children.find((c) => c.attributes?.['id'] === 'outline') ?? null;
  }
}
