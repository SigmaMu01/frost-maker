import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  untracked,
  viewChild,
  ViewChild,
} from '@angular/core';

// import * as fabric from 'fabric'; // To-Do: remove this in favor of minimal import like below:
import { Canvas, Point, Line, TPointerEventInfo, TPointerEvent, TEvent, FabricObject } from 'fabric';
import { MapWorker } from '../../shared/services/map-worker';
import { GridDraw } from './grid-draw';
import { DataConnector } from '../../shared/services/data-connector';
import { TempCloudWorker } from '../../shared/services/temp-cloud-worker';
import { TemperatureControl } from '../../shared/services/temperature-control';
import { TempProber } from '../../components/temp-probe/temp-prober';

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
  private readonly gridDraw = inject(GridDraw);
  private readonly mapWorker = inject(MapWorker);
  private readonly dataConnector = inject(DataConnector); // Required to check if temp chain has data
  private readonly tempCloudWorker = inject(TempCloudWorker);
  // private readonly temperatureControl = inject(TemperatureControl);
  private readonly tempProber = inject(TempProber);

  canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('fabricCanvas');
  containerRef = viewChild.required<ElementRef<HTMLDivElement>>('fabricContainer');

  canvas!: Canvas;

  // Pan helpers
  private isPanning = false;
  private lastPosX = 0;
  private lastPosY = 0;

  constructor() {
    effect(() => {
      if (this.mapWorker.isSVGLoaded() && this.dataConnector.isJSONLoaded()) {
        untracked(() => this.drawSVG());
        // requestAnimationFrame(() => {
        //   untracked(() => this.tempCloudWorker.drawTemperatureSlice());
        // });
      }
    });

    // effect(() => {
    //   if (
    //     // this.mapWorker.isSVGLoaded() &&
    //     this.mapWorker.isSVGRendered() &&
    //     this.dataConnector.isJSONLoaded() &&
    //     this.tempCloudWorker.isBinLoaded()
    //   ) {
    //     untracked(() => {
    //       this.tempCloudWorker.drawTemperatureSlice();
    //     });
    //   }
    // });
  }

  ngAfterViewInit(): void {
    const container = this.containerRef().nativeElement;
    const canvasEl = this.canvasRef().nativeElement;

    const { width, height } = container.getBoundingClientRect();

    this.initCanvas();
    this.mapWorker.registerCanvas(this.canvas, this.containerRef().nativeElement);
    this.resizeCanvas();
    this.mapWorker.clearCanvas();
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

  private drawSVG() {
    this.mapWorker.clearCanvas();

    const children = this.mapWorker.getSVGChildren();

    children.forEach((node) => {
      const id = node.attributes?.['id'] ?? '';

      switch (id) {
        case 'outline':
          this.gridDraw.drawBuilding(this.canvas, node);
          break;

        case 'support':
          this.gridDraw.drawSupports(this.canvas, node);
          break;

        default:
          if (id.startsWith('_x5F_')) {
            const idLabel = id.substring(id.lastIndexOf('_') + 1);
            if (this.dataConnector.checkTempChainData(idLabel)) {
              this.gridDraw.drawTempChains(this.canvas, node, idLabel);
            } else {
              this.gridDraw.drawEmptyTempChains(this.canvas, node, idLabel);
            }
          }
      }
    });

    this.canvas.requestRenderAll();

    this.mapWorker.isSVGRendered.set(true);
    this.mapWorker.fitToOutline();
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
    if (!this.isPanning) {
      // If mouse hovering
      // const evt = opt.e;
      // const world = this.getWorldPoint(evt);
      // const result = this.tempCloudWorker.getValueAt(world.x, world.y);
      // this.tempProber.probe.set({
      //   x: evt.clientX,
      //   y: evt.clientY,
      //   temp: result.value,
      //   coords: result,
      // });
    } else {
      // If mouse panning

      const evt = opt.e;
      // const pointer = this.canvas.getPointer(evt);
      const vpt = this.canvas.viewportTransform!;

      vpt[4] += evt.clientX - this.lastPosX;
      vpt[5] += evt.clientY - this.lastPosY;

      this.canvas.requestRenderAll();

      this.lastPosX = evt.clientX;
      this.lastPosY = evt.clientY;
    }
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
    zoom = Math.min(Math.max(zoom, 0.1), 5);

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
    // if (!this.dataConnector.checkTempChainData(selected.id)) return;

    // Save current selected temperature chain to service
    this.mapWorker.setSelectedObjectId(selected!.id!);
  }

  private onSelectionCleared() {
    this.mapWorker.clearSelection();
  }

  // private getWorldPoint(evt: MouseEvent) {
  //   return this.canvas.getViewportPoint(evt);
  // }

  // hideProbe() {
  //   this.tempProber.isProbeVisible.set(false);
  // }

  // showProbe(event: MouseEvent) {
  //   this.tempProber.isProbeVisible.set(true);
  // }

  ngOnDestroy(): void {
    if (this.canvas) {
      this.canvas.dispose();
    }
  }
}
