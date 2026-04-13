import { computed, Injectable, signal } from '@angular/core';
import { INode } from 'svgson';
import { isValidSVG } from '../../core/models/building';
import { Canvas, FabricObject, Group, Line } from 'fabric';

@Injectable({
  providedIn: 'root',
})
export class MapWorker {
  private canvas!: Canvas; // Canvas pointer for working with objects
  private container!: HTMLDivElement;

  private _svgData: INode | null = null; // Current building

  // Layers
  buildingObjects: FabricObject[] = [];
  tempObjects: FabricObject[] = [];

  readonly selectedTempChainId = signal<string | null>(null); // Selected temperature chain
  readonly isSVGLoaded = signal(false); // Signal to the canvas that it can draw building from the file
  readonly isSVGRendered = signal(false); // Signal to allow the slice to draw if loaded in the wrong order

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
    this.canvas.requestRenderAll();
  }

  // -----------------------
  // Grid (100px mesh)
  // -----------------------
  private drawGrid() {
    const gridSize = 100;
    const extent = 20000; // virtual world size

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

  fitToOutline(padding = 40) {
    const canvas = this.canvas;
    const container = this.container;

    const outlineNode = this.getOutlineNode();
    if (!outlineNode) return;

    // Extract rect from SVG
    const rect = outlineNode.children.find((c) => c.name === 'rect');
    if (!rect) return;

    const x = parseFloat(rect.attributes['x']);
    const y = parseFloat(rect.attributes['y']);
    const w = parseFloat(rect.attributes['width']);
    const h = parseFloat(rect.attributes['height']);

    // Canvas size
    const canvasWidth = container.clientWidth;
    const canvasHeight = container.clientHeight;

    // Compute zoom to fit
    const zoomX = (canvasWidth - padding * 2) / w;
    const zoomY = (canvasHeight - padding * 2) / h;

    const zoom = Math.min(zoomX, zoomY);

    // Clamp (optional, same as your wheel zoom)
    const clampedZoom = Math.min(Math.max(zoom, 0.1), 5);

    // Center of outline in world coords
    const centerX = x + w / 2;
    const centerY = y + h / 2;

    // Apply zoom centered on canvas center
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // reset first
    canvas.setZoom(clampedZoom);

    const vpt = canvas.viewportTransform!;

    // Translate so outline center aligns with canvas center
    vpt[4] = canvasWidth / 2 - centerX * clampedZoom;
    vpt[5] = canvasHeight / 2 - centerY * clampedZoom;

    canvas.requestRenderAll();
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
