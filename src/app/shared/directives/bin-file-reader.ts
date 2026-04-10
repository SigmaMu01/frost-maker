import { Directive, inject } from '@angular/core';
import { BasicFileReader } from '../models/file-reader';
import { binary3DCloudData } from '../../core/models/temp-cloud';
import { TempCloudWorker } from '../services/temp-cloud-worker';

@Directive({
  selector: '[appBinFileReader]',
  host: {
    accept: '.bin',
    '(change)': 'onFileSelected($event)',
  },
})
export class BinFileReader implements BasicFileReader {
  private readonly tempCloudWorker = inject(TempCloudWorker);

  constructor() {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.tempCloudWorker.isBinLoaded.set(false);

        try {
          const dataBuffer = e.target.result;
          const dataBin = new Float32Array(dataBuffer) as binary3DCloudData;

          this.tempCloudWorker.loadData(dataBin);
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
      reader.readAsArrayBuffer(file);
    }
  }
}
