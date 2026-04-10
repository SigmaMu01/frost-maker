import { computed, Injectable, isDevMode, signal } from '@angular/core';
import {
  cleanMonitoringData,
  type DataFrame,
  type MonitoringDataJSON,
  type TempDataJSON,
} from '../../core/models/temp-json';
import { TempProbe } from '../../core/models/probe';

@Injectable({
  providedIn: 'root',
})
export class DataConnector {
  private _tempData = signal<TempDataJSON>({} as TempDataJSON); // Current dataset

  readonly selectedFrame = signal<number>(0); // Current frame for timeline
  readonly timeFrame = signal<'all' | 'day' | 'week' | 'month'>('all');
  readonly totalFrames = computed(() => this._tempData().utcTimestamp.length);

  readonly isJSONLoaded = signal(false); // Signal to the timeline that it can draw frames

  readonly getAllData = computed(() => this._tempData());

  setTemperatureTemplate(template: MonitoringDataJSON) {
    this._tempData.set(cleanMonitoringData(template));
    if (isDevMode()) console.log('Cleaned JSON:', this._tempData());
  }

  clearTemperatureTemplate() {
    this._tempData.set({} as TempDataJSON);
    this.isJSONLoaded.set(false);
  }

  setCurrentFrame(index: number) {
    // if (this._tempData.utcTimestamp.length)
    this.selectedFrame.set(index);
  }

  getTimeFrameDates() {
    return this._tempData().utcTimestamp;
  }

  checkTempChainData(tempChainId: string) {
    return this._tempData().temperatureValue[tempChainId] ? true : false; // True is there is data provided for temp chain id
  }

  getTimeFrameData() {
    const output: Record<string, DataFrame> = {};

    const data = this._tempData().temperatureValue;

    try {
      Object.keys(data).forEach((tempChainKey) => {
        Object.keys(data[tempChainKey]).forEach((depthKey) => {
          if (!output[tempChainKey]) {
            output[tempChainKey] = {};
          }
          output[tempChainKey][depthKey] = data[tempChainKey][depthKey][this.selectedFrame()] ?? null;
        });
      });
    } catch {
      throw new Error(`Wrong data structure: ${output}`);
    }

    return output;
  }

  getTempChainData(tempChainId: string) {
    // Returns a single temp chain data of a specified time frame
    const output: DataFrame = {};

    const data = this._tempData().temperatureValue[tempChainId];

    try {
      Object.keys(data).forEach((key) => {
        output[key] = data[key][this.selectedFrame()] ?? null;
      });
    } catch {
      console.warn(`Data mismatch or missing for temp chain `, tempChainId);
      return output;
    }
    return output;
  }

  getTempChainDataAsTempProbes(tempChainId: string): TempProbe[] {
    const frame = Object.entries(this.getTempChainData(tempChainId));

    const points = frame
      .map(([depth, temp]) => ({
        depth: Number(depth),
        temp,
      }))
      .filter((p) => p.temp !== null)
      .sort((a, b) => a.depth - b.depth) as TempProbe[];

    return points;
  }
}
