import { Directive, isDevMode, output } from '@angular/core';

import { INode, parse } from 'svgson';

import { BasicFileReader } from '../models/file-reader';
import { MapWorker } from '../services/map-worker';

@Directive({
  selector: '[appSvgFileReader]',
  host: {
    accept: '.svg',
    '(change)': 'onFileSelected($event)',
  },
})
export class SvgFileReader implements BasicFileReader {
  // readonly data = output<INode>();

  constructor(private mapWorker: MapWorker) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const svgFile = e.target.result as string;

        parse(svgFile)
          .then((data) => {
            // this.data.emit(data);
            this.mapWorker.setSVGTemplate(data); // Set current svg file as a building map

            if (isDevMode()) console.log('Parsed SVG:', data);
          })
          .catch((error) => {
            console.error('Error parsing SVG:', error);
          });
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
      reader.readAsText(file, 'UTF-8');
    }
  }
}
