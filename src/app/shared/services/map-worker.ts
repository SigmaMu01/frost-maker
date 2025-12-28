import { computed, Injectable, signal } from '@angular/core';
import { INode } from 'svgson';
import { isValidSVG } from '../../core/models/building';
import { Canvas, Group } from 'fabric';

@Injectable({
  providedIn: 'root',
})
export class MapWorker {
  private canvas!: Canvas; // Canvas pointer for working with objects

  private _svgData: INode | null = null; // Current building

  readonly selectedTempChainId = signal<string | null>(null); // Selected temperature chain
  readonly isSVGLoaded = signal(false); // Signal to the canvas that it can draw building from the file

  setSVGTemplate(template: INode) {
    if (isValidSVG(template)) {
      this._svgData = template;
    }
    this.isSVGLoaded.set(true);
  }

  registerCanvas(canvas: Canvas) {
    this.canvas = canvas;
  }

  // get SVGData() {
  //   return this._svgData;
  // }

  getSVGChildren(): INode[] {
    return this._svgData?.children ?? [];
  }

  setSelectedObjectId(id: string) {
    this.selectedTempChainId.set(id);
  }

  clearSelection() {
    this.selectedTempChainId.set(null);
  }
}
