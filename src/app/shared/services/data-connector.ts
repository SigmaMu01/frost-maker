import { Injectable, signal } from '@angular/core';
import { cleanMonitoringData, DataFrame, MonitoringDataJSON, TempDataJSON } from '../../core/models/temp-json';

@Injectable({
  providedIn: 'root',
})
export class DataConnector {
  private _tempData: TempDataJSON = {} as TempDataJSON; // Current dataset

  readonly selectedFrame = signal<number>(0); // Current frame for timeline
  readonly timeFrame = signal<'all' | 'day' | 'week' | 'month'>('all');

  readonly isJSONLoaded = signal(false); // Signal to the timeline that it can draw frames

  setTemperatureTemplate(template: MonitoringDataJSON) {
    this._tempData = cleanMonitoringData(template);
  }

  setCurrentFrame(index: number) {
    // if (this._tempData.utcTimestamp.length)
    this.selectedFrame.set(index);
  }

  getTimeFrameDates() {
    return this._tempData.utcTimestamp;
  }

  getTempChainData(tempChainId: string) {
    const output: DataFrame = {};

    const data = this._tempData.temperatureValue[tempChainId];
    Object.keys(data).forEach((key) => {
      output[Number(key)] = data[Number(key)][this.selectedFrame()] ?? null;
    });
    return output;
  }
}
