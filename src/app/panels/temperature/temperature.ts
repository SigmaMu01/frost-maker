import { Component, computed, effect, signal } from '@angular/core';
import { MapWorker } from '../../shared/services/map-worker';
import { DataConnector } from '../../shared/services/data-connector';
import { DataFrame } from '../../core/models/temp-json';

@Component({
  selector: 'app-temperature',
  imports: [],
  templateUrl: './temperature.html',
  styleUrl: './temperature.scss',
})
export class Temperature {
  selectedTempChainId = signal<string | null>(null);
  selectedTempChainFrame = signal<DataFrame>({});

  getTempChainFrame = computed(() => Object.entries(this.selectedTempChainFrame()));

  constructor(
    private mapWorker: MapWorker,
    private dataConnector: DataConnector
  ) {
    effect(() => {
      // Update if svg map is loaded
      this.selectedTempChainId.set(this.mapWorker.selectedTempChainId());

      // Then update is dataset is loaded
      if (this.selectedTempChainId()) {
        this.selectedTempChainFrame.set(this.dataConnector.getTempChainData(this.selectedTempChainId()!));
      }
    });
  }
}
