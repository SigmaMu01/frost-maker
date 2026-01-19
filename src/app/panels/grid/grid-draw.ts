import { INode } from 'svgson';
import { Canvas, Circle, Rect, FabricText, Group, Line, TOptions, FabricObjectProps } from 'fabric';

function drawRect(canvas: Canvas, node: INode, stroke?: { width?: number; color?: string }, fillColor?: string) {
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
}

// function drawCircle(canvas: Canvas, node: INode, stroke?: { width?: number; color?: string }, fillColor?: string) {
//   const attrs = node.attributes || {};

//   const cx = parseFloat(attrs['cx'] ?? '0');
//   const cy = parseFloat(attrs['cy'] ?? '0');
//   const r = parseFloat(attrs['r'] ?? '0');

//   const circle = new Circle({
//     left: cx - r,
//     top: cy - r,
//     radius: r,
//     fill: fillColor ?? attrs['fill'] ?? 'transparent',
//     stroke: stroke?.color ?? attrs['stroke'] ?? 'white',
//     strokeWidth: stroke?.width ?? (attrs['stroke-width'] ? parseFloat(attrs['stroke-width']) : 1),
//     originX: 'left',
//     originY: 'top',
//   });

//   // Preserve the SVG id on the Fabric object
//   if (attrs['id']) {
//     (circle as any).id = attrs['id'];
//   }

//   canvas.add(circle);
// }

function drawTempChain(
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
  // const idLabel = id.substring(id.lastIndexOf('_') + 1);

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
}

//----------------------------------------

export function drawBuilding(canvas: Canvas, node: INode) {
  node.children.forEach((childNode) => {
    switch (childNode.name) {
      case 'rect':
        drawRect(canvas, childNode, { width: 4 });
        break;
      // TODO: add more shapes later: circle, line, path...
    }
  });
}

export function drawSupports(canvas: Canvas, node: INode) {
  node.children.forEach((childNode) => {
    switch (childNode.name) {
      case 'rect':
        drawRect(canvas, childNode, undefined, 'white');
        break;
      // TODO: add more shapes later: circle, line, path...
    }
  });
}

export function drawTempChains(canvas: Canvas, node: INode, id: string) {
  node.children.forEach((childNode) => {
    drawTempChain(canvas, childNode, id, { color: 'red', width: 2 });
  });
}

export function drawEmptyTempChains(canvas: Canvas, node: INode, id: string) {
  node.children.forEach((childNode) => {
    drawTempChain(canvas, childNode, id, { color: 'grey', width: 2 }, undefined, false);
  });
}
