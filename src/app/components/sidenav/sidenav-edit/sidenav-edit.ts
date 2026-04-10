import { Component, effect, ElementRef, inject, input, model, OnInit, viewChild } from '@angular/core';

import { JsonFileReader } from '../../../shared/directives/json-file-reader';
import { SvgFileReader } from '../../../shared/directives/svg-file-reader';
import { mapSVG } from '../../../core/models/building';
import { MapWorker } from '../../../shared/services/map-worker';
import { DataConnector } from '../../../shared/services/data-connector';
import { FormsModule } from '@angular/forms';
import { TemperatureControl } from '../../../shared/services/temperature-control';
import { BinFileReader } from '../../../shared/directives/bin-file-reader';
import { TempCloudWorker } from '../../../shared/services/temp-cloud-worker';

@Component({
  selector: 'app-sidenav-edit',
  imports: [FormsModule, JsonFileReader, SvgFileReader, BinFileReader],
  templateUrl: './sidenav-edit.html',
  styleUrl: './sidenav-edit.scss',
})
export class SidenavEdit {
  private readonly temperatureControl = inject(TemperatureControl);
  private readonly mapWorker = inject(MapWorker);
  private readonly tempCloudWorker = inject(TempCloudWorker);
  private readonly dataConnector = inject(DataConnector);

  readonly isSubmenuOpen = input(false);
  readonly inputJson = viewChild<ElementRef>('json');
  readonly inputSvg = viewChild<ElementRef>('svg');
  readonly inputBin = viewChild<ElementRef>('bin');

  minTemp = model<number>(-4);
  maxTemp = model<number>(1);

  constructor() {
    // UI -> Service
    effect(() => {
      this.temperatureControl.minTemp.set(this.minTemp());
      this.temperatureControl.maxTemp.set(this.maxTemp());
    });
    // Service -> UI
    effect(() => {
      const min = this.temperatureControl.minTemp();
      const max = this.temperatureControl.maxTemp();

      if (this.minTemp() !== min) {
        this.minTemp.set(min);
      }
      if (this.maxTemp() !== max) {
        this.maxTemp.set(max);
      }
    });
  }

  clearCanvas() {
    this.mapWorker.clearCanvas();

    const jsonInput = this.inputJson()?.nativeElement as HTMLInputElement;
    const svgInput = this.inputSvg()?.nativeElement as HTMLInputElement;
    const binInput = this.inputBin()?.nativeElement as HTMLInputElement;
    this.dataConnector.clearTemperatureTemplate();

    if (jsonInput) {
      jsonInput.value = '';
      this.dataConnector.clearTemperatureTemplate();
    }

    if (svgInput) {
      svgInput.value = '';
      this.mapWorker.unloadTemplate();
    }

    if (binInput) {
      binInput.value = '';
      this.tempCloudWorker.clearMetadata();
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

  setGlobalTempBounds() {
    const data = this.dataConnector.getAllData().temperatureValue;
    this.temperatureControl.setTempBounds(data, 3);
  }

  setSliceTempBounds() {
    // this.temperatureControl.setTempBounds(this.dataConnector.getTimeFrameData(), 1);
  }

  setTimeFrameTempBounds() {
    const data = this.dataConnector.getTimeFrameData();
    this.temperatureControl.setTempBounds(data, 1);
  }

  setTempChainTempBounds() {
    const id = this.mapWorker.selectedTempChainId();

    if (id) {
      const data = this.dataConnector.getTempChainData(id);

      this.temperatureControl.setTempBounds(data, 0);
    }
  }
}
