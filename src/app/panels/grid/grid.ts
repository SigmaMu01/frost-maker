import { AfterViewInit, Component, effect, ElementRef, HostListener, viewChild, ViewChild } from '@angular/core';

// import * as fabric from 'fabric'; // To-Do: remove this in favor of minimal import like below:
import { Canvas, Point, Line, TPointerEventInfo, TPointerEvent, TEvent, FabricObject } from 'fabric';
import { MapWorker } from '../../shared/services/map-worker';
import { drawBuilding, drawSupports, drawTempChains } from './grid-draw';

interface FabricObjectWithID extends FabricObject {
  id?: string;
}

@Component({
  selector: 'app-grid',
  imports: [],
  templateUrl: './grid.html',
  styleUrl: './grid.scss',
})
export class Grid implements AfterViewInit {
  canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('fabricCanvas');
  containerRef = viewChild.required<ElementRef<HTMLDivElement>>('fabricContainer');

  canvas!: Canvas;

  // pan helpers
  private isPanning = false;
  private lastPosX = 0;
  private lastPosY = 0;

  constructor(private mapWorker: MapWorker) {
    effect(() => {
      if (this.mapWorker.isSVGLoaded()) {
        this.drawSVG();
      }
    });
  }

  ngAfterViewInit(): void {
    const container = this.containerRef().nativeElement;
    const canvasEl = this.canvasRef().nativeElement;

    const { width, height } = container.getBoundingClientRect();

    this.initCanvas();
    this.mapWorker.registerCanvas(this.canvas);
    this.resizeCanvas();
    this.drawGrid();

    // this.drawSVG();
  }

  // ----------------------
  // Canvas setup
  // ----------------------
  private initCanvas() {
    this.canvas = new Canvas(this.canvasRef().nativeElement, {
      selection: true,
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
    });

    // Mouse events
    this.canvas.on('mouse:down', this.onMouseDown);
    this.canvas.on('mouse:move', this.onMouseMove);
    this.canvas.on('mouse:up', this.onMouseUp);
    this.canvas.on('mouse:wheel', this.onMouseWheel);

    // Object select events
    this.canvas.on('selection:created', (e) => this.onSelection(e));
    this.canvas.on('selection:updated', (e) => this.onSelection(e));
    this.canvas.on('selection:cleared', () => this.onSelectionCleared());
  }

  // ----------------------
  // Responsive resizing
  // ----------------------
  @HostListener('window:resize')
  resizeCanvas() {
    const parentContainer = this.containerRef().nativeElement;
    const { width, height } = parentContainer.getBoundingClientRect();

    this.canvas.setDimensions({ width, height });
    this.canvas.requestRenderAll();
  }

  // ----------------------
  // Grid (100px mesh)
  // ----------------------
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

  private drawSVG() {
    const children = this.mapWorker.getSVGChildren();

    children.forEach((node) => {
      const id = node.attributes?.['id'] ?? '';

      switch (id) {
        case 'outline':
          drawBuilding(this.canvas, node);
          break;

        case 'support':
          drawSupports(this.canvas, node);
          break;

        default:
          if (id.startsWith('_x5F_')) {
            drawTempChains(this.canvas, node, id);
          }
      }
    });

    this.canvas.requestRenderAll();
  }

  // ----------------------
  // Panning (middle mouse or Alt+drag)
  // ----------------------
  private onMouseDown = (opt: TPointerEventInfo<TPointerEvent>) => {
    const evt = opt.e;

    if ('button' in evt && evt.button === 2) {
      this.isPanning = true;
      this.canvas.selection = false;

      // const pointer = this.canvas.getPointer(evt);
      this.lastPosX = evt.clientX;
      this.lastPosY = evt.clientY;
    }
  };

  private onMouseMove = (opt: TPointerEventInfo<MouseEvent>) => {
    if (!this.isPanning) return;

    const evt = opt.e;
    // const pointer = this.canvas.getPointer(evt);
    const vpt = this.canvas.viewportTransform!;

    vpt[4] += evt.clientX - this.lastPosX;
    vpt[5] += evt.clientY - this.lastPosY;

    this.canvas.requestRenderAll();

    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;
  };

  private onMouseUp = () => {
    this.isPanning = false;
    this.canvas.selection = true;
  };

  // ----------------------
  // Zoom (wheel, cursor-centric)
  // ----------------------
  private onMouseWheel = (opt: TPointerEventInfo<WheelEvent>) => {
    const evt = opt.e;
    let zoom = this.canvas.getZoom();

    zoom *= 0.999 ** evt.deltaY;
    zoom = Math.min(Math.max(zoom, 0.2), 5);

    this.canvas.zoomToPoint(new Point(evt.offsetX, evt.offsetY), zoom);

    evt.preventDefault();
    evt.stopPropagation();
  };

  // ----------------------
  // Object selection (temp chains)
  // ----------------------

  private onSelection(e: Partial<TEvent<TPointerEvent>> & { selected?: FabricObjectWithID[] }) {
    const selected = e.selected?.[0];
    if (!selected?.id) return;

    // Save current selected temperature chain to service
    this.mapWorker.setSelectedObjectId(selected!.id!);
  }

  private onSelectionCleared() {
    this.mapWorker.clearSelection();
  }
}
