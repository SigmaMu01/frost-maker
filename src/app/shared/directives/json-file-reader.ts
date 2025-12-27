import { Directive } from '@angular/core';
import { isDevMode, output } from '@angular/core';

import { BasicFileReader } from '../models/file-reader';
import { INode } from 'svgson';

@Directive({
  selector: '[appJsonFileReader]',
  host: {
    accept: '.json',
    '(change)': 'onFileSelected($event)',
  },
})
export class JsonFileReader implements BasicFileReader {
  readonly data = output<INode>();

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const dataJSON = JSON.parse(e.target.result as string) as INode;

          this.data.emit(dataJSON);

          if (isDevMode()) console.log('Parsed JSON:', dataJSON);
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
      reader.readAsText(file, 'UTF-8');
    }
  }
}
