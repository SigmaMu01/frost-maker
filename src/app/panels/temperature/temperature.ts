import { Component, computed, effect, ElementRef, signal, viewChild } from '@angular/core';
import { MapWorker } from '../../shared/services/map-worker';
import { DataConnector } from '../../shared/services/data-connector';
import { DataFrame } from '../../core/models/temp-json';
import { TemperatureProbe } from './temperature-probe/temperature-probe';
import { TempProbe, TempProbeCont } from '../../core/models/probe';

function tempToColor(temp: number, minTemp?: number | null, maxTemp?: number | null) {
  const min = minTemp ?? 0;
  const max = maxTemp ?? 0;

  const ratio = (temp - min) / (max - min);
  const clampedRatio = Math.min(1, Math.max(0, ratio));

  const hue = 240 - clampedRatio * 240;

  return `hsl(${hue}, 90%, 50%)`;
}

@Component({
  selector: 'app-temperature',
  imports: [TemperatureProbe],
  templateUrl: './temperature.html',
  styleUrl: './temperature.scss',
})
export class Temperature {
  readonly selectedTempChainId = signal<string | null>(null);
  readonly selectedTempChainFrame = signal<DataFrame>({});

  readonly probes = signal<TempProbe[]>([]); // Convenient thermal chain structure for further vizualization
  readonly probeCont = signal<TempProbeCont>({} as TempProbeCont); // Bus payload to child info panel component
  readonly zeroProbes = signal<TempProbe[]>([]); // Zero temp thresholds
  readonly isProbeVisible = signal(false); // Is floating window with interpolated values visible

  thermalBraidRef = viewChild<ElementRef<HTMLElement>>('thermalBraid');

  getTempChainFrame = computed(() => Object.entries(this.selectedTempChainFrame())); // Entire time frame for a single temp chain
  tempBorder = computed(() => (this.selectedTempChainId() ? this.buildGradientFromChainFrame() : 'transparent'));

  constructor(
    private mapWorker: MapWorker,
    private dataConnector: DataConnector
  ) {
    effect(() => {
      // Update if svg map is loaded
      this.selectedTempChainId.set(this.mapWorker.selectedTempChainId());

      // Then update if dataset is loaded
      if (this.selectedTempChainId()) {
        this.selectedTempChainFrame.set(this.dataConnector.getTempChainData(this.selectedTempChainId()!));
      }
    });

    effect(() => {
      const id = this.mapWorker.selectedTempChainId();
      this.selectedTempChainId.set(id);

      if (!id) {
        this.selectedTempChainFrame.set({});
        this.probes.set([]);
        return;
      }

      const frame = this.dataConnector.getTempChainData(id);

      this.selectedTempChainFrame.set(frame);

      // Build probes immediately after frame update
      this.rebuildProbes();
    });

    // this.tempBorder.set(this.buildGradient(temperatureStops));
  }

  tempOffsetY(label: string | number): number {
    // 100% divided by max depth
    const maxDepth = 12;
    return (100 / maxDepth) * Number(label);
  }

  buildGradientFromChainFrame() {
    // const frame = this.getTempChainFrame();

    // // Flatten records into array
    // const points = frame
    //   .map((obj) => {
    //     const depth = Number(obj[0]);
    //     const temp = obj[1];

    //     return { depth, temp };
    //   })
    //   .filter((p) => p.temp !== null) as TempProbe[];

    // this.probes.set(points);

    const points = this.probes();
    const stops = points.map((p) => {
      const percent = this.tempOffsetY(p.depth);
      const color = tempToColor(p.temp, this.mapWorker.minTemp(), this.mapWorker.maxTemp());

      return `${color} ${percent.toFixed(2)}%`;
    });

    return `linear-gradient(to bottom, ${stops.join(', ')})`;
  }

  // --------------------
  // Probe control
  // --------------------
  private rebuildProbes() {
    const frame = this.getTempChainFrame();

    if (!frame?.length) {
      this.probes.set([]);
      return;
    }

    const points = frame
      .map(([depth, temp]) => ({
        depth: Number(depth),
        temp,
      }))
      .filter((p) => p.temp !== null)
      .sort((a, b) => a.depth - b.depth) as TempProbe[];

    this.probes.set(points);

    // Find zero temperature thresholds
    const zeroes = this.mapWorker.findZeroCrossings(points);
    this.zeroProbes.set(zeroes);
  }

  hideProbe() {
    this.isProbeVisible.set(false);
  }

  maxDepth = 12;
  onMouseMove(event: MouseEvent) {
    if (!this.mapWorker.selectedTempChainId()) return; // Skip if no active temp chain

    const el = this.thermalBraidRef()?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    const y = event.clientY - rect.top;

    // Clamp inside bar
    const clampedY = Math.max(0, Math.min(rect.height, y));
    const percent = clampedY / rect.height;

    // Depth calculation
    this.probeCont.update((probe) => ({ ...probe, depth: percent * this.maxDepth }));

    // Temperature interpolation
    this.probeCont.update((probe) => ({ ...probe, temp: this.mapWorker.interpolateTemp(this.probes(), probe.depth) }));

    // Tooltip positioning
    this.probeCont.update((probe) => ({ ...probe, y: clampedY }));
    this.isProbeVisible.set(true);
  }
}
