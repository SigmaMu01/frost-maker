import { computed, inject, Injectable, signal } from '@angular/core';
import { TempProbeFabric } from '../../core/models/probe';
import { MapWorker } from '../../shared/services/map-worker';
import { TempCloudWorker } from '../../shared/services/temp-cloud-worker';
import { PX_PER_M, TEMP_CHAIN_HEIGHT_M } from '../../shared/services/building-manager';

@Injectable({
  providedIn: 'root',
})
export class TempProber {
  private readonly mapWorker = inject(MapWorker);
  private readonly tempCloudWorker = inject(TempCloudWorker);

  readonly isProbeVisible = signal(false);
  readonly isProbeEnabled = signal(true);
  readonly probe = signal<TempProbeFabric>({} as TempProbeFabric);

  distanceX = computed(() => {
    const res = ((this.mapWorker.getBounds().x / (this.tempCloudWorker.nx()! - 1)) * this.probe().coords.x) / PX_PER_M;
    return Math.round(res * 100) / 100;
  });
  distanceY = computed(() => {
    const res = ((this.mapWorker.getBounds().y / (this.tempCloudWorker.ny()! - 1)) * this.probe().coords.y) / PX_PER_M;
    return Math.round(res * 100) / 100;
  });
  distanceZ = computed(() => {
    const res = TEMP_CHAIN_HEIGHT_M - (TEMP_CHAIN_HEIGHT_M / (this.tempCloudWorker.nz()! - 1)) * this.probe().coords.z;
    return Math.round(res * 100) / 100;
  });
}
