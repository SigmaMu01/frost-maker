import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { DataConnector } from '../../shared/services/data-connector';
import { TemperatureControl } from '../../shared/services/temperature-control';

@Component({
  selector: 'app-overlay',
  imports: [DatePipe],
  templateUrl: './overlay.html',
  styleUrl: './overlay.scss',
})
export class Overlay {
  private readonly dataConnector = inject(DataConnector);
  private readonly temperatureControl = inject(TemperatureControl);

  readonly timeFrameAvailable = computed(() => this.dataConnector.isJSONLoaded());
  readonly selectedTimeFrameLabel = computed(
    () => this.dataConnector.getTimeFrameDates()[this.dataConnector.selectedFrame()]
  );

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
