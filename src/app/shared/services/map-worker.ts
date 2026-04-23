import { computed, Injectable, signal, untracked } from '@angular/core';
import { INode } from 'svgson';
import { isValidSVG } from '../../core/models/building';
import { Canvas, FabricObject, Group, Line } from 'fabric';
import { PX_PER_M } from './building-manager';
import { PileSelection } from '../../core/models/probe';

type Node = {
  id: string;
  x: number;
  y: number;
};

@Injectable({
  providedIn: 'root',
})
export class MapWorker {
  private canvas!: Canvas; // Canvas pointer for working with objects
  private container!: HTMLDivElement;

  private _svgData: INode | null = null; // Current building

  // Layers
  buildingObjects: FabricObject[] = [];
  pileObjects: FabricObject[] = [];
  tempObjects: FabricObject[] = [];
  gridObjects: FabricObject[] = [];
  axesObjects: FabricObject[] = [];

  readonly selectedTempChainId = signal<string | null>(null); // Selected temperature chain
  readonly isSVGLoaded = signal(false); // Signal to the canvas that it can draw building from the file
  readonly isSVGRendered = signal(false); // Signal to allow the slice to draw if loaded in the wrong order

  readonly isAxesVisible = signal(true);

  readonly getCanvas = computed(() => this.canvas);
  readonly getContainer = computed(() => this.container);

  setSVGTemplate(template: INode) {
    this.isSVGLoaded.set(false);
    this.isSVGRendered.set(false);

    if (isValidSVG(template)) {
      this._svgData = template;
    }
    this.isSVGLoaded.set(true);
  }

  registerCanvas(canvas: Canvas, container?: HTMLDivElement) {
    this.canvas = canvas;

    if (container) {
      this.container = container;
    }
  }

  clearCanvas() {
    this.canvas.clear();
    this.drawGrid();
  }

  unloadTemplate() {
    this.isSVGLoaded.set(false);
    this.isSVGRendered.set(false);
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

  getBounds() {
    const viewBox = this._svgData?.attributes['viewBox'].split(' ')!;
    return { x: Number(viewBox[2]), y: Number(viewBox[3]) };
  }

  setBuildingVisible(visible: boolean) {
    // Control building visibility on the canvas
    this.buildingObjects.forEach((obj) => (obj.visible = visible));
    this.pileObjects.forEach((obj) => (obj.visible = visible));
    this.canvas.requestRenderAll();
  }

  // -----------------------
  // Grid (100px mesh)
  // -----------------------
  private drawGrid() {
    const gridSize = PX_PER_M;
    const extent = 20000; // virtual world size

    for (let i = -extent; i <= extent; i += gridSize) {
      const vertical = new Line([i, -extent, i, extent], {
        stroke: '#ddd',
        selectable: false,
        evented: false,
      });

      this.canvas.add(vertical);
      this.gridObjects.push(vertical);

      const horizontal = new Line([-extent, i, extent, i], {
        stroke: '#ddd',
        selectable: false,
        evented: false,
      });

      this.canvas.add(horizontal);
      this.gridObjects.push(horizontal);
    }
    // this.canvas.getObjects().forEach(obj => obj.sendToBack());
  }

  toggleGrid() {
    this.gridObjects.forEach((obj) => (obj.visible = obj.visible ? false : true));
    this.canvas.requestRenderAll();
  }

  toggleAxes(visibility?: boolean) {
    if (visibility) {
      untracked(() => this.isAxesVisible.set(visibility));
      this.axesObjects.forEach((obj) => (obj.visible = visibility));
    } else {
      untracked(() => this.isAxesVisible.update((v) => !v));
      this.axesObjects.forEach((obj) => (obj.visible = !obj.visible));
    }
    this.canvas.requestRenderAll();
  }

  fitToBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }, padding = 40) {
    const canvas = this.canvas;
    const container = this.container;

    const canvasWidth = container.clientWidth;
    const canvasHeight = container.clientHeight;

    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;

    if (w <= 0 || h <= 0) return;

    const zoomX = (canvasWidth - padding * 2) / w;
    const zoomY = (canvasHeight - padding * 2) / h;

    const zoom = Math.min(zoomX, zoomY);
    const clampedZoom = Math.min(Math.max(zoom, 0.1), 5);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Reset transform
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setZoom(clampedZoom);

    const vpt = canvas.viewportTransform!;

    vpt[4] = canvasWidth / 2 - centerX * clampedZoom;
    vpt[5] = canvasHeight / 2 - centerY * clampedZoom;

    canvas.requestRenderAll();
  }

  fitToOutline(padding = 40) {
    const outlineNode = this.getOutlineNode();
    if (!outlineNode) return;

    let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

    const rect = outlineNode.children.find((c) => c.name === 'rect');
    if (rect) {
      const x = parseFloat(rect.attributes['x']);
      const y = parseFloat(rect.attributes['y']);
      const w = parseFloat(rect.attributes['width']);
      const h = parseFloat(rect.attributes['height']);

      bounds = {
        minX: x,
        minY: y,
        maxX: x + w,
        maxY: y + h,
      };
    }

    const polygon = outlineNode.children.find((c) => c.name === 'polygon');
    if (polygon) {
      const points = polygon.attributes['points']
        .trim()
        .split(/\s+/)
        .map((p) => p.split(',').map(Number));

      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);

      bounds = {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }

    if (!bounds) return;

    this.fitToBounds(bounds, padding);
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
