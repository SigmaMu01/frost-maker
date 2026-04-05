import { Directive, inject } from '@angular/core';
import { isDevMode, output } from '@angular/core';

import { BasicFileReader } from '../models/file-reader';
import { DataConnector } from '../services/data-connector';
import { MonitoringDataJSON } from '../../core/models/temp-json';
import { TemperatureControl } from '../services/temperature-control';

@Directive({
  selector: '[appJsonFileReader]',
  host: {
    accept: '.json',
    '(change)': 'onFileSelected($event)',
  },
})
export class JsonFileReader implements BasicFileReader {
  private readonly dataConnector = inject(DataConnector);
  private readonly temperatureControl = inject(TemperatureControl);
  // readonly data = output<INode>();

  constructor() {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.dataConnector.isJSONLoaded.set(false);
        try {
          const dataJSON = JSON.parse(e.target.result as string) as MonitoringDataJSON;

          this.dataConnector.setTemperatureTemplate(dataJSON);

          // this.temperatureControl.setTempBounds(this.dataConnector.getAllData().temperatureValue, 3); // Set temp min and max after data load
          this.temperatureControl.setTempBounds(this.dataConnector.getTimeFrameData(), 1);
          // if (isDevMode()) console.log('Parsed JSON:', dataJSON);
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }

        this.dataConnector.isJSONLoaded.set(true);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
      reader.readAsText(file, 'UTF-8');
    }
  }
}
