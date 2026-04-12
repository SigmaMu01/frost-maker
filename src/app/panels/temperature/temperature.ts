import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MapWorker } from '../../shared/services/map-worker';
import { DataConnector } from '../../shared/services/data-connector';
import { DataFrame } from '../../core/models/temp-json';
import { TemperatureProbe } from './temperature-probe/temperature-probe';
import { TempProbe, TempProbeCont } from '../../core/models/probe';
import { TemperatureControl } from '../../shared/services/temperature-control';

@Component({
  selector: 'app-temperature',
  imports: [TemperatureProbe],
  templateUrl: './temperature.html',
  styleUrl: './temperature.scss',
})
export class Temperature {
  private mapWorker = inject(MapWorker);
  private dataConnector = inject(DataConnector);
  private temperatureControl = inject(TemperatureControl);

  readonly selectedTempChainId = signal<string | null>(null);
  readonly selectedTempChainFrame = signal<DataFrame>({});

  readonly probes = signal<TempProbe[]>([]); // Convenient thermal chain structure for further vizualization
  readonly probeCont = signal<TempProbeCont>({} as TempProbeCont); // Bus payload to child info panel component
  readonly zeroProbes = signal<TempProbe[]>([]); // Zero temp thresholds
  readonly isProbeVisible = signal(false); // Is floating window with interpolated values visible

  thermalBraidRef = viewChild<ElementRef<HTMLElement>>('thermalBraid');

  getTempChainFrame = computed(() => Object.entries(this.selectedTempChainFrame())); // Entire time frame for a single temp chain
  tempBorder = computed(() => (this.selectedTempChainId() ? this.buildGradientFromChainFrame() : 'transparent'));

  constructor() {
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
    const resolution = 100; // ← key parameter (50–200 is good)
    const min = this.temperatureControl.minTemp();
    const max = this.temperatureControl.maxTemp();

    const stops: string[] = [];

    for (let i = 0; i <= resolution; i++) {
      const percent = (i / resolution) * 100;
      const depth = (i / resolution) * this.maxDepth;

      const temp = this.temperatureControl.interpolateTemp(this.probes(), depth);

      const color = temp ? this.temperatureControl.getECMWFColor(temp, min, max) : 'transparent';

      // hard stop (quantized band)
      stops.push(`${color} ${percent.toFixed(2)}%`);
      stops.push(`${color} ${percent.toFixed(2)}%`);
    }

    return `linear-gradient(to bottom, ${stops.join(', ')})`;
  }

  // --------------------
  // Probe control
  // --------------------
  private rebuildProbes() {
    const points = this.dataConnector.getTempChainDataAsTempProbes(this.selectedTempChainId()!);

    if (!points) {
      this.probes.set([]);
      return;
    }

    this.probes.set(points);
    // console.log('Probes:');
    // console.dir(this.probes());

    // Find zero temperature thresholds
    const zeroes = this.temperatureControl.findZeroCrossings(points);
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
    this.probeCont.update((probe) => ({
      ...probe,
      temp: this.temperatureControl.interpolateTemp(this.probes(), probe.depth)!, // To-Do: Make sure that it's always a non-null value
    }));

    // Tooltip positioning
    this.probeCont.update((probe) => ({ ...probe, y: clampedY }));
    this.isProbeVisible.set(true);
  }
}
