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
  private _tempData: TempDataJSON = {} as TempDataJSON; // Current dataset

  readonly selectedFrame = signal<number>(0); // Current frame for timeline
  readonly timeFrame = signal<'all' | 'day' | 'week' | 'month'>('all');

  readonly isJSONLoaded = signal(false); // Signal to the timeline that it can draw frames

  readonly getAllData = computed(() => this._tempData);

  setTemperatureTemplate(template: MonitoringDataJSON) {
    this._tempData = cleanMonitoringData(template);
    if (isDevMode()) console.log('Cleaned JSON:', this._tempData);
  }

  clearTemperatureTemplate() {
    this._tempData = {} as TempDataJSON;
    this.isJSONLoaded.set(false);
  }

  setCurrentFrame(index: number) {
    // if (this._tempData.utcTimestamp.length)
    this.selectedFrame.set(index);
  }

  getTimeFrameDates() {
    return this._tempData.utcTimestamp;
  }

  checkTempChainData(tempChainId: string) {
    return this._tempData.temperatureValue[tempChainId] ? true : false; // True is there is data provided for temp chain id
  }

  getTempChainData(tempChainId: string) {
    // Returns a single temp chain data of a specified time frame
    const output: DataFrame = {};

    const data = this._tempData.temperatureValue[tempChainId];

    // If selected temp chain has no data
    // if (!data) {
    //   return null;
    // }

    // console.log(data);
    try {
      Object.keys(data).forEach((key) => {
        output[key] = data[key][this.selectedFrame()] ?? null;
      });
    } catch {
      if (data) {
        throw new Error(`Wrong data structure: ${data}`);
      }
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
