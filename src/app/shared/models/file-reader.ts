import { OutputEmitterRef } from '@angular/core';
import { INode } from 'svgson';

export interface BasicFileReader {
  // data: OutputEmitterRef<INode>;
  onFileSelected(event: Event): void;
}
