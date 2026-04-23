import { inject, Injectable, signal } from '@angular/core';
import { PileSelection } from '../../core/models/probe';
import { FabricObject } from 'fabric';
import { MapWorker } from './map-worker';

type Node = {
  id: string;
  x: number;
  y: number;
};

@Injectable({
  providedIn: 'root',
})
export class PileManager {
  private readonly mapWorker = inject(MapWorker);

  readonly selectedPiles = signal<PileSelection[]>([]);

  private colors = new Map<string, string>();

  togglePileSelection(obj: FabricObject) {
    const id = (obj as any).id;
    if (!id) return;

    const current = this.selectedPiles();

    const exists = current.find((p) => p.id === id);

    let updated: PileSelection[];

    if (exists) {
      // REMOVE
      updated = current.filter((p) => p.id !== id);
    } else {
      // ADD
      updated = [
        ...current,
        {
          id,
          order: current.length + 1,
          object: obj,
        },
      ];
    }

    // Reassign order (important!)
    updated = updated.map((p, i) => ({
      ...p,
      order: i + 1,
    }));

    this.selectedPiles.set(updated);

    // Recompute colors
    const nodes: Node[] = updated.map((p) => {
      const obj = p.object as any;
      return {
        id: p.id,
        x: obj.left,
        y: obj.top,
      };
    });

    // Choose threshold
    this.compute(nodes);

    this.updatePileStyles();
  }

  private updatePileStyles() {
    const selected = this.selectedPiles();
    const selectedMap = new Map(selected.map((p) => [p.id, p]));

    this.mapWorker.pileObjects.forEach((obj) => {
      const id = (obj as any).id;
      const sel = selectedMap.get(id);

      if (sel) {
        obj.set({
          fill: this.getColor(sel.id),
          stroke: '#000',
          strokeWidth: 2,
        });
        // obj.set('dirty', true);
      } else {
        obj.set({
          fill: 'white',
          stroke: '#000',
          strokeWidth: 1,
        });
      }
    });

    this.mapWorker.getCanvas().requestRenderAll();
  }

  getSelectedPileData() {
    return this.selectedPiles().map((p) => {
      const obj = p.object as any;

      return {
        id: p.id,
        order: p.order,
        x: obj.left,
        y: obj.top,
        w: obj.width * obj.scaleX,
        h: obj.height * obj.scaleY,
      };
    });
  }

  selectAllPiles() {
    const all = this.mapWorker.pileObjects;

    const updated: PileSelection[] = all.map((obj, i) => ({
      id: (obj as any).id,
      order: i + 1,
      object: obj,
    }));

    this.selectedPiles.set(updated);

    const nodes = updated.map((p) => {
      const obj = p.object as any;
      return {
        id: p.id,
        x: obj.left,
        y: obj.top,
      };
    });

    this.compute(nodes);
    this.updatePileStyles();
  }

  clearSelection() {
    this.selectedPiles.set([]);

    // reset visuals
    this.mapWorker.pileObjects.forEach((obj) => {
      obj.set({
        fill: 'white',
        stroke: '#000',
        strokeWidth: 1,
      });
    });

    this.mapWorker.getCanvas().requestRenderAll();
  }

  // ============================
  //          Color
  // ============================

  private bounds = {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    cx: 0,
    cy: 0,
  };

  private computeBounds(piles: Node[]) {
    const xs = piles.map((p) => p.x);
    const ys = piles.map((p) => p.y);

    this.bounds.minX = Math.min(...xs);
    this.bounds.maxX = Math.max(...xs);
    this.bounds.minY = Math.min(...ys);
    this.bounds.maxY = Math.max(...ys);

    this.bounds.cx = (this.bounds.minX + this.bounds.maxX) / 2;
    this.bounds.cy = (this.bounds.minY + this.bounds.maxY) / 2;
  }

  private getColorFromPosition(x: number, y: number): string {
    const { cx, cy } = this.bounds;

    const dx = x - cx;
    const dy = y - cy;

    const angle = Math.atan2(dy, dx); // [-π, π]

    // normalize → [0, 360]
    const hue = ((angle + Math.PI) / (2 * Math.PI)) * 360;

    // distance-based lightness (optional but recommended)
    const dist = Math.hypot(dx, dy);

    const maxDist = Math.hypot(this.bounds.maxX - cx, this.bounds.maxY - cy);

    const normDist = maxDist === 0 ? 0 : dist / maxDist;

    const lightness = 45 + normDist * 25; // 45 → 70

    return `hsl(${hue}, 70%, ${lightness}%)`;
  }

  getColor(id: string): string {
    return this.colors.get(id) ?? '#ccc';
  }

  compute(piles: Node[]) {
    if (!piles.length) return;

    this.computeBounds(piles);

    this.colors.clear();

    for (const pile of piles) {
      const color = this.getColorFromPosition(pile.x, pile.y);
      this.colors.set(pile.id, color);
    }
  }
}
