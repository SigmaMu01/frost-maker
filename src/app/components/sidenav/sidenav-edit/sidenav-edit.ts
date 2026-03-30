import { Component, effect, ElementRef, input, model, OnInit, viewChild } from '@angular/core';

import { JsonFileReader } from '../../../shared/directives/json-file-reader';
import { SvgFileReader } from '../../../shared/directives/svg-file-reader';
import { mapSVG } from '../../../core/models/building';
import { MapWorker } from '../../../shared/services/map-worker';
import { DataConnector } from '../../../shared/services/data-connector';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidenav-edit',
  imports: [FormsModule, JsonFileReader, SvgFileReader],
  templateUrl: './sidenav-edit.html',
  styleUrl: './sidenav-edit.scss',
})
export class SidenavEdit {
  readonly isSubmenuOpen = input(false);
  readonly inputJson = viewChild<ElementRef>('json');
  readonly inputSvg = viewChild<ElementRef>('svg');

  minTemp = model<number>(-4);
  maxTemp = model<number>(0.5);

  constructor(
    private mapWorker: MapWorker,
    private dataConnector: DataConnector
  ) {
    // Service → UI
    // effect(() => {
    //   this.minTemp.set(this.mapWorker.minTemp());
    //   this.maxTemp.set(this.mapWorker.maxTemp());
    //   console.log('New min/max values: ', this.minTemp(), this.maxTemp());
    // });

    // UI → Service
    effect(() => {
      const min = this.minTemp();
      const max = this.maxTemp();

      this.mapWorker.minTemp.set(min);
      this.mapWorker.maxTemp.set(max);
      console.log('New min/max values: ', this.mapWorker.minTemp(), this.mapWorker.maxTemp());
    });
  }

  clearCanvas() {
    this.mapWorker.clearCanvas();

    const jsonInput = this.inputJson()?.nativeElement as HTMLInputElement;
    const svgInput = this.inputSvg()?.nativeElement as HTMLInputElement;
    this.dataConnector.clearTemperatureTemplate();

    if (jsonInput) {
      jsonInput.value = '';
      this.dataConnector.clearTemperatureTemplate();
    }

    if (svgInput) {
      svgInput.value = '';
      this.mapWorker.isSVGLoaded.set(false);
    }
  }

  saveJSON() {
    const jsonString = JSON.stringify(this.dataConnector.getAllData());
    if (jsonString === '{}') return;

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fileName = 'user_data.json';

    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName; // Set the file name for download
    a.click(); // Programmatically click the anchor to start the download

    // Clean up the object URL after the download is triggered
    URL.revokeObjectURL(url);
  }
}
