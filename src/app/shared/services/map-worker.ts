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
  private readonly _selectedTempChainId = signal<string | null>(null); // Selected temperature chain

  isSVGLoaded = signal(false); // Signal to the canvas that it can draw building from the file

  selectedTempChainIdLabel = computed((id = this._selectedTempChainId()) => {
    return id ? id.substring(id.lastIndexOf('_') + 1) : null;
  });

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
    this._selectedTempChainId.set(id);
  }

  clearSelection() {
    this._selectedTempChainId.set(null);
  }
}
