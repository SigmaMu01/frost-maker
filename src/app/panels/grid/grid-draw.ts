import { INode } from 'svgson';
import {
  Canvas,
  Circle,
  Rect,
  FabricText,
  Group,
  Line,
  TOptions,
  FabricObjectProps,
  FabricImage,
  FabricObject,
  Triangle,
} from 'fabric';
import { inject, Injectable } from '@angular/core';
import { MapWorker } from '../../shared/services/map-worker';
import { PX_PER_M } from '../../shared/services/building-manager';

@Injectable({
  providedIn: 'root',
})
export class GridDraw {
  readonly mapWorker = inject(MapWorker);

  private drawRect(canvas: Canvas, node: INode, stroke?: { width?: number; color?: string }, fillColor?: string) {
    const attrs = node.attributes || {};
    const rect = new Rect({
      left: parseFloat(attrs['x'] ?? '0'),
      top: parseFloat(attrs['y'] ?? '0'),
      width: parseFloat(attrs['width'] ?? '0'),
      height: parseFloat(attrs['height'] ?? '0'),
      fill: fillColor ?? 'transparent',
      stroke: stroke?.color ?? 'white',
      strokeWidth: stroke?.width ?? 1,
      originX: 'left',
      originY: 'top',
      selectable: false,
    });

    canvas.add(rect);

    return rect;
  }

  private drawTempChain(
    canvas: Canvas,
    node: INode,
    id: string,
    stroke?: { width?: number; color?: string },
    fillColor?: string,
    selectable?: boolean
  ) {
    const attrs = node.attributes || {};

    const cx = parseFloat(attrs['cx'] ?? '0');
    const cy = parseFloat(attrs['cy'] ?? '0');
    const r = parseFloat(attrs['r'] ?? '0');

    // Circle
    const circle = new Circle({
      left: 0,
      top: 0,
      radius: r,
      fill: fillColor ?? attrs['fill'] ?? 'transparent',
      stroke: stroke?.color ?? attrs['stroke'] ?? 'white',
      strokeWidth: stroke?.width ?? (attrs['stroke-width'] ? parseFloat(attrs['stroke-width']) : 1),
      originX: 'center',
      originY: 'center',
      selectable: false,
    });

    // X Mark (2 intersecting lines)
    const lineParams: Partial<TOptions<FabricObjectProps>> = {
      stroke: stroke?.color ?? attrs['stroke'] ?? 'white',
      strokeWidth: stroke?.width ?? (attrs['stroke-width'] ? parseFloat(attrs['stroke-width']) : 1),
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    };
    const xLine1 = new Line([-r * 0.7, -r * 0.7, r * 0.7, r * 0.7], lineParams);
    const xLine2 = new Line([-r * 0.7, r * 0.7, r * 0.7, -r * 0.7], lineParams);

    // Label

    const label = new FabricText(id, {
      top: r + 10, // below circle
      originX: 'center',
      originY: 'top',
      fontSize: 24,
      fill: stroke?.color ?? attrs['stroke'] ?? 'white',
      selectable: false,
      evented: false,
    });

    // Group (keeps ID + motion bound together)
    const group = new Group([circle, xLine1, xLine2, label], {
      left: cx,
      top: cy + 20,
      originX: 'center',
      originY: 'center',
      subTargetCheck: true,

      // Selection allowed
      selectable: selectable ?? true,
      evented: true,

      // Prevent transformations
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,
      hoverCursor: 'pointer', // Show pointer cursor on hover
    });

    // Preserve SVG identifier for selection reference
    (group as any).id = id;

    canvas.add(group);
    this.mapWorker.buildingObjects.push(group);
  }

  //----------------------------------------

  drawBuilding(canvas: Canvas, node: INode) {
    node.children.forEach((childNode) => {
      switch (childNode.name) {
        case 'rect':
          const obj = this.drawRect(canvas, childNode, { width: 4 });
          this.mapWorker.buildingObjects.push(obj);
          break;
        // TODO: add more shapes later: circle, line, path...
      }
    });
  }

  drawSupports(canvas: Canvas, node: INode) {
    node.children.forEach((childNode) => {
      switch (childNode.name) {
        case 'rect':
          const obj = this.drawRect(canvas, childNode, undefined, 'white');
          this.mapWorker.buildingObjects.push(obj);
          break;
        // TODO: add more shapes later: circle, line, path...
      }
    });
  }

  drawTempChains(canvas: Canvas, node: INode, id: string) {
    node.children.forEach((childNode) => {
      this.drawTempChain(canvas, childNode, id, { color: 'red', width: 2 });
    });
  }

  drawEmptyTempChains(canvas: Canvas, node: INode, id: string) {
    node.children.forEach((childNode) => {
      this.drawTempChain(canvas, childNode, id, { color: 'grey', width: 2 }, undefined, false);
    });
  }

  drawAxes(canvas: Canvas, widthPx: number, heightPx: number, labels: { x: string; y: string }): FabricObject[] {
    const objects: FabricObject[] = [];

    const AXIS_COLOR = '#aaa';
    const AXIS_WIDTH = 8;
    const FONT_SIZE = 54;

    const STEP = 5 * PX_PER_M;

    const EXT = 50;
    const TICK_SIZE = AXIS_WIDTH * 4;

    const LABEL_OFFSET_X = 70;
    const LABEL_OFFSET_Y = 70;

    // -------------------
    // Axes (extended)
    // -------------------
    const xAxis = new Line([0, 0, widthPx + EXT, 0], {
      stroke: AXIS_COLOR,
      strokeWidth: AXIS_WIDTH,
      selectable: false,
      evented: false,
    });

    const yAxis = new Line([0, 0, 0, heightPx + EXT], {
      stroke: AXIS_COLOR,
      strokeWidth: AXIS_WIDTH,
      selectable: false,
      evented: false,
    });

    canvas.add(xAxis, yAxis);
    objects.push(xAxis, yAxis);

    // -------------------
    // Arrowheads (outside slice)
    // -------------------
    const arrowSize = 50;

    const xArrow = new Triangle({
      left: widthPx + EXT,
      top: 0,
      width: arrowSize,
      height: arrowSize,
      fill: AXIS_COLOR,
      angle: 90,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });

    const yArrow = new Triangle({
      left: 0,
      top: heightPx + EXT,
      width: arrowSize,
      height: arrowSize,
      fill: AXIS_COLOR,
      angle: 180,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });

    canvas.add(xArrow, yArrow);
    objects.push(xArrow, yArrow);

    // -------------------
    // Axis labels (X, Y, Z)
    // -------------------
    const xLabel = new FabricText(labels.x, {
      left: widthPx + EXT + 20,
      top: -LABEL_OFFSET_X,
      fontSize: FONT_SIZE,
      fill: AXIS_COLOR,
      selectable: false,
      evented: false,
    });

    const yLabel = new FabricText(labels.y, {
      left: -LABEL_OFFSET_Y,
      top: heightPx + EXT + 20,
      fontSize: FONT_SIZE,
      fill: AXIS_COLOR,
      selectable: false,
      evented: false,
    });

    canvas.add(xLabel, yLabel);
    objects.push(xLabel, yLabel);

    // -------------------
    // Origin label (single 0)
    // -------------------
    const originLabel = new FabricText('0', {
      left: -LABEL_OFFSET_Y,
      top: -LABEL_OFFSET_X,
      fontSize: FONT_SIZE,
      fill: AXIS_COLOR,
      selectable: false,
      evented: false,
    });

    canvas.add(originLabel);
    objects.push(originLabel);

    // -------------------
    // X ticks + labels (skip 0)
    // -------------------
    for (let x = STEP; x <= widthPx; x += STEP) {
      const tick = new Line([x, -TICK_SIZE / 2, x, TICK_SIZE / 2], {
        stroke: AXIS_COLOR,
        strokeWidth: (AXIS_WIDTH / 4) * 3,
        selectable: false,
        evented: false,
      });

      const label = new FabricText(String(x / PX_PER_M), {
        left: x,
        top: -LABEL_OFFSET_X,
        fontSize: FONT_SIZE,
        fill: AXIS_COLOR,
        originX: 'center',
        selectable: false,
        evented: false,
      });

      canvas.add(tick, label);
      objects.push(tick, label);
    }

    // -------------------
    // Y ticks + labels (skip 0)
    // -------------------
    for (let y = STEP; y <= heightPx; y += STEP) {
      const tick = new Line([-TICK_SIZE / 2, y, TICK_SIZE / 2, y], {
        stroke: AXIS_COLOR,
        strokeWidth: AXIS_WIDTH / 2,
        selectable: false,
        evented: false,
      });

      const label = new FabricText(String(y / PX_PER_M), {
        left: -LABEL_OFFSET_Y,
        top: y,
        fontSize: FONT_SIZE,
        fill: AXIS_COLOR,
        originY: 'center',
        selectable: false,
        evented: false,
      });

      canvas.add(tick, label);
      objects.push(tick, label);
    }

    // -------------------
    // Bring to front
    // -------------------
    objects.forEach((obj) => canvas.bringObjectToFront(obj));

    return objects;
  }

  buildImageData(slice: Float32Array, width: number, height: number, getColor: (t: number) => string): ImageData {
    const img = new ImageData(width, height);
    const data = img.data;

    for (let i = 0; i < slice.length; i++) {
      const temp = slice[i];

      const color = getColor(temp); // "rgb(r,g,b)"
      const [r, g, b] = color.match(/\d+/g)!.map(Number);

      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }

    return img;
  }

  printSliceMatrix(slice: Float32Array, width: number, height: number) {
    const rows: number[][] = [];

    for (let y = 0; y < height; y++) {
      const row: number[] = [];

      for (let x = 0; x < width; x++) {
        const val = slice[y * width + x];
        row.push(Number(val.toFixed(2)));
      }

      rows.push(row);
    }

    console.table(rows);
  }
}
