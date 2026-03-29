import { Injectable, signal } from '@angular/core';
import { INode } from 'svgson';
import { isValidSVG } from '../../core/models/building';
import { Canvas, Group, Line } from 'fabric';

@Injectable({
  providedIn: 'root',
})
export class MapWorker {
  private canvas!: Canvas; // Canvas pointer for working with objects

  private _svgData: INode | null = null; // Current building

  readonly selectedTempChainId = signal<string | null>(null); // Selected temperature chain
  readonly isSVGLoaded = signal(false); // Signal to the canvas that it can draw building from the file

  // Temperature borders
  readonly minTemp = signal<number>(-5);
  readonly maxTemp = signal<number>(1);

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

  getOutlineNode(): INode | null {
    return this._svgData?.children.find((c) => c.attributes?.['id'] === 'outline') ?? null;
  }

  getSupportNodes(): INode | null {
    return this._svgData?.children.find((c) => c.attributes?.['id'] === 'support') ?? null;
  }

  getTempChainNodes(): INode[] | null {
    if (!this._svgData) return null;

    return this._svgData.children.filter((c) => {
      const id = c.attributes?.['id'];
      return typeof id === 'string' && id.startsWith('_x5F_');
    });
  }
}
