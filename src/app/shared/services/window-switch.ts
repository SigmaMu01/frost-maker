import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WindowSwitch {
  readonly showViewport = signal(false);
}
