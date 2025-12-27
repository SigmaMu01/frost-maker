import { Component, effect, signal } from '@angular/core';
import { MapWorker } from '../../shared/services/map-worker';

@Component({
  selector: 'app-temperature',
  imports: [],
  templateUrl: './temperature.html',
  styleUrl: './temperature.scss',
})
export class Temperature {
  selectedTempChainId = signal<any>(null);

  constructor(private mapWorker: MapWorker) {
    effect(() => {
      // if (this.mapWorker.selectedTempChainId())
      this.selectedTempChainId.set(this.mapWorker.selectedTempChainIdLabel());
    });
  }
}
