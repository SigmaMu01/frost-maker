import { computed, Injectable, isDevMode, signal } from '@angular/core';
import {
  cleanMonitoringData,
  type DataFrame,
  type MonitoringDataJSON,
  type TempDataJSON,
} from '../../core/models/temp-json';

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
    return this._tempData.temperatureValue[tempChainId] ? true : false;
  }

  getTempChainData(tempChainId: string) {
    const output: DataFrame = {};

    const data = this._tempData.temperatureValue[tempChainId];

    // If selected temp chain has no data
    // if (!data) {
    //   return null;
    // }

    console.log(data);
    Object.keys(data).forEach((key) => {
      output[key] = data[key][this.selectedFrame()] ?? null;
    });
    return output;
  }
}
