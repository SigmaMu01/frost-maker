import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { DataConnector } from '../../shared/services/data-connector';
import { TemperatureControl } from '../../shared/services/temperature-control';
import { TempCloudWorker } from '../../shared/services/temp-cloud-worker';
import { PX_PER_M, TEMP_CHAIN_HEIGHT_M } from '../../shared/services/building-manager';
import { WindowSwitch } from '../../shared/services/window-switch';
import { MapWorker } from '../../shared/services/map-worker';
import { TempProbe } from '../temp-probe/temp-probe';

@Component({
  selector: 'app-overlay',
  imports: [DatePipe, TempProbe],
  templateUrl: './overlay.html',
  styleUrl: './overlay.scss',
})
export class Overlay {
  private readonly dataConnector = inject(DataConnector);
  private readonly temperatureControl = inject(TemperatureControl);
  private readonly tempCloudWorker = inject(TempCloudWorker);
  private readonly windowSwitch = inject(WindowSwitch);
  private readonly mapWorker = inject(MapWorker);

  readonly selectedWindow = computed(() => this.windowSwitch.currentWindow());
  readonly timeFrameAvailable = computed(() => this.dataConnector.isJSONLoaded());
  readonly selectedTimeFrameLabel = computed(
    () => this.dataConnector.getTimeFrameDates()[this.dataConnector.selectedFrame()]
  );
  readonly tempCloudSlicingEnabled = computed(() => this.tempCloudWorker.isBinLoaded());

  ticks = computed(() => {
    const min = this.temperatureControl.minTemp();
    const max = this.temperatureControl.maxTemp();

    const steps = 6; // adjust density
    const range = max - min;

    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return {
        value: (min + t * range).toFixed(1),
        percent: t * 100,
      };
    });
  });

  sliceMode = computed(() => this.tempCloudWorker.sliceMode().toUpperCase());

  sliceDistance = computed(() => {
    if (!this.timeFrameAvailable()) return;

    let res = 0;

    switch (this.tempCloudWorker.sliceMode()) {
      case 'xy':
        res = (TEMP_CHAIN_HEIGHT_M / (this.tempCloudWorker.nz()! - 1)) * this.tempCloudWorker.sliceIndex();
        break;
      case 'xz':
        res =
          ((this.mapWorker.getBounds().y / (this.tempCloudWorker.ny()! - 1)) * this.tempCloudWorker.sliceIndex()) /
          PX_PER_M;
        break;
      case 'yz':
        res =
          ((this.mapWorker.getBounds().x / (this.tempCloudWorker.nx()! - 1)) * this.tempCloudWorker.sliceIndex()) /
          PX_PER_M;
        break;
    }

    return Math.round(res * 100) / 100;
  });

  tempBorder(): string {
    const min = this.temperatureControl.minTemp();
    const max = this.temperatureControl.maxTemp();

    const steps = 20;

    const stops = Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      const temp = min + t * (max - min);
      const color = this.temperatureControl.getECMWFColor(temp, min, max);
      return `${color} ${t * 100}%`;
    });

    return `linear-gradient(to right, ${stops.join(',')})`;
  }
}
